from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Patient, SurgicalPlan
from app.schemas.surgical_plan import SurgicalPlanCreate, SurgicalPlanRead

router = APIRouter()


@router.post("/", response_model=SurgicalPlanRead)
def create_surgical_plan(payload: SurgicalPlanCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    surgical_plan = SurgicalPlan(**payload.model_dump())
    db.add(surgical_plan)
    db.commit()
    db.refresh(surgical_plan)
    return surgical_plan


@router.get("/by_patient/{patient_id}", response_model=list[SurgicalPlanRead])
def list_by_patient(patient_id: int, db: Session = Depends(get_db)):
    return (
        db.query(SurgicalPlan)
        .filter(SurgicalPlan.patient_id == patient_id)
        .order_by(SurgicalPlan.created_at.desc())
        .all()
    )
