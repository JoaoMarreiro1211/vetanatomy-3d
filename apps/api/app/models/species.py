from sqlalchemy import Boolean, Column, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.db.base import Base


class SpeciesGroup(Base):
    __tablename__ = "species_groups"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    workflow_profile = Column(JSON, nullable=True)
    clinical_defaults = Column(JSON, nullable=True)
    imaging_compatibility = Column(JSON, nullable=True)

    species = relationship("Species", back_populates="group")
    anatomical_templates = relationship("AnatomicalModelTemplate", back_populates="species_group")


class Species(Base):
    __tablename__ = "species"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    common_name = Column(String, nullable=True)
    scientific_name = Column(String, nullable=True)
    group_id = Column(Integer, ForeignKey("species_groups.id"), nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    profile_extensions = Column(JSON, nullable=True)
    clinical_form_schema = Column(JSON, nullable=True)

    group = relationship("SpeciesGroup", back_populates="species")
    breeds = relationship("Breed", back_populates="species")
    anatomical_templates = relationship("AnatomicalModelTemplate", back_populates="species")


class AnatomicalModelTemplate(Base):
    __tablename__ = "anatomical_model_templates"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    species_id = Column(Integer, ForeignKey("species.id"), nullable=True, index=True)
    species_group_id = Column(Integer, ForeignKey("species_groups.id"), nullable=True, index=True)
    asset_url = Column(String, nullable=True)
    preview_url = Column(String, nullable=True)
    fallback_shape = Column(String, nullable=False, default="quadruped")
    regions_map = Column(JSON, nullable=True)
    defaults = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    species = relationship("Species", back_populates="anatomical_templates")
    species_group = relationship("SpeciesGroup", back_populates="anatomical_templates")
    regions = relationship("AnatomicalRegion", back_populates="template")


class AnatomicalRegion(Base):
    __tablename__ = "anatomical_regions"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("anatomical_model_templates.id"), nullable=False, index=True)
    code = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    parent_code = Column(String, nullable=True)
    region_type = Column(String, nullable=False, default="surface")
    metadata_json = Column(JSON, nullable=True)

    template = relationship("AnatomicalModelTemplate", back_populates="regions")
