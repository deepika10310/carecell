from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db.session import get_db_session
from app.models.roles import UserRole
from app.models.test_submission import TestSubmission
from app.models.user import User
from app.schemas.test_submission import TestSubmissionResponse

router = APIRouter(prefix="/tests", tags=["patient tests"])
UPLOAD_DIRECTORY = Path(__file__).resolve().parents[3] / "uploads" / "test-results"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_FILES = {
    ".pdf": ("application/pdf", b"%PDF-"),
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
}


def require_patient(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access is required.")
    return user


@router.get("", response_model=list[TestSubmissionResponse])
def list_test_submissions(
    user: User = Depends(require_patient),
    db: Session = Depends(get_db_session),
) -> list[TestSubmission]:
    return list(
        db.scalars(
            select(TestSubmission)
            .where(TestSubmission.user_id == user.id)
            .order_by(TestSubmission.uploaded_at.desc())
        ).all()
    )


@router.post("", response_model=TestSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_test_submission(
    test_type: str = Form(min_length=1, max_length=120),
    test_date: date = Form(),
    facility: str = Form(default="", max_length=120),
    notes: str = Form(default="", max_length=2000),
    file: UploadFile = File(),
    user: User = Depends(require_patient),
    db: Session = Depends(get_db_session),
) -> TestSubmission:
    extension = Path(file.filename or "").suffix.lower()
    allowed_file = ALLOWED_FILES.get(extension)
    if allowed_file is None or file.content_type != allowed_file[0]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a PDF, JPG, JPEG, or PNG test result.",
        )

    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Files must be 10 MB or smaller.")
    if not contents.startswith(allowed_file[1]):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="The file content does not match its type.")

    original_filename = Path(file.filename or "test-result").name
    original_filename = "".join(character for character in original_filename if character.isprintable())[:255]
    stored_filename = f"{uuid4().hex}{extension}"
    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIRECTORY / stored_filename
    file_path.write_bytes(contents)

    submission = TestSubmission(
        user_id=user.id,
        test_type=test_type.strip(),
        test_date=test_date,
        facility=facility.strip() or None,
        notes=notes.strip() or None,
        original_filename=original_filename or "test-result",
        stored_filename=stored_filename,
        content_type=allowed_file[0],
        file_size=len(contents),
    )
    if not submission.test_type:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Test type is required.")

    try:
        db.add(submission)
        db.commit()
        db.refresh(submission)
    except Exception:
        db.rollback()
        file_path.unlink(missing_ok=True)
        raise
    return submission


@router.get("/{submission_id}/download")
def download_test_submission(
    submission_id: int,
    user: User = Depends(require_patient),
    db: Session = Depends(get_db_session),
) -> FileResponse:
    submission = db.scalar(
        select(TestSubmission).where(
            TestSubmission.id == submission_id,
            TestSubmission.user_id == user.id,
        )
    )
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test result not found.")

    file_path = UPLOAD_DIRECTORY / submission.stored_filename
    if not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The uploaded file is unavailable.")
    return FileResponse(
        file_path,
        media_type=submission.content_type,
        filename=submission.original_filename,
        headers={"Cache-Control": "private, no-store"},
    )