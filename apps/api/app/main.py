from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware

import logging
from pathlib import Path

from app.api.v1.api import api_router
from app.core.config import settings

logger = logging.getLogger("vetanatomy")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"{request.method} {request.url}")
        try:
            response = await call_next(request)
            return response
        except Exception:
            logger.exception("Unhandled error during request")
            raise


# Set up CORS
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Add logging middleware
app.add_middleware(LoggingMiddleware)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.debug("Validation error: %s", exc.errors())
    return JSONResponse(status_code=422, content={"detail": "Validation error", "errors": exc.errors()})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(api_router, prefix=settings.API_V1_STR)

Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=settings.LOCAL_STORAGE_PATH), name="storage")


@app.get("/health")
def health_check():
    return {"status": "healthy"}
