"""Create or reset the local demo accounts in the configured MySQL database."""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.roles import UserRole
from app.models.user import User
from app.services.auth import hash_password
from app.services.database import initialize_database


DEMO_USERS = (
    ("patient@test.com", "Patient", "patient", UserRole.PATIENT),
    ("doctor@test.com", "Doctor", "doctor", UserRole.DOCTOR),
    ("admin@test.com", "Admin", "admin", UserRole.ADMIN),
)


def seed_users() -> None:
    initialize_database()

    with SessionLocal() as session:
        for email, full_name, password, role in DEMO_USERS:
            user = session.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(
                    email=email,
                    full_name=full_name,
                    hashed_password=hash_password(password),
                    role=role,
                )
                session.add(user)
            else:
                user.full_name = full_name
                user.hashed_password = hash_password(password)
                user.role = role

        session.commit()

    print("Demo accounts created or updated successfully.")


if __name__ == "__main__":
    seed_users()