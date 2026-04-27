from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class SurgicalPlanCreate(BaseModel):
    patient_id: int
    structure: Optional[str] = None
    plan: Optional[dict[str, Any]] = None
    created_by: Optional[int] = None


class SurgicalPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    structure: Optional[str] = None
    plan: Optional[dict[str, Any]] = None
    created_at: datetime
    created_by: Optional[int] = None
