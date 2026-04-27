from datetime import date

from app.db.database import SessionLocal
from app.models import AnatomicalModelTemplate, AnatomicalRegion, Patient, Role, Species, SpeciesGroup, Tutor, User
from app.services.auth_service import get_password_hash


SPECIES_GROUPS = [
    ("small_animals", "Pequenos animais", "Rotina clinica de caes, gatos e mamiferos pequenos de companhia.", "quadruped"),
    ("equine", "Equinos", "Atendimento de equinos de esporte, trabalho e lazer.", "large_quadruped"),
    ("bovine", "Bovinos", "Clinica, producao e manejo de bovinos.", "large_quadruped"),
    ("swine", "Suinos", "Clinica e producao de suinos.", "large_quadruped"),
    ("small_ruminants", "Pequenos ruminantes", "Ovinos, caprinos e rotinas de rebanho.", "ruminant"),
    ("avian", "Aves", "Aves pets e especies aviarias comuns.", "avian"),
    ("exotics", "Exoticos", "Repteis, furoes, roedores e outros exoticos.", "exotic"),
]

SPECIES = [
    ("dog", "Cao", "Canis lupus familiaris", "small_animals"),
    ("cat", "Gato", "Felis catus", "small_animals"),
    ("rabbit", "Coelho", "Oryctolagus cuniculus", "small_animals"),
    ("guinea_pig", "Porquinho-da-india", "Cavia porcellus", "small_animals"),
    ("hamster", "Hamster", "Cricetinae", "small_animals"),
    ("chinchilla", "Chinchila", "Chinchilla lanigera", "small_animals"),
    ("ferret", "Furao", "Mustela putorius furo", "exotics"),
    ("small_rodent", "Pequeno roedor", None, "exotics"),
    ("pet_bird", "Ave pet comum", None, "avian"),
    ("reptile", "Reptil comum", None, "exotics"),
    ("cattle", "Bovino", "Bos taurus", "bovine"),
    ("horse", "Equino", "Equus caballus", "equine"),
    ("pig", "Suino", "Sus scrofa domesticus", "swine"),
    ("sheep", "Ovino", "Ovis aries", "small_ruminants"),
    ("goat", "Caprino", "Capra hircus", "small_ruminants"),
    ("buffalo", "Bubalino", "Bubalus bubalis", "bovine"),
    ("donkey", "Asinino", "Equus asinus", "equine"),
    ("mule", "Muar", None, "equine"),
    ("camelid", "Camelideo", None, "exotics"),
]


def seed() -> None:
    db = SessionLocal()
    try:
        for role_name in ["admin", "vet", "nurse"]:
            if not db.query(Role).filter(Role.name == role_name).first():
                db.add(Role(name=role_name))
        db.commit()

        admin_email = "admin@vetanatomy.local"
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not db.query(User).filter(User.email == admin_email).first():
            db.add(
                User(
                    email=admin_email,
                    full_name="Admin",
                    hashed_password=get_password_hash("adminpass"),
                    is_superuser=True,
                    role_id=admin_role.id if admin_role else None,
                )
            )
            db.commit()

        group_by_code: dict[str, SpeciesGroup] = {}
        for code, name, description, fallback_shape in SPECIES_GROUPS:
            group = db.query(SpeciesGroup).filter(SpeciesGroup.code == code).first()
            if not group:
                group = SpeciesGroup(
                    code=code,
                    name=name,
                    description=description,
                    workflow_profile={"triage": True, "hospitalization": True, "herd_context": code in {"bovine", "swine", "small_ruminants"}},
                    clinical_defaults={"weight_unit": "kg", "temperature_unit": "celsius", "fallback_shape": fallback_shape},
                    imaging_compatibility={"rx": True, "ultrasound": True, "dicom": True},
                )
                db.add(group)
                db.flush()
            group_by_code[code] = group
        db.commit()

        for code, common_name, scientific_name, group_code in SPECIES:
            species = db.query(Species).filter(Species.name == code).first()
            group = group_by_code[group_code]
            if not species:
                db.add(
                    Species(
                        name=code,
                        common_name=common_name,
                        scientific_name=scientific_name,
                        group_id=group.id,
                        profile_extensions={"supports_breed": group_code in {"small_animals", "equine", "bovine", "swine", "small_ruminants"}},
                        clinical_form_schema={"fields": ["chief_complaint", "weight", "body_condition_score", "temperature"]},
                    )
                )
            else:
                species.common_name = common_name
                species.scientific_name = scientific_name
                species.group_id = group.id
                species.is_active = True
        db.commit()

        legacy_aliases = {
            "Dog": ("Cao", "Canis lupus familiaris", "small_animals"),
            "Cat": ("Gato", "Felis catus", "small_animals"),
        }
        for legacy_name, (common_name, scientific_name, group_code) in legacy_aliases.items():
            legacy = db.query(Species).filter(Species.name == legacy_name).first()
            if legacy:
                legacy.common_name = common_name
                legacy.scientific_name = scientific_name
                legacy.group_id = group_by_code[group_code].id
                legacy.is_active = False
        db.commit()

        for group_code, group in group_by_code.items():
            template_code = f"{group_code}_default"
            template = db.query(AnatomicalModelTemplate).filter(AnatomicalModelTemplate.code == template_code).first()
            if not template:
                template = AnatomicalModelTemplate(
                    code=template_code,
                    name=f"Template padrao - {group.name}",
                    species_group_id=group.id,
                    fallback_shape=group.clinical_defaults.get("fallback_shape", "quadruped") if group.clinical_defaults else "quadruped",
                    regions_map={"head": "Cabeca", "thorax": "Torax", "abdomen": "Abdomen", "limbs": "Membros"},
                    defaults={"camera": "clinical_orbit", "marker_mode": "surface"},
                )
                db.add(template)
                db.flush()
                for region_code, region_name in template.regions_map.items():
                    db.add(AnatomicalRegion(template_id=template.id, code=region_code, name=region_name, region_type="surface"))
        db.commit()

        tutor = db.query(Tutor).filter(Tutor.email == "owner@example.com").first()
        if not tutor:
            tutor = Tutor(name="Sample Tutor", phone="+5511999999999", email="owner@example.com")
            db.add(tutor)
            db.commit()
            db.refresh(tutor)

        dog = db.query(Species).filter(Species.name == "dog").first()
        if not db.query(Patient).filter(Patient.record_number == "VET-0001").first():
            db.add(
                Patient(
                    name="Rex",
                    species_id=dog.id if dog else None,
                    sex="Macho",
                    weight=12.5,
                    birth_date=date(2020, 1, 1),
                    record_number="VET-0001",
                    owner_id=tutor.id,
                )
            )
            db.commit()

        print("Seed completed")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
