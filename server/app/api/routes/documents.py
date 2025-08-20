from fastapi import APIRouter, Depends,HTTPException
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


@router.get("/documents")
def get_documents(request: dict = Depends(verify_firebase_token)):
    """
    Fetch all CSR documents created by the authenticated user.
    """
    uid = request["uid"]

    try:
        documents = DocumentService.get_all_documents(uid)
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/documents/{document_id}")
def get_document(document_id: str, request: dict = Depends(verify_firebase_token)):
    """
    Fetch a single CSR document by its ID.
    """
    uid = request["uid"]

    try:
        document = DocumentService.get_document_by_id(uid, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        return document
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))    