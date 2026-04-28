from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import ClinicalNote, Patient
from app.schemas.clinical_note import ClinicalNoteCreate, ClinicalNoteRead

router = APIRouter()


def _ensure_patient(db: Session, patient_id: int) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_archived.is_(False)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/", response_model=ClinicalNoteRead)
def create_clinical_note(payload: ClinicalNoteCreate, db: Session = Depends(get_db)):
    _ensure_patient(db, payload.patient_id)
    note = ClinicalNote(**payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/by_patient/{patient_id}", response_model=list[ClinicalNoteRead])
def list_by_patient(patient_id: int, db: Session = Depends(get_db)):
    _ensure_patient(db, patient_id)
    return (
        db.query(ClinicalNote)
        .filter(ClinicalNote.patient_id == patient_id)
        .order_by(ClinicalNote.created_at.desc())
        .all()
    )
