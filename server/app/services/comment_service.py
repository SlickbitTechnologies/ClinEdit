from core.firestore import db
from datetime import datetime
import uuid
from typing import List, Optional, Dict
from models.comment import Comment, CommentReply, CommentStatus
import json

class CommentService:
    COLLECTION = "comments"

    @staticmethod
    def create_comment(document_id: str, user_id: str, user_name: str, content: str, 
                      selection_text: Optional[str] = None, position: Optional[dict] = None, 
                      section_id: Optional[str] = None) -> Comment:
        """Create a new comment for a document"""
        comment_id = str(uuid.uuid4())
        shared_user_id = user_id
        
        comment_data = {
            "id": comment_id,
            "document_id": document_id,
            "user_id": shared_user_id,
            "user_name": user_name,
            "content": content,
            "selection_text": selection_text,
            "position": position,
            "section_id": section_id,
            "status": CommentStatus.ACTIVE.value,
            "replies": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": None
        }
        
        # Store in Firestore
        doc_ref = db.collection(CommentService.COLLECTION).document(comment_id)
        doc_ref.set(comment_data)
        
        # Convert datetime strings back to datetime objects for Pydantic model
        comment_data["created_at"] = datetime.fromisoformat(comment_data["created_at"])
        if comment_data["updated_at"]:
            comment_data["updated_at"] = datetime.fromisoformat(comment_data["updated_at"])
        
        return Comment(**comment_data)

    @staticmethod
    def get_comments_for_document(document_id: str) -> List[Comment]:
        """Get all comments for a specific document"""
        comments_ref = db.collection(CommentService.COLLECTION).where("document_id", "==", document_id).stream()
        
        comments = []
        for doc in comments_ref:
            data = doc.to_dict()
            
            # Convert datetime strings back to datetime objects
            if "created_at" in data and isinstance(data["created_at"], str):
                data["created_at"] = datetime.fromisoformat(data["created_at"])
            if "updated_at" in data and data["updated_at"] and isinstance(data["updated_at"], str):
                data["updated_at"] = datetime.fromisoformat(data["updated_at"])
            
            # Convert reply datetimes
            if "replies" in data:
                for reply in data["replies"]:
                    if "created_at" in reply and isinstance(reply["created_at"], str):
                        reply["created_at"] = datetime.fromisoformat(reply["created_at"])
                    if "updated_at" in reply and reply["updated_at"] and isinstance(reply["updated_at"], str):
                        reply["updated_at"] = datetime.fromisoformat(reply["updated_at"])
            
            comments.append(Comment(**data))
        
        # Sort by creation date (newest first)
        comments.sort(key=lambda x: x.created_at, reverse=True)
        return comments

    @staticmethod
    def get_comment_by_id(comment_id: str) -> Optional[Comment]:
        """Get a specific comment by ID"""
        doc_ref = db.collection(CommentService.COLLECTION).document(comment_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            # Convert datetime strings back to datetime objects
            if "created_at" in data and isinstance(data["created_at"], str):
                data["created_at"] = datetime.fromisoformat(data["created_at"])
            if "updated_at" in data and data["updated_at"] and isinstance(data["updated_at"], str):
                data["updated_at"] = datetime.fromisoformat(data["updated_at"])
            
            # Convert reply datetimes
            if "replies" in data:
                for reply in data["replies"]:
                    if "created_at" in reply and isinstance(reply["created_at"], str):
                        reply["created_at"] = datetime.fromisoformat(reply["created_at"])
                    if "updated_at" in reply and reply["updated_at"] and isinstance(reply["updated_at"], str):
                        reply["updated_at"] = datetime.fromisoformat(reply["updated_at"])
            
            return Comment(**data)
        return None

    @staticmethod
    def add_reply_to_comment(comment_id: str, user_id: str, user_name: str, content: str) -> Optional[Comment]:
        """Add a reply to an existing comment"""
        comment = CommentService.get_comment_by_id(comment_id)
        if not comment:
            return None
        
        reply_id = str(uuid.uuid4())
        reply = CommentReply(
            id=reply_id,
            user_id=user_id,
            user_name=user_name,
            content=content,
            created_at=datetime.utcnow()
        )
        
        # Add reply to comment
        comment.replies.append(reply)
        comment.updated_at = datetime.utcnow()
        
        # Update in Firestore
        doc_ref = db.collection(CommentService.COLLECTION).document(comment_id)
        doc_ref.update({
            "replies": [reply.model_dump() for reply in comment.replies],
            "updated_at": comment.updated_at.isoformat()
        })
        
        return comment

    @staticmethod
    def update_comment(comment_id: str, content: str) -> Optional[Comment]:
        """Update an existing comment"""
        comment = CommentService.get_comment_by_id(comment_id)
        if not comment:
            return None
        
        comment.content = content
        comment.updated_at = datetime.utcnow()
        
        # Update in Firestore
        doc_ref = db.collection(CommentService.COLLECTION).document(comment_id)
        doc_ref.update({
            "content": content,
            "updated_at": comment.updated_at.isoformat()
        })
        
        return comment

    @staticmethod
    def resolve_comment(comment_id: str) -> Optional[Comment]:
        """Mark a comment as resolved"""
        comment = CommentService.get_comment_by_id(comment_id)
        if not comment:
            return None
        
        comment.status = CommentStatus.RESOLVED
        comment.updated_at = datetime.utcnow()
        
        # Update in Firestore
        doc_ref = db.collection(CommentService.COLLECTION).document(comment_id)
        doc_ref.update({
            "status": CommentStatus.RESOLVED.value,
            "updated_at": comment.updated_at.isoformat()
        })
        
        return comment

    @staticmethod
    def delete_comment(comment_id: str) -> bool:
        """Delete a comment"""
        doc_ref = db.collection(CommentService.COLLECTION).document(comment_id)
        doc = doc_ref.get()
        
        if doc.exists:
            doc_ref.delete()
            return True
        return False

