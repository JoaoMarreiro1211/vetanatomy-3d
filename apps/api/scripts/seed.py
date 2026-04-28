import base64
from datetime import date

from app.db.database import SessionLocal
from app.models import (
    AnatomicalAnnotation,
    AnatomicalModelTemplate,
    AnatomicalRegion,
    Attachment,
    ClinicalReminder,
    DICOMSeries,
    DICOMStudy,
    ImagingFinding,
    Patient,
    Role,
    Species,
    SpeciesGroup,
    SurgicalPlan,
    Tutor,
    User,
)
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

DEMO_IMAGE = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
)

DEMO_CASES = [
    {
        "record_number": "APRES-001",
        "name": "Thor",
        "species": "dog",
        "sex": "Macho",
        "weight": 28.4,
        "birth_date": date(2019, 4, 12),
        "modality": "RX",
        "study": "Radiografia toracica e coluna cervical",
        "series": "Laterolateral direita e ventrodorsal",
        "finding": "Discreta opacidade bronquial difusa, sem sinais de fratura. Dor cervical compativel com contratura muscular.",
        "annotations": [
            ("coluna cervical", "moderate", {"x": -0.18, "y": 0.42, "z": 0.08}, "Dor a palpacao em regiao cervical media."),
            ("torax", "mild", {"x": 0.22, "y": 0.18, "z": 0.12}, "Padrao bronquial leve para acompanhamento."),
        ],
        "plan": ("Coluna cervical", "Controle de dor e reavaliacao neurologica", "Moderado", "Analgesia multimodal por 5 dias, repouso relativo, retorno em 7 dias ou antes se houver ataxia."),
    },
    {
        "record_number": "APRES-002",
        "name": "Maya",
        "species": "cat",
        "sex": "Femea",
        "weight": 4.1,
        "birth_date": date(2021, 9, 3),
        "modality": "US",
        "study": "Ultrassonografia abdominal",
        "series": "Abdomen completo",
        "finding": "Bexiga com discreto sedimento ecogenico. Rins preservados, sem dilatacao pielica.",
        "annotations": [
            ("abdomen caudal", "moderate", {"x": 0.12, "y": -0.22, "z": 0.18}, "Sensibilidade em abdomen caudal."),
            ("trato urinario", "mild", {"x": -0.08, "y": -0.3, "z": 0.2}, "Suspeita de cistite inicial."),
        ],
        "plan": ("Bexiga", "Investigar cistite e controlar dor", "Baixo", "Urinalise, analgesia, aumento de ingestao hidrica e retorno com resultado em 48h."),
    },
    {
        "record_number": "APRES-003",
        "name": "Estrela",
        "species": "horse",
        "sex": "Femea",
        "weight": 482.0,
        "birth_date": date(2016, 11, 20),
        "modality": "RX",
        "study": "Radiografia de membro toracico esquerdo",
        "series": "Carpo e boleto",
        "finding": "Aumento discreto de partes moles periarticulares, sem linha de fratura evidente.",
        "annotations": [
            ("membro toracico esquerdo", "severe", {"x": -0.42, "y": -0.18, "z": 0.22}, "Claudicacao grau 3/5 apos treino."),
            ("carpo", "moderate", {"x": -0.48, "y": -0.28, "z": 0.1}, "Edema periarticular e calor local."),
        ],
        "plan": ("Carpo esquerdo", "Reduzir inflamacao e descartar lesao ligamentar", "Alto", "Repouso em baia, crioterapia, anti-inflamatorio conforme avaliacao, ultrassom de tendao em 72h."),
    },
    {
        "record_number": "APRES-004",
        "name": "Bela",
        "species": "cattle",
        "sex": "Femea",
        "weight": 612.0,
        "birth_date": date(2020, 2, 15),
        "modality": "US",
        "study": "Ultrassonografia reprodutiva",
        "series": "Utero e ovarios",
        "finding": "Conteudo uterino discreto e espessamento endometrial, sugestivo de endometrite leve.",
        "annotations": [
            ("pelve", "moderate", {"x": 0.3, "y": -0.35, "z": 0.14}, "Historico de retencao placentaria recente."),
            ("abdomen", "mild", {"x": 0.05, "y": -0.12, "z": 0.3}, "Apetite preservado, queda leve de producao."),
        ],
        "plan": ("Utero", "Controle de endometrite pos-parto", "Moderado", "Protocolo uterino conforme exame clinico, monitorar temperatura e producao, reavaliar em 10 dias."),
    },
    {
        "record_number": "APRES-005",
        "name": "Nina",
        "species": "rabbit",
        "sex": "Femea",
        "weight": 2.3,
        "birth_date": date(2022, 6, 8),
        "modality": "RX",
        "study": "Radiografia craniana e odontologica",
        "series": "Cranio lateral",
        "finding": "Alongamento discreto de raizes dentarias molares, sem abscesso evidente.",
        "annotations": [
            ("cabeca", "moderate", {"x": 0.18, "y": 0.5, "z": 0.05}, "Sialorreia e reducao de ingestao de feno."),
            ("mandibula", "moderate", {"x": 0.22, "y": 0.45, "z": -0.08}, "Pontas dentarias suspeitas em molares."),
        ],
        "plan": ("Arcada dentaria", "Correcao odontologica e suporte alimentar", "Moderado", "Ajuste dentario sob sedacao, analgesia, dieta assistida e controle de peso diario."),
    },
    {
        "record_number": "APRES-006",
        "name": "Kiwi",
        "species": "pet_bird",
        "sex": "Macho",
        "weight": 0.09,
        "birth_date": date(2023, 1, 17),
        "modality": "RX",
        "study": "Radiografia celomatica",
        "series": "Ventrodorsal e lateral",
        "finding": "Sacos aereos discretamente opacificados, sem alteracao ossea evidente.",
        "annotations": [
            ("torax", "moderate", {"x": 0.1, "y": 0.2, "z": 0.38}, "Respiracao com esforco apos manejo."),
            ("sacos aereos", "mild", {"x": -0.16, "y": 0.16, "z": 0.32}, "Suspeita de aerossaculite inicial."),
        ],
        "plan": ("Sistema respiratorio", "Estabilizar respiracao e investigar infeccao", "Alto", "Oxigenioterapia se necessario, nebulizacao, cultura quando indicada e retorno em 48h."),
    },
    {
        "record_number": "APRES-007",
        "name": "Lola",
        "species": "goat",
        "sex": "Femea",
        "weight": 38.0,
        "birth_date": date(2021, 3, 29),
        "modality": "US",
        "study": "Ultrassom abdominal de pequeno ruminante",
        "series": "Rumen e flanco direito",
        "finding": "Motilidade ruminal reduzida e conteudo heterogeneo, sem liquido livre significativo.",
        "annotations": [
            ("rumen", "moderate", {"x": -0.28, "y": -0.1, "z": 0.28}, "Hipomotilidade ruminal e inapetencia."),
            ("flanco esquerdo", "mild", {"x": -0.35, "y": -0.18, "z": 0.2}, "Distensao discreta."),
        ],
        "plan": ("Rumen", "Restabelecer motilidade digestiva", "Moderado", "Fluidoterapia oral, transfaunacao quando indicada, ajuste alimentar e acompanhamento de fezes."),
    },
    {
        "record_number": "APRES-008",
        "name": "Yoshi",
        "species": "reptile",
        "sex": "Macho",
        "weight": 1.8,
        "birth_date": date(2018, 12, 5),
        "modality": "RX",
        "study": "Radiografia de casco e membros",
        "series": "Dorsoventral",
        "finding": "Mineralizacao ossea preservada. Discreto aumento de partes moles em membro pelvico direito.",
        "annotations": [
            ("membro pelvico direito", "moderate", {"x": 0.36, "y": -0.32, "z": 0.18}, "Edema apos trauma em terrario."),
            ("casco", "mild", {"x": 0.0, "y": 0.05, "z": 0.42}, "Inspecao de casco sem fissuras profundas."),
        ],
        "plan": ("Membro pelvico direito", "Controle de trauma e suporte ambiental", "Baixo", "Restricao de escalada, analgesia, substrato macio, reavaliacao radiografica se piora."),
    },
]

