from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class ClinicalNoteCreate(BaseModel):
    patient_id: int
    note_type: str = "soap"
    title: str
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    vitals: Optional[dict[str, Any]] = None
    created_by: Optional[int] = None


class ClinicalNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    note_type: str
    title: str
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    vitals: Optional[dict[str, Any]] = None
    created_at: datetime
    created_by: Optional[int] = None
