from core.firestore import db
from datetime import datetime

class DocumentService:
    COLLECTION = "csr_documents"

    @staticmethod
    def create_document(uid: str, metadata: dict):
        # Fetch the only CSR template
        user_ref = db.collection("users").document(uid)
        template_ref = user_ref.collection("csr_templates").limit(1).stream()
        template = None
        for t in template_ref:
            template = t.to_dict()
            break

        if not template:
            raise Exception("CSR template not found")

        # Create new document reference under user
        doc_ref = user_ref.collection(DocumentService.COLLECTION).document()

        # Deep copy template sections to modify safely
        sections = template.get("sections", [])

        # Insert metadata inside TITLE PAGE section
        for section in sections:
            if section.get("title", "").upper() == "TITLE PAGE":
                section["metadata"] = metadata
                break

        # Build document structure
        csr_document = {
            "id": doc_ref.id,
            "title": metadata.get("studyTitle", "Untitled CSR Document"),
            "meta_data": metadata,  # top-level copy
            "sections": sections,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "uploaded_by": uid
        }

        # Save in Firestore
        doc_ref.set(csr_document)
        return csr_document
