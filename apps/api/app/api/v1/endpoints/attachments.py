from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

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

    file_data = bytearray()
    size = 0
    while chunk := await file.read(1024 * 1024):
        size += len(chunk)
        if size > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File too large")
        file_data.extend(chunk)

    attachment = Attachment(
        patient_id=patient_id,
        filename=file.filename or "upload.bin",
        url="",
        file_data=bytes(file_data),
        content_type=file.content_type,
        size_bytes=size,
        category=category,
        uploaded_by=current_user.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    attachment.url = f"/api/v1/attachments/{attachment.id}/content"
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/by_patient/{patient_id}", response_model=list[AttachmentRead])
def list_by_patient(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Attachment).filter(Attachment.patient_id == patient_id).order_by(Attachment.uploaded_at.desc()).all()


@router.get("/{attachment_id}/content")
def attachment_content(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment or attachment.file_data is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    headers = {"Content-Disposition": f'inline; filename="{attachment.filename}"'}
    return Response(content=attachment.file_data, media_type=attachment.content_type or "application/octet-stream", headers=headers)
