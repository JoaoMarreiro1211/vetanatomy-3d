from app.core.config import settings
from app.models import AnatomicalModelTemplate, AnatomicalRegion, Species, SpeciesGroup


def test_species_groups_species_and_templates_are_filterable(client, db_session):
    group = SpeciesGroup(code="equine", name="Equinos", clinical_defaults={"fallback_shape": "large_quadruped"})
    db_session.add(group)
    db_session.flush()
    species = Species(name="horse", common_name="Equino", scientific_name="Equus caballus", group_id=group.id)
    db_session.add(species)
    db_session.flush()
    template = AnatomicalModelTemplate(
        code="equine_default",
        name="Template padrao - Equinos",
        species_group_id=group.id,
        fallback_shape="large_quadruped",
        regions_map={"head": "Cabeca"},
    )
    db_session.add(template)
    db_session.flush()
    db_session.add(AnatomicalRegion(template_id=template.id, code="head", name="Cabeca"))
    db_session.commit()

    groups_response = client.get(f"{settings.API_V1_STR}/species/groups")
    assert groups_response.status_code == 200
    assert groups_response.json()[0]["code"] == "equine"

    species_response = client.get(f"{settings.API_V1_STR}/species/?group=equine")
    assert species_response.status_code == 200
    assert species_response.json()[0]["common_name"] == "Equino"

    templates_response = client.get(f"{settings.API_V1_STR}/species/anatomical-templates?group=equine")
    assert templates_response.status_code == 200
    payload = templates_response.json()[0]
    assert payload["fallback_shape"] == "large_quadruped"
    assert payload["regions"][0]["code"] == "head"


def test_patients_include_species_group_metadata(client, db_session):
    group = SpeciesGroup(code="avian", name="Aves")
    db_session.add(group)
    db_session.flush()
    species = Species(name="pet_bird", common_name="Ave pet comum", group_id=group.id)
    db_session.add(species)
    db_session.commit()

    patient_response = client.post(
        f"{settings.API_V1_STR}/patients/",
        json={"name": "Kiwi", "record_number": "AV-001", "species_id": species.id},
    )
    assert patient_response.status_code == 200
    patient = patient_response.json()
    assert patient["species_name"] == "Ave pet comum"
    assert patient["species_group"] == "avian"

    filtered_response = client.get(f"{settings.API_V1_STR}/patients/?group=avian")
    assert filtered_response.status_code == 200
    assert filtered_response.json()[0]["record_number"] == "AV-001"
