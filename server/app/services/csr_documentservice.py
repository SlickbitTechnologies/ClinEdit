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
                description = section.get("description", "")
                meta_text = "\n".join([f"{k}: {v}" for k, v in metadata.items()])
                section["description"] = f"{description}\n\n{meta_text}".strip()
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
    @staticmethod
    def delete_document(uid: str, document_id: str) -> bool:
        """
        Delete a CSR document by ID for a given user.
        """
        try:
            doc_ref = (
                db.collection("users")
                .document(uid)
                .collection(DocumentService.COLLECTION)
                .document(document_id)
            )
            doc = doc_ref.get()
            if not doc.exists:
                return False
            doc_ref.delete()
            return True
        except Exception as e:
            print("Error deleting document:", e)
            return False
    @staticmethod
    def update_document(uid: str, document_id: str, payload: dict):
        """
        Update a CSR document with new sections, metadata, etc.
        """
        doc_ref = (
            db.collection("users")
            .document(uid)
            .collection(DocumentService.COLLECTION)
            .document(document_id)
        )

        snapshot = doc_ref.get()
        if not snapshot.exists:
            return None

        # Merge new content
        updated_doc = {
            **snapshot.to_dict(),
            **payload,  # overwrite with incoming payload (sections, title, metadata, etc.)
            "updated_at": datetime.utcnow().isoformat(),
        }

        doc_ref.set(updated_doc)
        return updated_doc