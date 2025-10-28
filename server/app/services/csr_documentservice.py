from core.firestore import db
from datetime import datetime
import json
import logging


class DocumentService:
    """Service layer for managing CSR documents in Firestore."""

    COLLECTION = "csr_documents"
    TEMPLATES_COLLECTION = "csr_templates"

    @staticmethod
    def _get_doc_ref(uid: str, document_id: str = None):
        """Return Firestore reference to user's CSR documents or a specific document."""
        user_ref = db.collection("users").document(uid)
        if document_id:
            return user_ref.collection(DocumentService.COLLECTION).document(document_id)
        return user_ref.collection(DocumentService.COLLECTION)

    @staticmethod
    def _update_rich_text(existing: str, content: str, mode: str) -> str:
        """Update or merge ProseMirror JSON content (fallbacks to text if needed)."""
        try:
            existing_json = json.loads(existing) if existing else {"type": "doc", "content": []}
        except Exception:
            # fallback plain text behavior
            if mode == "replace":
                return content
            elif mode == "prepend":
                return f"{content}\n\n{existing}".strip()
            else:
                return f"{existing}\n\n{content}".strip()

        new_paragraph = {
            "type": "paragraph",
            "attrs": {"textAlign": "left"},
            "content": [{"type": "text", "text": content}],
        }

        if mode == "replace":
            existing_json["content"] = [new_paragraph]
        elif mode == "prepend":
            existing_json["content"].insert(0, new_paragraph)
        else:  # append
            existing_json["content"].append(new_paragraph)

        return json.dumps(existing_json)


    @staticmethod
    def create_document(uid: str, metadata: dict):
        """Create a new CSR document from a user's CSR template."""
        user_ref = db.collection("users").document(uid)
        templates = user_ref.collection(DocumentService.TEMPLATES_COLLECTION).limit(1).stream()

        template = next(templates, None)
        if not template:
            raise Exception("CSR template not found")

        template_data = template.to_dict()
        sections = template_data.get("sections", [])

        # Add metadata to "TITLE PAGE" section
        for section in sections:
            if section.get("title", "").upper() == "TITLE PAGE":
                description = section.get("description") or ""
                meta_text = "\n".join([f"{k}: {v}" for k, v in metadata.items()])
                section["description"] = f"{description}\n\n{meta_text}".strip()
                break

        doc_ref = user_ref.collection(DocumentService.COLLECTION).document()

        now = datetime.utcnow().isoformat()
        csr_document = {
            "id": doc_ref.id,
            "title": metadata.get("studyTitle", "Untitled CSR Document"),
            "meta_data": metadata,
            "sections": sections,
            "created_at": now,
            "updated_at": now,
            "uploaded_by": uid,
        }

        doc_ref.set(csr_document)
        return csr_document

    @staticmethod
    def get_all_documents(uid: str):
        """Fetch all CSR documents for a user."""
        docs = DocumentService._get_doc_ref(uid).stream()
        return [doc.to_dict() for doc in docs]

    @staticmethod
    def get_document_by_id(uid: str, document_id: str):
        """Retrieve a single CSR document by ID."""
        doc_ref = DocumentService._get_doc_ref(uid, document_id).get()
        return doc_ref.to_dict() if doc_ref.exists else None

    @staticmethod
    def delete_document(uid: str, document_id: str) -> bool:
        """Delete a CSR document by ID."""
        try:
            doc_ref = DocumentService._get_doc_ref(uid, document_id)
            if not doc_ref.get().exists:
                return False
            doc_ref.delete()
            return True
        except Exception as e:
            logging.error(f"Error deleting document {document_id}: {e}")
            return False

    @staticmethod
    def update_document(uid: str, document_id: str, payload: dict):
        """Update CSR document fields with provided payload."""
        doc_ref = DocumentService._get_doc_ref(uid, document_id)
        snapshot = doc_ref.get()
        if not snapshot.exists:
            return None

        updated_doc = {
            **snapshot.to_dict(),
            **payload,
            "updated_at": datetime.utcnow().isoformat(),
        }

        doc_ref.set(updated_doc)
        return updated_doc
    @staticmethod
    def apply_extraction(uid: str, document_id: str, accepted: list):
        """
        Apply accepted AI suggestions to the CSR document.
        Each accepted item:
            {
                section_id: "9" | "9.1" | "9.1.1",
                content: "...",
                mode: "prepend" | "append" | "replace"
            }
        """
        doc_ref = DocumentService._get_doc_ref(uid, document_id)
        snap = doc_ref.get()
        if not snap.exists:
            return None

        doc = snap.to_dict()
        sections = doc.get("sections", [])
        section_map = {s.get("id"): s for s in sections}

        for item in accepted or []:
            section_id = item.get("section_id")
            content = item.get("content", "")
            mode = (item.get("mode") or "append").lower()
            if not section_id:
                continue

            parts = section_id.split(".")

            # Level 1: Section
            if len(parts) == 1:
                target = section_map.get(section_id)
                if target:
                    target["description"] = DocumentService._update_rich_text(
                        target.get("description") or "", content, mode
                    )

            # Level 2: Subsection
            elif len(parts) == 2:
                section = section_map.get(parts[0])
                if section:
                    subs = section.get("subsections", [])
                    sub = next((ss for ss in subs if ss.get("id") == section_id), None)
                    if sub:
                        sub["description"] = DocumentService._update_rich_text(
                            sub.get("description") or "", content, mode
                        )

            # Level 3: Subsubsection
            elif len(parts) == 3:
                section = section_map.get(parts[0])
                if section:
                    subs = section.get("subsections", [])
                    sub = next((ss for ss in subs if ss.get("id") == f"{parts[0]}.{parts[1]}"), None)
                    if sub:
                        subsubs = sub.get("subsubsections", [])
                        subsub = next((sss for sss in subsubs if sss.get("id") == section_id), None)
                        if subsub:
                            subsub["description"] = DocumentService._update_rich_text(
                                subsub.get("description") or "", content, mode
                            )

        doc["sections"] = list(section_map.values())
        doc["updated_at"] = datetime.utcnow().isoformat()
        doc_ref.set(doc)
        return doc
