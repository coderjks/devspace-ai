from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import ActivityEvent, User
from app.schemas import PasswordChange, ProfileUpdate, UserOut
from app.security import hash_password, verify_password

router = APIRouter(tags=["users"])


@router.patch("/api/users/me", response_model=UserOut)
def update_my_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserOut:
    current_user.full_name = payload.full_name.strip()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.patch("/api/users/me/password", response_model=UserOut)
def change_my_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserOut:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.add(current_user)
    db.add(
        ActivityEvent(
            user_id=current_user.id,
            actor=f"user:{current_user.id}",
            action="password.changed",
            object_type="user",
            object_id=current_user.id,
            payload={},
        )
    )
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)
