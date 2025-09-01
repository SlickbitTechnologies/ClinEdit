from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class CommentStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"

class CommentReply(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})
    
    id: str = Field(..., description="Unique identifier for the reply")
    user_id: str = Field(..., description="User ID who made the reply")
    user_name: str = Field(..., description="Display name of the user")
    content: str = Field(..., description="Reply content")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When the reply was created")
    updated_at: Optional[datetime] = Field(None, description="When the reply was last updated")

class Comment(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})
    
    id: str = Field(..., description="Unique identifier for the comment")
    document_id: str = Field(..., description="Document ID this comment belongs to")
    user_id: str = Field(..., description="User ID who created the comment")
    user_name: str = Field(..., description="Display name of the user")
    content: str = Field(..., description="Comment content")
    selection_text: Optional[str] = Field(None, description="Selected text that the comment refers to")
    position: Optional[dict] = Field(None, description="Position information for the comment")
    section_id: Optional[str] = Field(None, description="Section ID if comment is on a specific section")
    status: CommentStatus = Field(default=CommentStatus.ACTIVE, description="Comment status")
    replies: List[CommentReply] = Field(default_factory=list, description="Replies to this comment")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="When the comment was created")
    updated_at: Optional[datetime] = Field(None, description="When the comment was last updated")

class CreateCommentRequest(BaseModel):
    content: str = Field(..., description="Comment content")
    selection_text: Optional[str] = Field(None, description="Selected text that the comment refers to")
    position: Optional[dict] = Field(None, description="Position information for the comment")
    section_id: Optional[str] = Field(None, description="Section ID if comment is on a specific section")

class CreateReplyRequest(BaseModel):
    content: str = Field(..., description="Reply content")

class UpdateCommentRequest(BaseModel):
    content: str = Field(..., description="Updated comment content")

class CommentResponse(BaseModel):
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    data: Optional[Comment] = Field(None, description="Comment data if applicable")
