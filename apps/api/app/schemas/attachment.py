from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: Optional[int] = None
    filename: str
    url: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    category: Optional[str] = None
    uploaded_at: datetime
    uploaded_by: Optional[int] = None
