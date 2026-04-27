from datetime import timedelta
from typing import Optional
import secrets

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.utils.time import utc_now

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_tokens(db, user):
    now = utc_now()
    access_payload = {
        "sub": str(user.id),
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm="HS256")

    # create refresh token with jti and persist
    jti = secrets.token_urlsafe(16)
    refresh_payload = {"sub": str(user.id), "jti": jti, "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)}
    refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm="HS256")

    # persist refresh token record
    from app.models import RefreshToken

    expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    rt = RefreshToken(jti=jti, user_id=user.id, expires_at=expires_at)
    db.add(rt)
    db.commit()
    db.refresh(rt)

    return {"access_token": access_token, "refresh_token": refresh_token}


def authenticate_user(db, email: str, password: str):
    from app.services.user_service import get_user_by_email as _get

    user = _get(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def verify_refresh_token(db, token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get('sub')
        jti = payload.get('jti')
        from app.models import RefreshToken, User

        if not jti:
            return None
        rt = db.query(RefreshToken).filter(RefreshToken.jti == jti, RefreshToken.revoked == False).first()
        if not rt:
            return None
        # check expiry
        if rt.expires_at < utc_now():
            return None
        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None


def revoke_refresh_token(db, token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        jti = payload.get('jti')
        from app.models import RefreshToken

        if not jti:
            return False
        rt = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
        if not rt:
            return False
        rt.revoked = True
        db.add(rt)
        db.commit()
        return True
    except Exception:
        return False


def create_password_reset_token(user):
    now = utc_now()
    payload = {"sub": str(user.id), "exp": now + timedelta(hours=2)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def verify_password_reset_token(db, token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get('sub')
        from app.models import User

        return db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        return None
