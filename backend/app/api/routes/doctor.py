from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db.session import get_db_session
from app.models.roles import UserRole
from app.models.test_submission import TestSubmission
from app.models.user import User
from app.schemas.test_submission import DoctorPatientRecord
from app.services.object_storage import ObjectStorageError, get_object_body

router = APIRouter(prefix="/doctor", tags=["doctor patient records"])


def require_doctor(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor access is required.")
    return user


@router.get("/patient-records", response_model=list[DoctorPatientRecord])
def list_assigned_patient_records(
    doctor: User = Depends(require_doctor),
    db: Session = Depends(get_db_session),
) -> list[DoctorPatientRecord]:
    rows = db.execute(
        select(TestSubmission, User)
        .join(User, TestSubmission.user_id == User.id)
        .where(TestSubmission.doctor_id == doctor.id)
        .order_by(TestSubmission.uploaded_at.desc(), TestSubmission.id.desc())
    ).all()
    return [
        DoctorPatientRecord(
            patient_id=patient.id,
            patient_name=patient.full_name,
            test_submission_id=submission.id,
            test_type=submission.test_type,
            test_date=submission.test_date,
            facility=submission.facility,
            notes=submission.notes,
            original_filename=submission.original_filename,
            content_type=submission.content_type,
            file_size=submission.file_size,
            uploaded_at=submission.uploaded_at,
        )
        for submission, patient in rows
    ]


@router.get("/patient-records/{submission_id}/download")
def download_assigned_patient_record(
    submission_id: int,
    doctor: User = Depends(require_doctor),
    db: Session = Depends(get_db_session),
) -> StreamingResponse:
    submission = db.scalar(
        select(TestSubmission).where(
            TestSubmission.id == submission_id,
            TestSubmission.doctor_id == doctor.id,
        )
    )
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient record not found.")
    if not submission.s3_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The uploaded file is unavailable.")
    try:
        body = get_object_body(submission.s3_key)
    except ObjectStorageError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    return StreamingResponse(
        body,
        media_type=submission.content_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(submission.original_filename, safe='')}",
            "Content-Length": str(submission.file_size),
        },
        background=BackgroundTask(body.close),
    )