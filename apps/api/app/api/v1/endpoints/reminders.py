from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import ClinicalReminder, Patient
from app.schemas.reminder import ClinicalReminderCreate, ClinicalReminderRead, ClinicalReminderUpdate
from app.utils.time import utc_now

router = APIRouter()


def _ensure_patient(db: Session, patient_id: int) -> Patient:
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_archived.is_(False)).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/", response_model=ClinicalReminderRead)
def create_reminder(payload: ClinicalReminderCreate, db: Session = Depends(get_db)):
    _ensure_patient(db, payload.patient_id)
    reminder = ClinicalReminder(**payload.model_dump())
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.get("/", response_model=list[ClinicalReminderRead])
def list_reminders(
    due_before: date | None = None,
    include_done: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(ClinicalReminder).options(joinedload(ClinicalReminder.patient)).join(Patient)
    query = query.filter(Patient.is_archived.is_(False))
    if due_before:
        query = query.filter(ClinicalReminder.due_date <= due_before)
    if not include_done:
        query = query.filter(ClinicalReminder.is_done.is_(False))
    reminders = query.order_by(ClinicalReminder.due_date.asc(), ClinicalReminder.priority.desc()).all()
    return reminders


@router.get("/by_patient/{patient_id}", response_model=list[ClinicalReminderRead])
def list_by_patient(patient_id: int, include_done: bool = True, db: Session = Depends(get_db)):
    _ensure_patient(db, patient_id)
    query = db.query(ClinicalReminder).filter(ClinicalReminder.patient_id == patient_id)
    if not include_done:
        query = query.filter(ClinicalReminder.is_done.is_(False))
    return query.order_by(ClinicalReminder.due_date.asc()).all()


@router.patch("/{reminder_id}", response_model=ClinicalReminderRead)
def update_reminder(reminder_id: int, payload: ClinicalReminderUpdate, db: Session = Depends(get_db)):
    reminder = db.query(ClinicalReminder).filter(ClinicalReminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    data = payload.model_dump(exclude_unset=True)
    if "is_done" in data:
        reminder.completed_at = utc_now() if data["is_done"] else None
    for key, value in data.items():
        setattr(reminder, key, value)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@router.delete("/{reminder_id}", response_model=ClinicalReminderRead)
def delete_reminder(reminder_id: int, db: Session = Depends(get_db)):
    reminder = db.query(ClinicalReminder).filter(ClinicalReminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    reminder.is_done = True
    reminder.completed_at = utc_now()
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder
