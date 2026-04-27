from fastapi import APIRouter

from app.api.v1.endpoints import annotations, attachments, auth, imaging, patients, species, surgical_plans, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"]) 
api_router.include_router(patients.router, prefix="/patients", tags=["patients"]) 
api_router.include_router(species.router, prefix="/species", tags=["species"])
api_router.include_router(annotations.router, prefix="/annotations", tags=["annotations"]) 
api_router.include_router(attachments.router, prefix="/attachments", tags=["attachments"])
api_router.include_router(imaging.router, prefix="/imaging", tags=["imaging"])
api_router.include_router(surgical_plans.router, prefix="/surgical-plans", tags=["surgical-plans"])
