from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class SpeciesGroupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    description: Optional[str] = None
    workflow_profile: Optional[dict[str, Any]] = None
    clinical_defaults: Optional[dict[str, Any]] = None
    imaging_compatibility: Optional[dict[str, Any]] = None


class SpeciesRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    common_name: Optional[str] = None
    scientific_name: Optional[str] = None
    group_id: Optional[int] = None
    is_active: bool = True
    group: Optional[SpeciesGroupRead] = None
    profile_extensions: Optional[dict[str, Any]] = None
    clinical_form_schema: Optional[dict[str, Any]] = None


class AnatomicalRegionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    template_id: int
    code: str
    name: str
    parent_code: Optional[str] = None
    region_type: str
    metadata_json: Optional[dict[str, Any]] = None


class AnatomicalModelTemplateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    species_id: Optional[int] = None
    species_group_id: Optional[int] = None
    asset_url: Optional[str] = None
    preview_url: Optional[str] = None
    fallback_shape: str
    regions_map: Optional[dict[str, Any]] = None
    defaults: Optional[dict[str, Any]] = None
    is_active: bool = True
    regions: list[AnatomicalRegionRead] = []
