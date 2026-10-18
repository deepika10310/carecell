import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import COOKIE_SECURE
from app.db.session import get_db_session
from app.models.user import User
from app.models.roles import UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, UpdateRoleRequest, UserResponse
from app.services.auth import DUMMY_PASSWORD_HASH, SESSION_DURATION, create_session_token, hash_password, read_session_token
from app.services.auth import verify_password as verify_password_hash
from app.services.database import authenticate_user, count_admin_users, set_user_role

router = APIRouter(prefix="/auth", tags=["authentication"])
SESSION_COOKIE_NAME = "carecell_session"


def set_session_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=create_session_token(user_id),
        max_age=int(SESSION_DURATION.total_seconds()),
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def get_current_user(request: Request, db: Session = Depends(get_db_session)) -> User:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sign in to continue.")

    try:
        user_id = read_session_token(token)
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session has expired. Please sign in again.") from None

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session is no longer valid.")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access is required.")
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db_session),
) -> User:
    email = str(payload.email).strip().lower()
    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
    )
    if not user.full_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name is required.")

    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email already exists.") from None

    db.refresh(user)
    set_session_cookie(response, user.id)
    return user


@router.post("/login", response_model=UserResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db_session),
) -> User:
    email = str(payload.email).strip().lower()
    user = authenticate_user(db, email, payload.password, verify_password_hash, DUMMY_PASSWORD_HASH)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email or password is incorrect.")

    set_session_cookie(response, user.id)
    return user


@router.get("/me", response_model=UserResponse)
def current_user(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    payload: UpdateRoleRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db_session),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.role == UserRole.ADMIN and payload.role != UserRole.ADMIN and count_admin_users(db) <= 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The last administrator cannot be demoted.",
        )
    return set_user_role(db, user, payload.role)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def logout(response: Response) -> Response:
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/", httponly=True, secure=COOKIE_SECURE, samesite="lax")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response