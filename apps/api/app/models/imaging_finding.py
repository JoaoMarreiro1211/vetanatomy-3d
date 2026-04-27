from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils.time import utc_now


class ImagingFinding(Base):
    __tablename__ = "imaging_findings"

    id = Column(Integer, primary_key=True, index=True)
    series_id = Column(Integer, ForeignKey("dicom_series.id"))
    annotation_id = Column(Integer, ForeignKey("anatomical_annotations.id"), nullable=True)
    findings = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    series = relationship("DICOMSeries")
    annotation = relationship("AnatomicalAnnotation")
