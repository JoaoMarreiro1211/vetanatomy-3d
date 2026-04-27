from fastapi import Depends, HTTPException

from app.core.security import get_current_user
from app.models import User


def require_roles(*roles: str):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role is None:
            raise HTTPException(status_code=403, detail="User has no role assigned")
        if current_user.role.name not in roles:
            raise HTTPException(status_code=403, detail=f"Insufficient permissions. Required roles: {', '.join(roles)}")
        return current_user

    return dependency


def require_superuser(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Superuser permission required")
    return current_user
