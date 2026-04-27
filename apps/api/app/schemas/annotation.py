from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class AnnotationCreate(BaseModel):
    patient_id: int
    geometry: dict[str, Any]
    annotation_type: str
    severity: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[int] = None


class AnnotationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    geometry: dict[str, Any]
    annotation_type: str
    severity: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: Optional[int] = None
