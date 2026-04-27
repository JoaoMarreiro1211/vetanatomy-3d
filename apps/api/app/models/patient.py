from sqlalchemy import Column, Integer, String, ForeignKey, Float, Date
from sqlalchemy.orm import relationship

from app.db.base import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    species_id = Column(Integer, ForeignKey("species.id"))
    breed_id = Column(Integer, ForeignKey("breeds.id"))
    sex = Column(String, nullable=True)
    weight = Column(Float, nullable=True)
    birth_date = Column(Date, nullable=True)
    record_number = Column(String, unique=True, index=True)
    owner_id = Column(Integer, ForeignKey("tutors.id"))

    species = relationship("Species")
    breed = relationship("Breed")
    owner = relationship("Tutor")

    @property
    def species_name(self):
        if not self.species:
            return None
        return self.species.common_name or self.species.name

    @property
    def species_group(self):
        return self.species.group.code if self.species and self.species.group else None

    @property
    def species_group_label(self):
        return self.species.group.name if self.species and self.species.group else None
