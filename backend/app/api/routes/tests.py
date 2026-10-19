from datetime import date
from pathlib import Path
import secrets
from urllib.parse import quote
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import EmailStr, TypeAdapter, ValidationError
from starlette.background import BackgroundTask
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db.session import get_db_session
from app.models.roles import UserRole
from app.models.test_submission import TestSubmission
from app.models.user import User
from app.schemas.test_submission import DoctorSummary, TestSubmissionResponse
from app.services.auth import hash_password
from app.services.object_storage import ObjectStorageError, delete_object, get_object_body, upload_object

router = APIRouter(prefix="/tests", tags=["patient tests"])
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_FILES = {
    ".pdf": ("application/pdf", b"%PDF-"),
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
}
EMAIL_VALIDATOR = TypeAdapter(EmailStr)


def require_patient(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access is required.")
    return user


@router.get("/doctors", response_model=list[DoctorSummary])
def list_doctors(
    _: User = Depends(require_patient),
    db: Session = Depends(get_db_session),
) -> list[User]:
    return list(
        db.scalars(
            select(User).where(User.role == UserRole.DOCTOR).order_by(func.lower(User.full_name), User.id)
        ).all()
    )


def resolve_submission_doctor(
    db: Session,
    doctor_id: str,
    new_doctor_name: str,
    new_doctor_email: str,
) -> User:
    new_doctor_name = new_doctor_name.strip()
    new_doctor_email = new_doctor_email.strip()
    if doctor_id and (new_doctor_name or new_doctor_email):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose an existing doctor or enter a new doctor, not both.")
    if new_doctor_name or new_doctor_email:
        if not new_doctor_name or not new_doctor_email or len(new_doctor_name) > 120 or len(new_doctor_email) > 320:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid name and email for the new doctor.")
        try:
            new_doctor_email = str(EMAIL_VALIDATOR.validate_python(new_doctor_email)).lower()
        except ValidationError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid name and email for the new doctor.") from None
        existing_user = db.scalar(select(User).where(func.lower(User.email) == new_doctor_email))
        if existing_user is not None:
            if existing_user.role == UserRole.DOCTOR:
                return existing_user
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That email already belongs to a non-doctor account.")
        return User(
            email=new_doctor_email,
            full_name=new_doctor_name,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            role=UserRole.DOCTOR,
        )
    if doctor_id:
        try:
            parsed_doctor_id = int(doctor_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Select a valid doctor.") from None
        doctor = db.scalar(select(User).where(User.id == parsed_doctor_id, User.role == UserRole.DOCTOR))
        if doctor is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The selected doctor was not found.")
        return doctor
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Select an existing doctor or enter the new doctor's name and email.",
    )


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
    doctor_id: str = Form(default=""),
    new_doctor_name: str = Form(default="", max_length=120),
    new_doctor_email: str = Form(default="", max_length=320),
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
    test_type = test_type.strip()
    if not test_type:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Test type is required.")

    doctor = resolve_submission_doctor(db, doctor_id, new_doctor_name, new_doctor_email)

    s3_key = f"test-results/{user.id}/{uuid4().hex}{extension}"
    try:
        print(f"Uploading test result to S3 with key: {s3_key} and content type: {allowed_file[0]} and size: {len(contents)} bytes")
        upload_object(s3_key, contents, allowed_file[0])
    except ObjectStorageError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error

    submission = TestSubmission(
        user_id=user.id,
        test_type=test_type,
        test_date=test_date,
        facility=facility.strip() or None,
        notes=notes.strip() or None,
        original_filename=original_filename or "test-result",
        doctor=doctor,
        stored_filename=None,
        s3_key=s3_key,
        content_type=allowed_file[0],
        file_size=len(contents),
    )
    try:
        db.add(submission)
        db.commit()
        db.refresh(submission)
    except IntegrityError as error:
        db.rollback()
        try:
            delete_object(s3_key)
        except ObjectStorageError:
            pass
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A doctor account with that email already exists.") from error
    except Exception:
        db.rollback()
        try:
            delete_object(s3_key)
        except ObjectStorageError:
            pass
        raise
    return submission


@router.patch("/{submission_id}", response_model=TestSubmissionResponse)
async def update_test_submission(
    submission_id: int,
    test_type: str = Form(min_length=1, max_length=120),
    test_date: date = Form(),
    facility: str = Form(default="", max_length=120),
    notes: str = Form(default="", max_length=2000),
    doctor_id: str = Form(default=""),
    file: UploadFile | None = File(default=None),
    user: User = Depends(require_patient),
    db: Session = Depends(get_db_session),
) -> TestSubmission:
    submission = db.scalar(
        select(TestSubmission).where(
            TestSubmission.id == submission_id,
            TestSubmission.user_id == user.id,
        )
    )
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test result not found.")

    submission.doctor = resolve_submission_doctor(db, doctor_id, "", "")

    new_s3_key: str | None = None
    previous_s3_key: str | None = None
    if file is not None and file.filename:
        extension = Path(file.filename).suffix.lower()
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

        extension = Path(file.filename).suffix.lower()
        new_s3_key = f"test-results/{user.id}/{uuid4().hex}{extension}"
        try:
            upload_object(new_s3_key, contents, allowed_file[0])
        except ObjectStorageError as error:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
        previous_s3_key = submission.s3_key
        submission.original_filename = "".join(
            character for character in Path(file.filename).name if character.isprintable()
        )[:255] or "test-result"
        submission.stored_filename = None
        submission.s3_key = new_s3_key
        submission.content_type = allowed_file[0]
        submission.file_size = len(contents)

    normalized_test_type = test_type.strip()
    if not normalized_test_type:
        if new_s3_key is not None:
            try:
                delete_object(new_s3_key)
            except ObjectStorageError:
                pass
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Test type is required.")

    submission.test_type = normalized_test_type
    submission.test_date = test_date
    submission.facility = facility.strip() or None
    submission.notes = notes.strip() or None

    try:
        db.commit()
        db.refresh(submission)
    except Exception:
        db.rollback()
        if new_s3_key is not None:
            try:
                delete_object(new_s3_key)
            except ObjectStorageError:
                pass
        raise

    if previous_s3_key is not None:
        try:
            delete_object(previous_s3_key)
        except ObjectStorageError:
            pass
    return submission


@router.get("/{submission_id}/download")
def download_test_submission(
    submission_id: int,
    user: User = Depends(require_patient),
    db: Session = Depends(get_db_session),
) -> StreamingResponse:
    submission = db.scalar(
        select(TestSubmission).where(
            TestSubmission.id == submission_id,
            TestSubmission.user_id == user.id,
        )
    )
    if submission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test result not found.")

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