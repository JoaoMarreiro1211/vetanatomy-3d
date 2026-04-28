from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ClinicalReminderCreate(BaseModel):
    patient_id: int
    title: str
    reminder_type: str = "follow_up"
    due_date: date
    priority: str = "normal"
    notes: Optional[str] = None
    created_by: Optional[int] = None


class ClinicalReminderUpdate(BaseModel):
    title: Optional[str] = None
    reminder_type: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    is_done: Optional[bool] = None


class ClinicalReminderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    title: str
    reminder_type: str
    due_date: date
    priority: str
    notes: Optional[str] = None
    is_done: bool
    created_at: datetime
    completed_at: Optional[datetime] = None
    created_by: Optional[int] = None
    patient_name: Optional[str] = None
    patient_record_number: Optional[str] = None
