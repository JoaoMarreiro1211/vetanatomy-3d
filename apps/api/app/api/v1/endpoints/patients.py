from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.schemas.patient import PatientCreate, PatientRead
from app.models import Patient, Species, SpeciesGroup

router = APIRouter()


@router.post("/", response_model=PatientRead)
def create_patient(patient_in: PatientCreate, db: Session = Depends(get_db)):
    if patient_in.species_id and not db.query(Species).filter(Species.id == patient_in.species_id).first():
        raise HTTPException(status_code=404, detail="Species not found")
    patient = Patient(**patient_in.model_dump())
    db.add(patient)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Patient record number already exists")
    db.refresh(patient)
    return patient


@router.get("/", response_model=list[PatientRead])
def list_patients(
    species_id: int | None = None,
    group: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Patient).options(joinedload(Patient.species).joinedload(Species.group))
    if species_id:
        query = query.filter(Patient.species_id == species_id)
    if group:
        query = query.join(Patient.species).join(Species.group).filter(SpeciesGroup.code == group)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.filter((Patient.name.ilike(pattern)) | (Patient.record_number.ilike(pattern)))
    patients = query.order_by(Patient.id.desc()).all()
    return patients


@router.get("/{patient_id}", response_model=PatientRead)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).options(joinedload(Patient.species).joinedload(Species.group)).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient
