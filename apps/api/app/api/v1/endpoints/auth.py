from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response, Cookie
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserCreate, UserRead
from app.services import auth_service, user_service
from app.services import email_service
from pydantic import BaseModel
from app.core.config import settings


class PasswordResetRequest(BaseModel):
    token: str
    new_password: str


class PasswordResetRequestEmail(BaseModel):
    email: str

router = APIRouter()


@router.post("/login")
async def login(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    tokens = auth_service.create_tokens(db, user)
    # set refresh token in httpOnly secure cookie
    response.set_cookie(
        "refresh_token",
        tokens["refresh_token"],
        httponly=True,
        secure=settings.REFRESH_TOKEN_COOKIE_SECURE,
        samesite=settings.REFRESH_TOKEN_COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    )
    return {"access_token": tokens["access_token"], "token_type": "bearer"}


@router.post("/refresh")
def refresh_token(response: Response, refresh_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    token_record_user = auth_service.verify_refresh_token(db, refresh_token)
    if not token_record_user:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    # revoke old refresh token
    try:
        auth_service.revoke_refresh_token(db, refresh_token)
    except Exception:
        pass
    tokens = auth_service.create_tokens(db, token_record_user)
    # rotate refresh token cookie
    response.set_cookie(
        "refresh_token",
        tokens["refresh_token"],
        httponly=True,
        secure=settings.REFRESH_TOKEN_COOKIE_SECURE,
        samesite=settings.REFRESH_TOKEN_COOKIE_SAMESITE,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    )
    return {"access_token": tokens["access_token"], "token_type": "bearer"}


@router.post('/logout')
def logout(response: Response, refresh_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    # revoke refresh token if present and clear cookie
    if refresh_token:
        try:
            auth_service.revoke_refresh_token(db, refresh_token)
        except Exception:
            pass
    response.delete_cookie('refresh_token')
    return {"ok": True}


@router.post("/register", response_model=UserRead)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    user = user_service.create_user(db, user_in)
    return user


@router.post('/password-reset-request')
def password_reset_request(payload: PasswordResetRequestEmail, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # create token and send email (background)
    user = user_service.get_user_by_email(db, payload.email)
    if not user:
        return {"ok": True}
    token = auth_service.create_password_reset_token(user)
    background_tasks.add_task(email_service.send_password_reset, user.email, token)
    return {"ok": True}


@router.post('/password-reset')
def password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = auth_service.verify_password_reset_token(db, payload.token)
    if not user:
        raise HTTPException(status_code=400, detail='Invalid or expired token')
    user.hashed_password = auth_service.get_password_hash(payload.new_password)
    db.add(user)
    db.commit()
    return {"ok": True}
