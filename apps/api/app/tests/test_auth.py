from app.core.config import settings


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200


def test_register_and_login(client):
    payload = {"email": "testuser@example.com", "password": "secret123", "full_name": "Test User"}
    r = client.post(f"{settings.API_V1_STR}/auth/register", json=payload)
    assert r.status_code in (200, 201)
    assert r.json().get("email") == payload["email"]

    login_data = {"username": payload["email"], "password": payload["password"]}
    r2 = client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    assert r2.status_code == 200
    assert "access_token" in r2.json()
