from collections.abc import Callable

from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.db.session import Base, engine
from app.models.roles import UserRole
from app.models.test_submission import TestSubmission
from app.models.user import User


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    columns = {column["name"] for column in inspect(engine).get_columns(User.__tablename__)}
    if "role" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'Patient'"
                )
            )
    if inspect(engine).has_table(TestSubmission.__tablename__):
        columns = {column["name"]: column for column in inspect(engine).get_columns(TestSubmission.__tablename__)}
        if "doctor_id" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE test_submissions ADD COLUMN doctor_id INTEGER NULL"))
                connection.execute(
                    text(
                        "ALTER TABLE test_submissions "
                        "ADD CONSTRAINT fk_test_submissions_doctor_id_users "
                        "FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL"
                    )
                )
                connection.execute(text("CREATE INDEX ix_test_submissions_doctor_id ON test_submissions (doctor_id)"))
        if "s3_key" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE test_submissions ADD COLUMN s3_key VARCHAR(512) NULL"))
                connection.execute(
                    text("UPDATE test_submissions SET s3_key = stored_filename WHERE s3_key IS NULL")
                )
                connection.execute(text("ALTER TABLE test_submissions MODIFY s3_key VARCHAR(512) NOT NULL"))
        if "stored_filename" in columns and not columns["stored_filename"].get("nullable", True):
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE test_submissions MODIFY stored_filename VARCHAR(80) NULL"))
        unique_keys = {
            column
            for constraint in inspect(engine).get_unique_constraints(TestSubmission.__tablename__)
            for column in constraint.get("column_names", [])
        }
        if "s3_key" not in unique_keys:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE test_submissions ADD UNIQUE (s3_key)"))


def authenticate_user(
    db: Session,
    email: str,
    password: str,
    verify_password: Callable[[str, str], bool],
    dummy_password_hash: str,
) -> User | None:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        verify_password(password, dummy_password_hash)
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def set_user_role(db: Session, user: User, role: UserRole) -> User:
    user.role = role
    db.commit()
    db.refresh(user)
    return user


def count_admin_users(db: Session) -> int:
    return db.query(User).filter(User.role == UserRole.ADMIN).count()
