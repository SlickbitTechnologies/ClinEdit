from core.firestore import db
from datetime import datetime

class DocumentService:
    COLLECTION = "csr_documents"

    @staticmethod
    def create_document(uid: str, metadata: dict):
        user_ref = db.collection("users").document(uid)
        template_ref = user_ref.collection("csr_templates").limit(1).stream()
        template = None
        for t in template_ref:
            template = t.to_dict()
            break

        if not template:
            raise Exception("CSR template not found")

        doc_ref = user_ref.collection(DocumentService.COLLECTION).document()

        sections = template.get("sections", [])

        for section in sections:
            if section.get("title", "").upper() == "TITLE PAGE":
                section["metadata"] = metadata
                break

        csr_document = {
            "id": doc_ref.id,
            "title": metadata.get("studyTitle", "Untitled CSR Document"),
            "meta_data": metadata,  
            "sections": sections,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "uploaded_by": uid
        }

        doc_ref.set(csr_document)
        return csr_document
    @staticmethod
    def get_all_documents(uid: str):
        """
        Fetch all CSR documents for the user.
        """
        docs_ref = (
            db.collection("users")
            .document(uid)
            .collection(DocumentService.COLLECTION)
            .stream()
        )

        documents = []
        for doc in docs_ref:
            data = doc.to_dict()
            documents.append(data)

        return documents

    @staticmethod
    def get_document_by_id(uid: str, document_id: str):
        """
        Fetch a single CSR document by ID.
        """
        doc_ref = (
            db.collection("users")
            .document(uid)
            .collection(DocumentService.COLLECTION)
            .document(document_id)
            .get()
        )

        if not doc_ref.exists:
            return None
        return doc_ref.to_dict()
