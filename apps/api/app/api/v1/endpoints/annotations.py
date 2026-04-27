from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models import AnatomicalAnnotation, Patient
from app.db.session import get_db
from app.schemas.annotation import AnnotationCreate, AnnotationRead

router = APIRouter()


@router.post("/", response_model=AnnotationRead)
def create_annotation(payload: AnnotationCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    ann = AnatomicalAnnotation(**payload.model_dump())
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann


@router.get("/by_patient/{patient_id}", response_model=list[AnnotationRead])
def list_by_patient(patient_id: int, db: Session = Depends(get_db)):
    anns = db.query(AnatomicalAnnotation).filter(AnatomicalAnnotation.patient_id == patient_id).all()
    return anns
