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

@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, request=Depends(verify_firebase_token)):
    """
    API endpoint to delete a document by ID.
    
    """
    uid = request["uid"]

    success = DocumentService.delete_document(uid, document_id)

    if not success:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"message": "Document deleted successfully"}    

@router.put("/documents/{document_id}")
async def update_document(
    document_id: str,
    payload: dict,
    request: dict = Depends(verify_firebase_token),
):
    """
    Update an existing CSR document with new content/sections/metadata.
    """
    uid = request["uid"]
    try:
        updated_doc = DocumentService.update_document(uid, document_id, payload)
        if not updated_doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"message": "Document updated successfully", "document": updated_doc}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))