from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.rbac import require_superuser
from app.schemas.user import UserCreate, UserRead
from app.services import user_service
from app.models import User

router = APIRouter()


@router.get("/", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_superuser)):
    users = db.query(User).all()
    return users


@router.post("/", response_model=UserRead)
def create_user(user_in: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_superuser)):
    user = user_service.create_user(db, user_in)
    return user
