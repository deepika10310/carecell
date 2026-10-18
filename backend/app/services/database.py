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
