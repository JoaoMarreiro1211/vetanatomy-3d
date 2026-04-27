import pytest
from app.core.config import settings


@pytest.fixture
def user_payload():
    return {"email": "testuser@example.com", "password": "secret123", "full_name": "Test User"}


def test_register_login_refresh_logout(client, user_payload):
    # register
    r = client.post(f"{settings.API_V1_STR}/auth/register", json=user_payload)
    assert r.status_code == 200
    # login (should set cookie)
    r = client.post(f"{settings.API_V1_STR}/auth/login", data={"username": user_payload['email'], "password": user_payload['password']})
    assert r.status_code == 200
    data = r.json()
    assert 'access_token' in data
    # cookie should be present
    assert 'set-cookie' in r.headers
    # call refresh to test rotation
    r2 = client.post(f"{settings.API_V1_STR}/auth/refresh")
    assert r2.status_code == 200
    data2 = r2.json()
    assert 'access_token' in data2
    # logout clears cookie
    r3 = client.post(f"{settings.API_V1_STR}/auth/logout")
    assert r3.status_code == 200
    # after logout, refresh should fail
    r4 = client.post(f"{settings.API_V1_STR}/auth/refresh")
    assert r4.status_code == 401
