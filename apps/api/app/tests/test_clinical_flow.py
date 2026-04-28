from app.core.config import settings
from datetime import date


def test_patient_annotation_imaging_and_surgical_plan_flow(client):
    user_payload = {"email": "flow@example.com", "password": "secret123", "full_name": "Flow User"}
    client.post(f"{settings.API_V1_STR}/auth/register", json=user_payload)
    login = client.post(f"{settings.API_V1_STR}/auth/login", data={"username": user_payload["email"], "password": user_payload["password"]})
    auth_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    patient_payload = {
        "name": "Luna",
        "record_number": "VET-001",
        "sex": "Femea",
        "weight": 12.4,
    }
    patient_response = client.post(f"{settings.API_V1_STR}/patients/", json=patient_payload)
    assert patient_response.status_code == 200
    patient = patient_response.json()
    assert patient["name"] == "Luna"

    updated_patient = client.patch(f"{settings.API_V1_STR}/patients/{patient['id']}", json={"weight": 13.1})
    assert updated_patient.status_code == 200
    assert updated_patient.json()["weight"] == 13.1

    upload_response = client.post(
        f"{settings.API_V1_STR}/attachments/upload",
        data={"patient_id": str(patient["id"]), "category": "dicom"},
        files={"file": ("scan.dcm", b"DICM test payload", "application/dicom")},
        headers=auth_headers,
    )
    assert upload_response.status_code == 200
    attachment = upload_response.json()
    assert attachment["url"].startswith(f"{settings.API_V1_STR}/attachments/")

    file_response = client.get(attachment["url"])
    assert file_response.status_code == 200
    assert file_response.content == b"DICM test payload"
    head_response = client.head(attachment["url"])
    assert head_response.status_code == 200
    assert head_response.headers["content-type"].startswith("application/dicom")

    annotation_response = client.post(
        f"{settings.API_V1_STR}/annotations/",
        json={
            "patient_id": patient["id"],
            "geometry": {"type": "point", "coordinates": {"x": 0.2, "y": 0.1, "z": 0.3}},
            "annotation_type": "torax",
            "severity": "moderate",
            "notes": "Sensibilidade a palpacao.",
        },
    )
    assert annotation_response.status_code == 200

    study_response = client.post(
        f"{settings.API_V1_STR}/imaging/studies",
        json={
            "patient_id": patient["id"],
            "study_uid": "study-luna-001",
            "description": "Radiografia toracica",
            "modality": "RX",
            "file_url": attachment["url"],
        },
    )
    assert study_response.status_code == 200
    study = study_response.json()
    assert study["file_url"] == attachment["url"]

    series_response = client.post(
        f"{settings.API_V1_STR}/imaging/series",
        json={"study_id": study["id"], "series_uid": "series-luna-001", "description": "Lateral direita"},
    )
    assert series_response.status_code == 200
    series = series_response.json()

    finding_response = client.post(
        f"{settings.API_V1_STR}/imaging/findings",
        json={"series_id": series["id"], "findings": {"summary": "Sem alteracoes osseas evidentes."}},
    )
    assert finding_response.status_code == 200

    plan_response = client.post(
        f"{settings.API_V1_STR}/surgical-plans/",
        json={
            "patient_id": patient["id"],
            "structure": "Torax",
            "plan": {"objective": "Acompanhar evolucao", "risk": "Baixo", "steps": "Reavaliar em 7 dias"},
        },
    )
    assert plan_response.status_code == 200

    reminder_response = client.post(
        f"{settings.API_V1_STR}/reminders/",
        json={
            "patient_id": patient["id"],
            "title": "Retorno clinico",
            "reminder_type": "follow_up",
            "due_date": date(2026, 5, 5).isoformat(),
            "priority": "high",
            "notes": "Reavaliar dor e exame.",
        },
    )
    assert reminder_response.status_code == 200
    reminder = reminder_response.json()
    assert reminder["title"] == "Retorno clinico"

    assert len(client.get(f"{settings.API_V1_STR}/annotations/by_patient/{patient['id']}").json()) == 1
    assert len(client.get(f"{settings.API_V1_STR}/imaging/studies/by_patient/{patient['id']}").json()) == 1
    assert len(client.get(f"{settings.API_V1_STR}/imaging/findings/by_patient/{patient['id']}").json()) == 1
    assert len(client.get(f"{settings.API_V1_STR}/surgical-plans/by_patient/{patient['id']}").json()) == 1
    assert len(client.get(f"{settings.API_V1_STR}/reminders/by_patient/{patient['id']}").json()) == 1

    done = client.patch(f"{settings.API_V1_STR}/reminders/{reminder['id']}", json={"is_done": True})
    assert done.status_code == 200
    assert done.json()["is_done"] is True

    archived_patient = client.delete(f"{settings.API_V1_STR}/patients/{patient['id']}")
    assert archived_patient.status_code == 200
    assert archived_patient.json()["is_archived"] is True
    assert all(item["id"] != patient["id"] for item in client.get(f"{settings.API_V1_STR}/patients").json())


def test_clinical_records_reject_missing_parents(client):
    assert client.post(
        f"{settings.API_V1_STR}/annotations/",
        json={
            "patient_id": 999,
            "geometry": {"type": "point", "coordinates": {"x": 0, "y": 0, "z": 0}},
            "annotation_type": "note",
        },
    ).status_code == 404

    assert client.post(
        f"{settings.API_V1_STR}/imaging/studies",
        json={"patient_id": 999, "study_uid": "missing-patient"},
    ).status_code == 404

    assert client.post(
        f"{settings.API_V1_STR}/imaging/series",
        json={"study_id": 999, "series_uid": "missing-study"},
    ).status_code == 404

    assert client.post(
        f"{settings.API_V1_STR}/imaging/findings",
        json={"series_id": 999, "findings": {"summary": "invalid"}},
    ).status_code == 404

    assert client.post(
        f"{settings.API_V1_STR}/surgical-plans/",
        json={"patient_id": 999, "structure": "Torax"},
    ).status_code == 404

    assert client.post(
        f"{settings.API_V1_STR}/reminders/",
        json={
            "patient_id": 999,
            "title": "Retorno invalido",
            "reminder_type": "follow_up",
            "due_date": date(2026, 5, 5).isoformat(),
        },
    ).status_code == 404
