from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models import Attachment, Patient, User
from app.schemas.attachment import AttachmentRead

router = APIRouter()

ALLOWED_CONTENT_TYPES = {
    "application/dicom",
    "application/octet-stream",
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024


@router.post("/upload", response_model=AttachmentRead)
async def upload_attachment(
    patient_id: int | None = Form(default=None),
    category: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type")

    if patient_id is not None:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

    storage_root = Path(settings.LOCAL_STORAGE_PATH)
    storage_root.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "upload.bin").suffix
    stored_name = f"{uuid4().hex}{suffix}"
    target = storage_root / stored_name

    size = 0
    with target.open("wb") as out_file:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                target.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail="File too large")
            out_file.write(chunk)

    url = f"/storage/{stored_name}"
    if settings.PUBLIC_STORAGE_URL:
        url = f"{settings.PUBLIC_STORAGE_URL.rstrip('/')}/{stored_name}"

    attachment = Attachment(
        patient_id=patient_id,
        filename=file.filename or stored_name,
        url=url,
        content_type=file.content_type,
        size_bytes=size,
        category=category,
        uploaded_by=current_user.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/by_patient/{patient_id}", response_model=list[AttachmentRead])
def list_by_patient(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Attachment).filter(Attachment.patient_id == patient_id).order_by(Attachment.uploaded_at.desc()).all()
