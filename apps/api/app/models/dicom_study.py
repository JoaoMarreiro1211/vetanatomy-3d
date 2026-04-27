from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils.time import utc_now


class DICOMStudy(Base):
    __tablename__ = "dicom_studies"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    study_uid = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    modality = Column(String, nullable=True)
    file_url = Column(String, nullable=True)
    date = Column(DateTime, default=utc_now)

    patient = relationship("Patient")
