from fastapi import APIRouter, UploadFile, File, Form, Request, HTTPException,Depends

from dependencies.verify_token import verify_firebase_token

from services.template_service import TemplateService
from services.gemini_service import GeminiService

router = APIRouter( )

@router.post("/upload")
async def upload_csr_template(
    request: dict = Depends(verify_firebase_token),
    file: UploadFile = File(...),
):
    user_id = request["uid"]
    MAX_FILE_MB = 20
    ALLOWED_CONTENT_TYPE = "application/pdf"

    try:
        # quick route-level validation
        if (file.content_type or "").lower() != ALLOWED_CONTENT_TYPE:
            raise HTTPException(status_code=415, detail="Only PDF uploads are supported.")

        file_bytes = await file.read()

        file_size_mb = len(file_bytes) / (1024 * 1024)
        if file_size_mb > MAX_FILE_MB:
            raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_FILE_MB} MB.")

        structured = await GeminiService.extract_template_structure_from_pdf(
            file_bytes=file_bytes,
            filename=file.filename,
            mime_type=file.content_type or ALLOWED_CONTENT_TYPE,
        )

        try:
            template_data = structured.model_dump()   
        except Exception:
            template_data = structured.dict()       

        template = TemplateService.save_template(
            uid=user_id,
            title=file.filename,
            template_data=template_data,
        )

        return {"message": "CSR template uploaded successfully", "data": template}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
