from core.firestore import db
from datetime import datetime

class TemplateService:
    COLLECTION = "csr_templates"

    @staticmethod
    def save_template(uid: str, title: str, template_data: dict):


        # Navigate to subcollection under user
        user_ref = db.collection("users").document(uid)
        doc_ref = user_ref.collection(TemplateService.COLLECTION).document()

        template = {
            "id": doc_ref.id,
            "title": title,
            "meta_keys": template_data["meta_keys"],
            "sections": template_data["sections"],
            "uploaded_by": uid,
            "created_at": datetime.utcnow().isoformat()
        }

        doc_ref.set(template)
        return template
