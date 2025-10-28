from core.firestore import db
from datetime import datetime
from typing import List, Optional
from models.comment import Comment, CommentReply, CommentStatus
import uuid


class CommentService:
    """Service for managing comments and replies stored in Firestore."""
    COLLECTION = "comments"

    @staticmethod
    def _convert_comment_dates(data: dict) -> dict:
        """Convert date strings in comment and replies to datetime objects."""
        for field in ["created_at", "updated_at"]:
            if field in data and isinstance(data[field], str):
                data[field] = datetime.fromisoformat(data[field])

        if "replies" in data:
            for reply in data["replies"]:
                for field in ["created_at", "updated_at"]:
                    if field in reply and isinstance(reply[field], str):
                        reply[field] = datetime.fromisoformat(reply[field])
        return data

    @staticmethod
    def _get_doc_ref(comment_id: str):
        """Shortcut to Firestore comment reference."""
        return db.collection(CommentService.COLLECTION).document(comment_id)
    @staticmethod
    def create_comment(
        document_id: str,
        user_id: str,
        user_name: str,
        content: str,
        selection_text: Optional[str] = None,
        position: Optional[dict] = None,
        section_id: Optional[str] = None,
        user_email: Optional[str] = None,
    ) -> Comment:
        """Create a new comment for a document."""
        comment_id = str(uuid.uuid4())
        now = datetime.utcnow()

        comment_data = {
            "id": comment_id,
            "document_id": document_id,
            "user_id": user_id,
            "user_name": user_name,
            "user_email": user_email,
            "content": content,
            "selection_text": selection_text,
            "position": position,
            "section_id": section_id,
            "status": CommentStatus.ACTIVE.value,
            "replies": [],
            "created_at": now.isoformat(),
            "updated_at": None,
        }

        CommentService._get_doc_ref(comment_id).set(comment_data)
        comment_data["created_at"] = now
        return Comment(**comment_data)

    @staticmethod
    def get_comments_for_document(document_id: str) -> List[Comment]:
        """Retrieve all comments for a given document, newest first."""
        docs = (
            db.collection(CommentService.COLLECTION)
            .where("document_id", "==", document_id)
            .stream()
        )

        comments = []
        for doc in docs:
            data = CommentService._convert_comment_dates(doc.to_dict())
            comments.append(Comment(**data))

        comments.sort(key=lambda c: c.created_at, reverse=True)
        return comments

    @staticmethod
    def get_comment_by_id(comment_id: str) -> Optional[Comment]:
        """Retrieve a specific comment by its ID."""
        doc = CommentService._get_doc_ref(comment_id).get()
        if not doc.exists:
            return None

        data = CommentService._convert_comment_dates(doc.to_dict())
        return Comment(**data)

    @staticmethod
    def add_reply_to_comment(
        comment_id: str,
        user_id: str,
        user_name: str,
        content: str,
        user_email: Optional[str] = None,
    ) -> Optional[Comment]:
        """Add a reply to an existing comment."""
        comment = CommentService.get_comment_by_id(comment_id)
        if not comment:
            return None

        reply = CommentReply(
            id=str(uuid.uuid4()),
            user_id=user_id,
            user_name=user_name,
            user_email=user_email,
            content=content,
            created_at=datetime.utcnow(),
        )

        comment.replies.append(reply)
        comment.updated_at = datetime.utcnow()

        CommentService._get_doc_ref(comment_id).update(
            {
                "replies": [r.model_dump(mode="json") for r in comment.replies],
                "updated_at": comment.updated_at.isoformat(),
            }
        )
        return comment

    @staticmethod
    def update_comment(comment_id: str, content: str) -> Optional[Comment]:
        """Update the content of an existing comment."""
        comment = CommentService.get_comment_by_id(comment_id)
        if not comment:
            return None

        comment.content = content
        comment.updated_at = datetime.utcnow()

        CommentService._get_doc_ref(comment_id).update(
            {"content": content, "updated_at": comment.updated_at.isoformat()}
        )
        return comment

    @staticmethod
    def resolve_comment(comment_id: str) -> Optional[Comment]:
        """Mark a comment as resolved."""
        comment = CommentService.get_comment_by_id(comment_id)
        if not comment:
            return None

        comment.status = CommentStatus.RESOLVED
        comment.updated_at = datetime.utcnow()

        CommentService._get_doc_ref(comment_id).update(
            {
                "status": CommentStatus.RESOLVED.value,
                "updated_at": comment.updated_at.isoformat(),
            }
        )
        return comment

    @staticmethod
    def delete_comment(comment_id: str) -> bool:
        """Delete a comment from Firestore."""
        doc_ref = CommentService._get_doc_ref(comment_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False

        doc_ref.delete()
        return True
