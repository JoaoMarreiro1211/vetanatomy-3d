from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.utils.time import utc_now


class ClinicalNote(Base):
    __tablename__ = "clinical_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    note_type = Column(String, default="soap")
    title = Column(String, nullable=False)
    subjective = Column(String, nullable=True)
    objective = Column(String, nullable=True)
    assessment = Column(String, nullable=True)
    plan = Column(String, nullable=True)
    vitals = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    patient = relationship("Patient")
    user = relationship("User")
