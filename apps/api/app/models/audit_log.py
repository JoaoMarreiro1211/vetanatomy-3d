from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils.time import utc_now


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    detail = Column(JSON, nullable=True)
    performed_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User")
