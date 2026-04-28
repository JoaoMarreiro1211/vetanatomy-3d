from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date


class PatientCreate(BaseModel):
    name: str
    species_id: Optional[int] = None
    breed_id: Optional[int] = None
    sex: Optional[str] = None
    weight: Optional[float] = None
    birth_date: Optional[date] = None
    record_number: Optional[str] = None
    owner_id: Optional[int] = None


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    species_id: Optional[int] = None
    breed_id: Optional[int] = None
    sex: Optional[str] = None
    weight: Optional[float] = None
    birth_date: Optional[date] = None
    record_number: Optional[str] = None
    owner_id: Optional[int] = None
    is_archived: Optional[bool] = None


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    species_id: Optional[int]
    breed_id: Optional[int]
    sex: Optional[str]
    weight: Optional[float]
    birth_date: Optional[date]
    record_number: Optional[str]
    owner_id: Optional[int]
    is_archived: bool = False
    species_name: Optional[str] = None
    species_group: Optional[str] = None
    species_group_label: Optional[str] = None
