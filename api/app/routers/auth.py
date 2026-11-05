import re
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import RefreshToken, User, UserRole
from app.schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut
from app.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _validate_email(email: str) -> None:
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid email address")


def _set_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.jwt_expires_minutes * 60,
        path="/",
    )


def _refresh_samesite(settings) -> Literal["lax", "none"]:
    # Cross-site browser calls (e.g. Vercel web -> Railway API) only carry a
    # cookie when it is SameSite=None, which browsers require to be Secure.
    return "none" if settings.cookie_secure else "lax"


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=raw_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=_refresh_samesite(settings),
        max_age=settings.refresh_token_expires_days * 24 * 60 * 60,
        path="/api/auth",
    )


def _delete_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(key=settings.refresh_cookie_name, path="/api/auth")


def _issue_session(db: Session, response: Response, user: User) -> str:
    """Create an access token plus a new refresh-token family entry."""
    settings = get_settings()
    access_token = create_access_token(user.id)
    _set_cookie(response, access_token)
    raw_refresh, token_hash = create_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expires_days),
        )
    )
    db.commit()
    _set_refresh_cookie(response, raw_refresh)
    return access_token


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def _revoke_user_refresh_tokens(db: Session, user_id: str) -> None:
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    email = _normalize_email(payload.email)
    _validate_email(email)
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=UserRole.student,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = _issue_session(db, response, user)
    return AuthResponse(user=UserOut.model_validate(user), access_token=token)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    token = _issue_session(db, response, user)
    return AuthResponse(user=UserOut.model_validate(user), access_token=token)


@router.post("/refresh", response_model=AuthResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> AuthResponse:
    settings = get_settings()
    raw = request.cookies.get(settings.refresh_cookie_name)
    if not raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw)))
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if row.revoked_at is not None:
        # A rotated-out or revoked token was presented again. Treat it as
        # possible theft and end every session for this user.
        _revoke_user_refresh_tokens(db, row.user_id)
        db.commit()
        _delete_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token reuse detected")
    if _aware(row.expires_at) <= datetime.now(timezone.utc):
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()
        _delete_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    user = db.get(User, row.user_id)
    if user is None or not user.is_active:
        _revoke_user_refresh_tokens(db, row.user_id)
        db.commit()
        _delete_refresh_cookie(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    access_token = create_access_token(user.id)
    _set_cookie(response, access_token)
    raw_refresh, token_hash = create_refresh_token()
    replacement = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=settings.refresh_token_expires_days),
    )
    db.add(replacement)
    db.flush()
    row.revoked_at = datetime.now(timezone.utc)
    row.replaced_by_id = replacement.id
    db.commit()
    _set_refresh_cookie(response, raw_refresh)
    return AuthResponse(user=UserOut.model_validate(user), access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> Response:
    settings = get_settings()
    raw = request.cookies.get(settings.refresh_cookie_name)
    if raw:
        row = db.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw))
        )
        if row is not None and row.revoked_at is None:
            row.revoked_at = datetime.now(timezone.utc)
            db.commit()
    response.delete_cookie(key=settings.cookie_name, path="/")
    _delete_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)
