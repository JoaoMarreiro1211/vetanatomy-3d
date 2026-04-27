from app.core.config import settings
from app.models import User
from app.services import auth_service


def test_password_reset_flow(client, db_session):
    payload = {"email": "prtest@example.com", "password": "OldPass123", "full_name": "PR Test"}
    r = client.post(f"{settings.API_V1_STR}/auth/register", json=payload)
    assert r.status_code in (200, 201)

    user = db_session.query(User).filter(User.email == payload["email"]).first()
    assert user is not None

    token = auth_service.create_password_reset_token(user)
    r2 = client.post(f"{settings.API_V1_STR}/auth/password-reset", json={"token": token, "new_password": "NewPass456"})
    assert r2.status_code == 200

    r3 = client.post(f"{settings.API_V1_STR}/auth/login", data={"username": payload["email"], "password": "NewPass456"})
    assert r3.status_code == 200
    assert "access_token" in r3.json()
