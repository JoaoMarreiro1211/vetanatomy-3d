from app.core.config import settings
from app.models import User


def test_users_endpoint_requires_superuser(client):
    payload = {"email": "normal@example.com", "password": "secret123", "full_name": "Normal User"}
    client.post(f"{settings.API_V1_STR}/auth/register", json=payload)
    login = client.post(f"{settings.API_V1_STR}/auth/login", data={"username": payload["email"], "password": payload["password"]})
    token = login.json()["access_token"]

    response = client.get(f"{settings.API_V1_STR}/users/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_users_endpoint_allows_superuser(client, db_session):
    payload = {"email": "admin@example.com", "password": "secret123", "full_name": "Admin User"}
    client.post(f"{settings.API_V1_STR}/auth/register", json=payload)
    user = db_session.query(User).filter(User.email == payload["email"]).first()
    user.is_superuser = True
    db_session.add(user)
    db_session.commit()

    login = client.post(f"{settings.API_V1_STR}/auth/login", data={"username": payload["email"], "password": payload["password"]})
    token = login.json()["access_token"]

    response = client.get(f"{settings.API_V1_STR}/users/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
