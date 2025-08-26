from core.firestore import db
from datetime import datetime
import json
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
                description = section.get("description") or ""
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


    @staticmethod
    def _update_rich_text(existing: str, content: str, mode: str) -> str:
        """Update a rich text JSON string with new content."""
        try:
            existing_json = json.loads(existing) if existing else {"type": "doc", "content": []}
        except Exception:
            # fallback to plain text behavior if it's not valid JSON
            if mode == "replace":
                return content
            elif mode == "prepend":
                return f"{content}\n\n{existing}".strip()
            else:
                return f"{existing}\n\n{content}".strip()

        new_paragraph = {
            "type": "paragraph",
            "attrs": {"textAlign": "left"},
            "content": [{"type": "text", "text": content}]
        }

        if mode == "replace":
            existing_json["content"] = [new_paragraph]
        elif mode == "prepend":
            existing_json["content"].insert(0, new_paragraph)
        else:  # append
            existing_json["content"].append(new_paragraph)

        return json.dumps(existing_json)

    @staticmethod
    def apply_extraction(uid: str, document_id: str, accepted: list):
        """
        Apply accepted AI suggestions to the document.
        Each item: { section_id, subsection_id, subsubsection_id, content, mode: 'prepend'|'append'|'replace' }
        """
        doc_ref = (
            db.collection("users")
            .document(uid)
            .collection(DocumentService.COLLECTION)
            .document(document_id)
        )
        snap = doc_ref.get()
        if not snap.exists:
            return None
        doc = snap.to_dict()

        sections = doc.get("sections", [])
        section_map = {s.get("id"): s for s in sections}

        for item in accepted or []:
            sec_id = item.get("section_id")
            sub_id = item.get("subsection_id")
            subsub_id = item.get("subsubsection_id")
            content = item.get("content", "")
            mode = (item.get("mode") or "append").lower()

            target = section_map.get(sec_id)
            if not target:
                continue

            if sub_id:
                subs = target.get("subsections", [])
                sub_map = {ss.get("id"): ss for ss in subs}
                sub = sub_map.get(sub_id)
                if sub is None:
                    continue
                
                if subsub_id:
                    # Handle subsubsection level
                    subsubs = sub.get("subsubsections", [])
                    subsub_map = {sss.get("id"): sss for sss in subsubs}
                    subsub = subsub_map.get(subsub_id)
                    if subsub is None:
                        continue
                    existing = subsub.get("description") or ""
                    subsub["description"] = DocumentService._update_rich_text(existing, content, mode)
                else:
                    # Handle subsection level
                    existing = sub.get("description") or ""
                    sub["description"] = DocumentService._update_rich_text(existing, content, mode)
            else:
                # Handle section level
                existing = target.get("description") or ""
                target["description"] = DocumentService._update_rich_text(existing, content, mode)

        doc["sections"] = list(section_map.values())
        doc["updated_at"] = datetime.utcnow().isoformat()
        print(doc)  # Optional: for debugging

        doc_ref.set(doc)
        return doc