from fastapi import  HTTPException
import os
from dependencies.verify_token import verify_firebase_token
from core.config import Config
from google import genai
from google.genai.types import GenerateContentConfig, Part
from models.template import CSRTemplate
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


