import json
import secrets
from typing import Optional

from pydantic import AnyHttpUrl, field_validator, ValidationInfo
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    SERVER_NAME: str = "VetAnatomy API"
    SERVER_HOST: AnyHttpUrl = "http://localhost"
    PROJECT_NAME: str = "VetAnatomy 3D"

    # Accepts a JSON list, comma-separated values, or a single origin.
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,https://vetanatomy-3d.vercel.app"

    @property
    def cors_origins(self) -> list[str]:
        required_origins = {"https://vetanatomy-3d.vercel.app"}
        raw = self.BACKEND_CORS_ORIGINS.strip().replace('\\"', '"')
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                origins = [str(origin).rstrip("/") for origin in parsed if str(origin).strip()]
                return sorted(set(origins) | required_origins)
            except json.JSONDecodeError:
                pass
        origins = [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
        return sorted(set(origins) | required_origins)

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "vetanatomy"
    DATABASE_URL: Optional[str] = None
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    @field_validator("SQLALCHEMY_DATABASE_URI", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info: ValidationInfo) -> str:
        if isinstance(v, str):
            return v.replace("postgres://", "postgresql://", 1)
        database_url = info.data.get("DATABASE_URL")
        if isinstance(database_url, str) and database_url:
            return database_url.replace("postgres://", "postgresql://", 1)
        return f"postgresql://{info.data.get('POSTGRES_USER')}:{info.data.get('POSTGRES_PASSWORD')}@{info.data.get('POSTGRES_SERVER')}/{info.data.get('POSTGRES_DB')}"

    # Email settings
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "no-reply@vetanatomy.local"
    EMAIL_PROVIDER: str = "smtp"  # smtp or sendgrid
    SENDGRID_API_KEY: str = ""
    LOCAL_STORAGE_PATH: str = "storage"
    PUBLIC_STORAGE_URL: Optional[str] = None
    # Refresh token cookie settings
    REFRESH_TOKEN_COOKIE_SECURE: bool = False
    REFRESH_TOKEN_COOKIE_SAMESITE: str = "lax"
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

settings = Settings()
