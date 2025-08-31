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
    def get_public_document(document_id: str):
        """
        Fetch a document by ID for public access (no user authentication required).
        This method searches across all users to find the document.
        """
        try:
            print(f"DEBUG: get_public_document called with ID: {document_id}")
            
            # Search across all users to find the document
            users_ref = db.collection("users")
            print(f"DEBUG: Users collection reference: {users_ref}")
            
            # Get all users
            users = list(users_ref.stream())
            print(f"DEBUG: Found {len(users)} users in total")
            
            if len(users) == 0:
                print("DEBUG: No users found in the database")
                return None
            
            user_count = 0
            for user in users:
                user_count += 1
                print(f"DEBUG: Checking user {user_count}: {user.id}")
                
                try:
                    # Check if the user has the csr_documents collection
                    csr_collection = user.reference.collection(DocumentService.COLLECTION)
                    print(f"DEBUG: Checking collection {DocumentService.COLLECTION} for user {user.id}")
                    
                    # Check if the specific document exists
                    doc_ref = csr_collection.document(document_id)
                    doc = doc_ref.get()
                    
                    if doc.exists:
                        print(f"DEBUG: Document found in user {user.id}")
                        doc_data = doc.to_dict()
                        print(f"DEBUG: Document data keys: {list(doc_data.keys()) if doc_data else 'None'}")
                        return doc_data
                    else:
                        print(f"DEBUG: Document {document_id} not found in user {user.id}")
                        
                except Exception as user_error:
                    print(f"DEBUG: Error checking user {user.id}: {user_error}")
                    continue
            
            print(f"DEBUG: Document not found in any of {user_count} users")
            return None
            
        except Exception as e:
            print(f"Error fetching public document: {e}")
            import traceback
            traceback.print_exc()
            return None
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
        Each item: { section_id (hierarchical format), content, mode: 'prepend'|'append'|'replace' }
        section_id can be: "9" (section), "9.1" (subsection), "9.1.1" (subsubsection)
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
            section_id = item.get("section_id", "")
            content = item.get("content", "")
            mode = (item.get("mode") or "append").lower()

            if not section_id:
                continue

            # Parse the hierarchical section_id to determine the level and find the target
            parts = section_id.split(".")
            
            if len(parts) == 1:
                # Section level (e.g., "9")
                target = section_map.get(section_id)
                if target:
                    existing = target.get("description") or ""
                    target["description"] = DocumentService._update_rich_text(existing, content, mode)
                    
            elif len(parts) == 2:
                # Subsection level (e.g., "9.1")
                section_key = parts[0]
                subsection_key = section_id
                target = section_map.get(section_key)
                if target:
                    subs = target.get("subsections", [])
                    sub = next((ss for ss in subs if ss.get("id") == subsection_key), None)
                    if sub:
                        existing = sub.get("description") or ""
                        sub["description"] = DocumentService._update_rich_text(existing, content, mode)
                        
            elif len(parts) == 3:
                # Subsubsection level (e.g., "9.1.1")
                section_key = parts[0]
                subsection_key = f"{parts[0]}.{parts[1]}"
                subsubsection_key = section_id
                
                target = section_map.get(section_key)
                if target:
                    subs = target.get("subsections", [])
                    sub = next((ss for ss in subs if ss.get("id") == subsection_key), None)
                    if sub:
                        subsubs = sub.get("subsubsections", [])
                        subsub = next((sss for sss in subsubs if sss.get("id") == subsubsection_key), None)
                        if subsub:
                            existing = subsub.get("description") or ""
                            subsub["description"] = DocumentService._update_rich_text(existing, content, mode)

        doc["sections"] = list(section_map.values())
        doc["updated_at"] = datetime.utcnow().isoformat()

        doc_ref.set(doc)
        return doc