from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import DICOMSeries, DICOMStudy, ImagingFinding, Patient
from app.schemas.imaging import (
    DICOMSeriesCreate,
    DICOMSeriesRead,
    DICOMStudyCreate,
    DICOMStudyRead,
    ImagingFindingCreate,
    ImagingFindingRead,
)

router = APIRouter()


@router.post("/studies", response_model=DICOMStudyRead)
def create_study(payload: DICOMStudyCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    study = DICOMStudy(**payload.model_dump())
    db.add(study)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Study UID already exists")
    db.refresh(study)
    return study


@router.get("/studies/by_patient/{patient_id}", response_model=list[DICOMStudyRead])
def list_studies_by_patient(patient_id: int, db: Session = Depends(get_db)):
    return (
        db.query(DICOMStudy)
        .filter(DICOMStudy.patient_id == patient_id)
        .order_by(DICOMStudy.date.desc())
        .all()
    )


@router.post("/series", response_model=DICOMSeriesRead)
def create_series(payload: DICOMSeriesCreate, db: Session = Depends(get_db)):
    study = db.query(DICOMStudy).filter(DICOMStudy.id == payload.study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    series = DICOMSeries(**payload.model_dump())
    db.add(series)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Series UID already exists")
    db.refresh(series)
    return series


@router.get("/series/by_study/{study_id}", response_model=list[DICOMSeriesRead])
def list_series_by_study(study_id: int, db: Session = Depends(get_db)):
    return db.query(DICOMSeries).filter(DICOMSeries.study_id == study_id).order_by(DICOMSeries.id.desc()).all()


@router.post("/findings", response_model=ImagingFindingRead)
def create_finding(payload: ImagingFindingCreate, db: Session = Depends(get_db)):
    series = db.query(DICOMSeries).filter(DICOMSeries.id == payload.series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")

    finding = ImagingFinding(**payload.model_dump())
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return finding


@router.get("/findings/by_patient/{patient_id}", response_model=list[ImagingFindingRead])
def list_findings_by_patient(patient_id: int, db: Session = Depends(get_db)):
    return (
        db.query(ImagingFinding)
        .join(DICOMSeries, ImagingFinding.series_id == DICOMSeries.id)
        .join(DICOMStudy, DICOMSeries.study_id == DICOMStudy.id)
        .filter(DICOMStudy.patient_id == patient_id)
        .order_by(ImagingFinding.created_at.desc())
        .all()
    )
