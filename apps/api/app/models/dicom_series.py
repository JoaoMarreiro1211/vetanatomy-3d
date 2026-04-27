from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base


class DICOMSeries(Base):
    __tablename__ = "dicom_series"

    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("dicom_studies.id"))
    series_uid = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)

    study = relationship("DICOMStudy")
