from datetime import timedelta

from app.services import auth_service, user_service
from app.schemas.user import UserCreate
from app.utils.time import utc_now


def test_refresh_token_lifecycle(db_session):
    # create user
    user_in = UserCreate(email="auth1@example.com", password="pass123", full_name="Auth User")
    user = user_service.create_user(db_session, user_in)

    # create tokens and persist refresh token
    tokens = auth_service.create_tokens(db_session, user)
    assert "access_token" in tokens and "refresh_token" in tokens

    # verify refresh token works
    verified = auth_service.verify_refresh_token(db_session, tokens["refresh_token"])
    assert verified is not None
    assert verified.id == user.id

    # revoke and ensure it no longer verifies
    revoked = auth_service.revoke_refresh_token(db_session, tokens["refresh_token"])
    assert revoked is True
    verified_after = auth_service.verify_refresh_token(db_session, tokens["refresh_token"])
    assert verified_after is None


def test_refresh_token_rotation_and_expiry(db_session):
    user_in = UserCreate(email="auth2@example.com", password="pass123", full_name="Auth User 2")
    user = user_service.create_user(db_session, user_in)

    t1 = auth_service.create_tokens(db_session, user)
    rt1 = t1["refresh_token"]

    # rotate: create new tokens (this should create a new refresh token record)
    t2 = auth_service.create_tokens(db_session, user)
    rt2 = t2["refresh_token"]
    assert rt1 != rt2
    assert auth_service.verify_refresh_token(db_session, rt2) is not None

    # manually expire the token record in DB and ensure verification fails
    from app.models import RefreshToken

    # find record by jti from decoded token
    payload = auth_service.jwt.decode(rt2, auth_service.settings.SECRET_KEY, algorithms=["HS256"])  # type: ignore
    jti = payload.get("jti")
    assert jti is not None
    rt_record = db_session.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    assert rt_record is not None
    rt_record.expires_at = utc_now() - timedelta(days=1)
    db_session.add(rt_record)
    db_session.commit()

    assert auth_service.verify_refresh_token(db_session, rt2) is None
