from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils.time import utc_now


class Admission(Base):
    __tablename__ = "admissions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    room_id = Column(Integer, ForeignKey("hospital_rooms.id"))
    admitted_at = Column(DateTime, default=utc_now)
    discharged_at = Column(DateTime, nullable=True)
    status = Column(String, default="admitted")

    patient = relationship("Patient")
    room = relationship("HospitalRoom")
