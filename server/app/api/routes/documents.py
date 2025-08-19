from fastapi import APIRouter, Depends
from services.csr_documentservice import DocumentService
from dependencies.verify_token import verify_firebase_token
router = APIRouter()

@router.post("/create-document")
async def create_document(
    request: dict = Depends(verify_firebase_token),
    metadata: dict = {}
):
    uid = request["uid"]
    doc = DocumentService.create_document(uid, metadata)
    return {"message": "Document created successfully", "document": doc}
