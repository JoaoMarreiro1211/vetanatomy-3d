from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.utils.time import utc_now


class ClinicalReminder(Base):
    __tablename__ = "clinical_reminders"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    title = Column(String, nullable=False)
    reminder_type = Column(String, default="follow_up")
    due_date = Column(Date, nullable=False)
    priority = Column(String, default="normal")
    notes = Column(String, nullable=True)
    is_done = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    patient = relationship("Patient")
    user = relationship("User")

    @property
    def patient_name(self):
        return self.patient.name if self.patient else None

    @property
    def patient_record_number(self):
        return self.patient.record_number if self.patient else None
