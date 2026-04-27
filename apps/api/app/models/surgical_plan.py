from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils.time import utc_now


class SurgicalPlan(Base):
    __tablename__ = "surgical_plans"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    structure = Column(String, nullable=True)
    plan = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    created_by = Column(Integer, ForeignKey("users.id"))

    patient = relationship("Patient")
    user = relationship("User")
