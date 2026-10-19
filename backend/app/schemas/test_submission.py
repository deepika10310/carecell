from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class DoctorSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str


class TestSubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    test_type: str
    test_date: date
    facility: str | None
    notes: str | None
    original_filename: str
    content_type: str
    file_size: int
    uploaded_at: datetime
    doctor: DoctorSummary | None


class DoctorPatientRecord(BaseModel):
    patient_id: int
    patient_name: str
    test_submission_id: int
    test_type: str
    test_date: date
    facility: str | None
    notes: str | None
    original_filename: str
    content_type: str
    file_size: int
    uploaded_at: datetime