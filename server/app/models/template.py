from pydantic import BaseModel, Field,EmailStr
from typing import List, Optional
from datetime import datetime
import uuid


from typing import List
from pydantic import BaseModel

class Subsection(BaseModel):
    id: str
    title: str
    description: Optional[str] = None

class Section(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    subsections: List[Subsection]

class CSRTemplate(BaseModel):
    meta_keys: List[str]
    sections: List[Section]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)



class ShareRequest(BaseModel):
    document_id: str
    email: EmailStr
    role: str