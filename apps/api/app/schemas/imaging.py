from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class DICOMStudyCreate(BaseModel):
    patient_id: int
    study_uid: str
    description: Optional[str] = None
    modality: Optional[str] = None
    file_url: Optional[str] = None


class DICOMStudyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    study_uid: str
    description: Optional[str] = None
    modality: Optional[str] = None
    file_url: Optional[str] = None
    date: datetime


class DICOMSeriesCreate(BaseModel):
    study_id: int
    series_uid: str
    description: Optional[str] = None


class DICOMSeriesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    study_id: int
    series_uid: str
    description: Optional[str] = None


class ImagingFindingCreate(BaseModel):
    series_id: int
    annotation_id: Optional[int] = None
    findings: Optional[dict[str, Any]] = None


class ImagingFindingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    series_id: int
    annotation_id: Optional[int] = None
    findings: Optional[dict[str, Any]] = None
    created_at: datetime