REMINDER_BY_SPECIES = {
    "dog": ("Reavaliacao ortopedica", "follow_up", "normal"),
    "cat": ("Retorno com urinalise", "lab", "normal"),
    "horse": ("Ultrassom de tendao", "imaging", "high"),
    "cattle": ("Reavaliacao reprodutiva", "follow_up", "normal"),
    "rabbit": ("Controle odontologico", "procedure", "high"),
    "pet_bird": ("Reavaliacao respiratoria", "follow_up", "high"),
    "goat": ("Controle de motilidade ruminal", "follow_up", "normal"),
    "reptile": ("Revisao de trauma e manejo", "follow_up", "normal"),
}


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

        species_by_name = {species.name: species for species in db.query(Species).all()}
        for case in DEMO_CASES:
            species = species_by_name.get(case["species"])
            patient = db.query(Patient).filter(Patient.record_number == case["record_number"]).first()
            if not patient:
                patient = Patient(
                    name=case["name"],
                    species_id=species.id if species else None,
                    sex=case["sex"],
                    weight=case["weight"],
                    birth_date=case["birth_date"],
                    record_number=case["record_number"],
                    owner_id=tutor.id,
                )
                db.add(patient)
                db.commit()
                db.refresh(patient)

            if not db.query(AnatomicalAnnotation).filter(AnatomicalAnnotation.patient_id == patient.id).first():
                for annotation_type, severity, coordinates, notes in case["annotations"]:
                    db.add(
                        AnatomicalAnnotation(
                            patient_id=patient.id,
                            geometry={"type": "point", "coordinates": coordinates},
                            annotation_type=annotation_type,
                            severity=severity,
                            notes=notes,
                            created_by=1,
                        )
                    )
                db.commit()

            study_uid = f"{case['record_number']}-DEMO-STUDY"
            study = db.query(DICOMStudy).filter(DICOMStudy.study_uid == study_uid).first()
            if not study:
                attachment = Attachment(
                    patient_id=patient.id,
                    filename=f"{case['record_number'].lower()}-imagem.png",
                    url="",
                    file_data=DEMO_IMAGE,
                    content_type="image/png",
                    size_bytes=len(DEMO_IMAGE),
                    category="diagnostic_image",
                    uploaded_by=1,
                )
                db.add(attachment)
                db.commit()
                db.refresh(attachment)
                attachment.url = f"/api/v1/attachments/{attachment.id}/content"
                db.add(attachment)
                db.commit()

                study = DICOMStudy(
                    patient_id=patient.id,
                    study_uid=study_uid,
                    description=case["study"],
                    modality=case["modality"],
                    file_url=attachment.url,
                )
                db.add(study)
                db.commit()
                db.refresh(study)

            series_uid = f"{case['record_number']}-DEMO-SERIES"
            series = db.query(DICOMSeries).filter(DICOMSeries.series_uid == series_uid).first()
            if not series:
                series = DICOMSeries(study_id=study.id, series_uid=series_uid, description=case["series"])
                db.add(series)
                db.commit()
                db.refresh(series)

            if not db.query(ImagingFinding).filter(ImagingFinding.series_id == series.id).first():
                first_annotation = (
                    db.query(AnatomicalAnnotation)
                    .filter(AnatomicalAnnotation.patient_id == patient.id)
                    .order_by(AnatomicalAnnotation.id.asc())
                    .first()
                )
                db.add(
                    ImagingFinding(
                        series_id=series.id,
                        annotation_id=first_annotation.id if first_annotation else None,
                        findings={
                            "summary": case["finding"],
                            "recommendation": case["plan"][1],
                            "priority": case["plan"][2],
                        },
                    )
                )
                db.commit()

            if not db.query(SurgicalPlan).filter(SurgicalPlan.patient_id == patient.id).first():
                structure, objective, risk, steps = case["plan"]
                db.add(
                    SurgicalPlan(
                        patient_id=patient.id,
                        structure=structure,
                        plan={
                            "objective": objective,
                            "risk": risk,
                            "steps": steps,
                            "presentation_notes": "Caso demonstrativo criado para apresentacao do VetAnatomy 3D.",
                        },
                        created_by=1,
                    )
                )
                db.commit()

            if not db.query(ClinicalReminder).filter(ClinicalReminder.patient_id == patient.id).first():
                title, reminder_type, priority = REMINDER_BY_SPECIES.get(case["species"], ("Retorno clinico", "follow_up", "normal"))
                db.add(
                    ClinicalReminder(
                        patient_id=patient.id,
                        title=title,
                        reminder_type=reminder_type,
                        due_date=date(2026, 4, 28),
                        priority=priority,
                        notes=f"Pendencia demonstrativa vinculada ao caso {case['record_number']}.",
                        created_by=1,
                    )
                )
                db.commit()

        print("Seed completed")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
