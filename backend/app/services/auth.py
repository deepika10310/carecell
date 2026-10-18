from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import JWT_SECRET_KEY

password_hash = PasswordHash.recommended()
SESSION_DURATION = timedelta(hours=8)
DUMMY_PASSWORD_HASH = password_hash.hash("carecell-invalid-login-placeholder")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_session_token(user_id: int) -> str:
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY must be configured before creating sessions.")

    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": now + SESSION_DURATION},
        JWT_SECRET_KEY,
        algorithm="HS256",
    )


def read_session_token(token: str) -> int:
    if not JWT_SECRET_KEY:
        raise RuntimeError("JWT_SECRET_KEY must be configured before reading sessions.")

    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject.isdecimal():
        raise jwt.InvalidTokenError("Invalid session subject.")
    return int(subject)