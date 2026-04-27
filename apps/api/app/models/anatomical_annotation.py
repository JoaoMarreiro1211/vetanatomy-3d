from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils.time import utc_now


class AnatomicalAnnotation(Base):
    __tablename__ = "anatomical_annotations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    geometry = Column(JSON, nullable=False)  # store coords, mesh references, etc.
    annotation_type = Column(String, nullable=False)
    severity = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    created_by = Column(Integer, ForeignKey("users.id"))

    patient = relationship("Patient")
    user = relationship("User")
