from sqlalchemy import Column, Integer, String, Boolean

from app.db.base import Base


class HospitalRoom(Base):
    __tablename__ = "hospital_rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_icu = Column(Boolean, default=False)
    capacity = Column(Integer, default=1)
