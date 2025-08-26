from fastapi import  HTTPException
import os
from dependencies.verify_token import verify_firebase_token
from core.config import Config
from google import genai
from google.genai.types import GenerateContentConfig, Part
from models.template import CSRTemplate
from pydantic import BaseModel
from typing import List, Optional
config = Config()
client = genai.Client(api_key=config.GEMINI_API_KEY)

ALLOWED_MIME = {"application/pdf"}
MAX_FILE_MB = 20


class GeminiService:
    """Extract meta keys + major sections directly from a PDF by sending raw bytes (no Files API)."""

    @staticmethod
    async def extract_template_structure_from_pdf(file_bytes: bytes, filename: str, mime_type: str) -> CSRTemplate:
        # Validate mime and extension
        mime = (mime_type or "").lower()
        ext = (os.path.splitext(filename)[1] or "").lower()
        if mime not in ALLOWED_MIME or ext != ".pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

        if (len(file_bytes) / (1024 * 1024)) > MAX_FILE_MB:
            raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_FILE_MB} MB.")

      
        file_part = Part.from_bytes(data=file_bytes, mime_type=mime or "application/pdf")

        system_prompt = """
                    You are an expert in Clinical Study Reports (CSR) following ICH E3 guidelines.

                    Task:
                    1. Extract **meta-data keys** from the **Title Page** (e.g., Study ID, Protocol Number, Sponsor, Study Title, Date, Study Phase).
                    2. Identify **major section headers and subsections** from the CSR template PDF.
                    3. Respond strictly in **valid JSON** following this schema:

                    {
                    "meta_keys": [
                        "Study ID",
                        "Protocol Number",
                        "Sponsor",
                        "Study Title",
                        "Date",
                        "Study Phase"
                    ],
                    "sections": [
                        {
                        "id": "1",
                        "title": "Synopsis",
                        "subsections": [
                            {"id": "1.1", "title": "Study Objectives"},
                            {"id": "1.2", "title": "Efficacy Results"},
                            {"id": "1.3", "title": "Safety Results"}
                        ]
                        },
                        {
                        "id": "2",
                        "title": "Introduction",
                        "subsections": []
                        },
                        {
                        "id": "3",
                        "title": "Methodology",
                        "subsections": [
                            {"id": "3.1", "title": "Study Design"},
                            {"id": "3.2", "title": "Patient Population"},
                            {"id": "3.3", "title": "Statistical Methods"}
                        ]
                        }
                    ]
                    }

                    Rules:
                    - Only include **recognized CSR meta-data keys** (usually from the Title Page).
                    - Use **clear hierarchy**: sections → subsections.
                    - If a section has no subsections, set "subsections": [].
                    - Do not invent content; only extract what exists in the provided PDF.
                    """


        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=[file_part, system_prompt],
            config=GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CSRTemplate,
                temperature=0.2,
            ),
        )

        return response.parsed


    @staticmethod
    async def extract_section_content_from_pdf(
        *,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
        document_sections: list,
    ) -> dict:
        """
        Use Gemini to semantically extract content for the provided template sections/subsections
        directly from the uploaded PDF bytes. Returns a JSON-safe dictionary with suggestions.
        """

        mime = (mime_type or "").lower()
        ext = (os.path.splitext(filename)[1] or "").lower()
        if mime not in ALLOWED_MIME or ext != ".pdf":
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

        if (len(file_bytes) / (1024 * 1024)) > MAX_FILE_MB:
            raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_FILE_MB} MB.")

        file_part = Part.from_bytes(data=file_bytes, mime_type=mime or "application/pdf")

        # Provide the current document structure so Gemini can align extracted content by IDs/titles
        target_document_json = {
            "sections": document_sections or []
        }

        # Pydantic response schema for structured suggestions
        class SuggestionSource(BaseModel):
            pages: List[int] = []

        class SectionSuggestion(BaseModel):
            section_id: str
            subsection_id: Optional[str] = None
            subsubsection_id: Optional[str] = None
            title: Optional[str] = None
            content: str = ""
            confidence: Optional[float] = None
            source: Optional[SuggestionSource] = None
            note: Optional[str] = None

        class ExtractionResponse(BaseModel):
            suggestions: List[SectionSuggestion] = []

        system_prompt = """
            You are an expert in ICH E3 Clinical Study Reports.
            Given a PDF and the current CSR document structure (sections/subsections with IDs and titles),
            extract the most relevant text spans from the PDF and map them to the corresponding
            sections/subsections. The PDF may not contain explicit headings.

            Return STRICTLY valid JSON with this schema:
            {
              "suggestions": [
                {
                  "section_id": "string",              // from provided document structure
                  "subsection_id": "string|null",      // from provided document structure or null
                  "subsubsection_id": "string|null",   // from provided document structure or null
                  "title": "string",                   // human-readable
                  "content": "string",                 // extracted content; plain text preferred
                  "confidence": 0.0,                    // 0..1
                  "source": { "pages": [1, 2] },
                  "note": "string|null"                // optional explanation
                }
              ]
            }

            Rules:
            - Only use section/subsection/subsubsection IDs that exist in the provided document structure.
            - If no good match exists, include an item with empty content and low confidence and a note.
            - Keep content concise but faithful; do not invent.
            - Prefer plain text; you may include light markdown for lists if useful.
            - Support three levels: section → subsection → subsubsection (e.g., 12 → 12.1 → 12.1.1)
        """

        # Call Gemini with async if available; otherwise fall back to sync
        try:
            response = await client.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents=[file_part, "Document:", str(target_document_json), system_prompt],
                config=GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractionResponse,
                    temperature=0.2,
                ),
            )
        except Exception as async_err:
            try:
                sync_response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[file_part, "Document:", str(target_document_json), system_prompt],
                    config=GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=ExtractionResponse,
                        temperature=0.2,
                    ),
                )
                response = sync_response
            except Exception as sync_err:
                raise HTTPException(status_code=500, detail=f"Gemini call failed: {str(sync_err) or str(async_err)}")
        # With response_schema, parsed is a pydantic model
        if not hasattr(response, "parsed") or response.parsed is None:
            raise HTTPException(status_code=500, detail="Empty AI extraction response")
        parsed: ExtractionResponse = response.parsed
        return parsed.model_dump()

