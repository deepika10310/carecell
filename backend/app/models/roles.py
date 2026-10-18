from enum import Enum


class UserRole(str, Enum):
    PATIENT = "Patient"
    DOCTOR = "Doctor"
    ADMIN = "Admin"