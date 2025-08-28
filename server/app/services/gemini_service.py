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
        print("filename",filename)
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
        target_document_json = {
            "sections": document_sections or []
        }
        

        # Pydantic response schema for structured suggestions
        class SuggestionSource(BaseModel):
            pages: List[int] = []

        class SectionSuggestion(BaseModel):
            section_id: str  # Most specific level where content belongs (e.g., "12.1.1" for subsubsection)
            title: Optional[str] = None
            content: str = ""
            source: Optional[SuggestionSource] = None

        class ExtractionResponse(BaseModel):
            suggestions: List[SectionSuggestion] = []

        system_prompt = """
           You are an expert in ICH E3 Clinical Study Reports.

            Your task is to review raw text extracted from clinical study documents (PDFs) that **do not include section headings**, and assign the CSR document structure content to the appropriate section/subsection/subsubsection of a CSR based on meaning.

            You are given:
            1. A structured list of sections, subsections, and subsubsections — each with:
            - a unique ID
            - a title
            2. PDF content (unstructured clinical text)

            Your task:
            - Read and understand the content of the PDF.
            - Match each meaningful block of text to the correct section/subsection/subsubsection based on its **semantic meaning**.
            - For each matched block, return a `suggestion` with:
            - `section_id`, `subsection_id`, `subsubsection_id` (use correct IDs from structure)
            - the corresponding `title` (based on the matched ID)
            - the `content` (as found in the PDF)
            - the `source` (page numbers)
            - an optional `note` explaining the match

            **ID Format Examples:**
            - Section level: "9" (for section 9)
            - Subsection level: "9.1" (for subsection 9.1)
            - Subsubsection level: "9.1.1" (for subsubsection 9.1.1)

            **Important Rules:**
            - Use ONLY the ID of the MOST SPECIFIC level where content fits
            - If content fits a subsubsection, use "9.1.1" NOT "9" or "9.1"
            - If content fits a subsection, use "9.1" NOT "9"
            - Only use IDs that exist in the provided document structure
            - Keep content concise but faithful; do not invent
            - Prefer plain text; you may include light markdown for lists if useful

            Return JSON in this format:
            ```json
            {
              "suggestions": [
                {
                  "section_id": "9.1.1",
                  "title": "Study Design - Patient Population",
                  "content": "Patients were randomly assigned to two groups...",
                  "source": { "pages": [3] }
                }
              ]
            }
            ```
        """

        # Call Gemini with async if available; otherwise fall back to sync
        
        response = await client.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents=[file_part, "Document:", str(target_document_json), system_prompt],
                config=GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractionResponse,
                    temperature=0.2,
                ),
            )
        print(response.parsed ) 
        # except Exception as async_err:
        #     try:
        #         sync_response = client.models.generate_content(
        #             model="gemini-2.0-flash",
        #             contents=[file_part, "Document:", str(target_document_json), system_prompt],
        #             config=GenerateContentConfig(
        #                 response_mime_type="application/json",
        #                 response_schema=ExtractionResponse,
        #                 temperature=0.2,
        #             ),
        #         )
        #         response = sync_response
        #     except Exception as sync_err:
        #         raise HTTPException(status_code=500, detail=f"Gemini call failed: {str(sync_err) or str(async_err)}")
        # # With response_schema, parsed is a pydantic model
        # if not hasattr(response, "parsed") or response.parsed is None:
        #     raise HTTPException(status_code=500, detail="Empty AI extraction response")
        # parsed: ExtractionResponse = response.parsed
        # p=parsed.model_dump()
        # print(p)

