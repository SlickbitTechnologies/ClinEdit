from fastapi import APIRouter, Depends,HTTPException
from fastapi import UploadFile, File
from services.csr_documentservice import DocumentService
from dependencies.verify_token import verify_firebase_token
from services.gemini_service import GeminiService
import secrets
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

@router.get("/documents/{document_id}/shared")
def get_shared_document(document_id: str, token: str):
    """
    Fetch a shared document by its ID and token (no authentication required).
    """
    try:
        print(f"DEBUG: Accessing shared document {document_id} with token {token}")
        print(f"DEBUG: Available shared_links: {shared_links}")
        
        # Validate the token
        if token not in shared_links:
            print(f"DEBUG: Token {token} not found in shared_links")
            raise HTTPException(status_code=403, detail="Invalid or expired share token")
        
        # Get the stored document and user info
        stored_info = shared_links[token]
        stored_doc_id = stored_info["doc_id"]
        stored_user_id = stored_info["user_id"]
        
        # Check if the token corresponds to the requested document
        if stored_doc_id != document_id:
            print(f"DEBUG: Token {token} maps to document {stored_doc_id}, but requested {document_id}")
            raise HTTPException(status_code=403, detail="Token does not match document")
        
        print(f"DEBUG: Token validation passed, fetching document {document_id} from user {stored_user_id}")
        
        # Get the document using the user-specific method
        document = DocumentService.get_document_by_id(stored_user_id, document_id)
        if not document:
            print(f"DEBUG: Document {document_id} not found for user {stored_user_id}")
            raise HTTPException(status_code=404, detail="Document not found")
        
        print(f"DEBUG: Document found successfully: {document.get('title', 'No title')}")
        return document
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_shared_document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")    

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


@router.post("/documents/{document_id}/ingest-pdf")
async def ingest_pdf_for_document(
    document_id: str,
    request: dict = Depends(verify_firebase_token),
    file: UploadFile = File(...),
):
    """
    Accept a PDF, send to Gemini along with the document's current sections,
    and return AI suggestions mapped to section/subsection IDs.
    """
    uid = request["uid"]
    
    try:
        # Fetch the target CSR document; use its current sections for mapping
        document = DocumentService.get_document_by_id(uid, document_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        target_sections = document.get("sections", [])

        # Read raw PDF bytes
        file_bytes = await file.read()

        result = await GeminiService.extract_section_content_from_pdf(
            file_bytes=file_bytes,
            filename=file.filename,
            mime_type=file.content_type or "application/pdf",
            document_sections=target_sections,
        )
        return {"document_id": document_id, **result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/{document_id}/apply-extraction")
def apply_extraction(
    document_id: str,
    payload: dict,
    request: dict = Depends(verify_firebase_token),
):
    """
    Apply accepted AI suggestions into the document sections.
    Body: { accepted: [{ section_id, subsection_id, content, mode }] }
    """
    uid = request["uid"]
    try:
        accepted = payload.get("accepted", [])
        updated_doc = DocumentService.apply_extraction(uid, document_id, accepted)
        if not updated_doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return {"message": "Applied extraction successfully", "document": updated_doc}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Store shared links in memory (in production, use a database)
# Format: {token: {"doc_id": str, "user_id": str}}
shared_links = {}

@router.post("/documents/{doc_id}/share")
def generate_share_link(doc_id: str, request: dict = Depends(verify_firebase_token)):
    """
    Generate a share link for a document.
    In production, this should store the token in a database with expiration.
    """
    uid = request["uid"]
    token = secrets.token_urlsafe(16)
    shared_links[token] = {"doc_id": doc_id, "user_id": uid}
    print(f"DEBUG: Generated share link for document {doc_id} with token {token} for user {uid}")
    print(f"DEBUG: Current shared_links: {shared_links}")
    return {"share_link": f"http://localhost:3000/documents/{doc_id}?token={token}"}

@router.get("/documents/access/{token}")
def resolve_share_link(token: str):
    """
    Resolve a share token to get the document ID and user ID.
    """
    if token not in shared_links:
        return {"error": "Invalid or expired link"}
    
    stored_info = shared_links[token]
    return {
        "doc_id": stored_info["doc_id"], 
        "user_id": stored_info["user_id"]
    }    