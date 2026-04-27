from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models import AnatomicalModelTemplate, Species, SpeciesGroup
from app.schemas.species import AnatomicalModelTemplateRead, SpeciesGroupRead, SpeciesRead

router = APIRouter()


@router.get("/groups", response_model=list[SpeciesGroupRead])
def list_species_groups(db: Session = Depends(get_db)):
    return db.query(SpeciesGroup).order_by(SpeciesGroup.name.asc()).all()


@router.get("/", response_model=list[SpeciesRead])
def list_species(
    group: str | None = Query(default=None, description="Filter by species group code"),
    active: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    query = db.query(Species).options(joinedload(Species.group)).order_by(Species.common_name.asc(), Species.name.asc())
    if active:
        query = query.filter(Species.is_active.is_(True))
    if group:
        query = query.join(SpeciesGroup).filter(SpeciesGroup.code == group)
    return query.all()


@router.get("/anatomical-templates", response_model=list[AnatomicalModelTemplateRead])
def list_anatomical_templates(
    species_id: int | None = Query(default=None),
    group: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(AnatomicalModelTemplate).options(joinedload(AnatomicalModelTemplate.regions))
    if species_id:
        query = query.filter(AnatomicalModelTemplate.species_id == species_id)
    if group:
        query = query.join(SpeciesGroup, AnatomicalModelTemplate.species_group_id == SpeciesGroup.id).filter(SpeciesGroup.code == group)
    return query.order_by(AnatomicalModelTemplate.name.asc()).all()
