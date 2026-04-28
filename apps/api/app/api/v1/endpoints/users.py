from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.rbac import require_superuser
from app.schemas.user import AdminUserCreate, AdminUserUpdate, UserRead
from app.services.auth_service import get_password_hash
from app.services import user_service
from app.models import User

router = APIRouter()


@router.get("/", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_superuser)):
    users = db.query(User).all()
    return users


@router.post("/", response_model=UserRead)
def create_user(user_in: AdminUserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_superuser)):
    user = user_service.create_user(db, user_in)
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, user_in: AdminUserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_superuser)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = user_in.model_dump(exclude_unset=True)
    if "email" in data and data["email"] != user.email:
        existing = user_service.get_user_by_email(db, data["email"])
        if existing and existing.id != user.id:
            raise HTTPException(status_code=409, detail="Email already registered")
        user.email = data["email"]
    if "full_name" in data:
        user.full_name = data["full_name"]
    if "password" in data and data["password"]:
        user.hashed_password = get_password_hash(data["password"])
    if "is_active" in data:
        user.is_active = data["is_active"]
    if "is_superuser" in data:
        if user.id == current_user.id and data["is_superuser"] is False:
            raise HTTPException(status_code=400, detail="Cannot remove your own administrator access")
        user.is_superuser = data["is_superuser"]
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=UserRead)
def deactivate_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_superuser)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
