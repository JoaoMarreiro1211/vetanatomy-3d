from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("Invalid email")
        return normalized


class AdminUserCreate(UserCreate):
    is_superuser: bool = False


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool

