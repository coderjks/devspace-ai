from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import ActivityEvent, Enrollment, EnrollmentStatus, User
from app.schemas import EnrollmentCreate, EnrollmentOut

router = APIRouter(tags=["enrollments"])

ALLOWED_TRACKS = {"applied-ai-engineering"}
ALLOWED_SKILL_LEVELS = {"beginner", "intermediate", "advanced"}
ALLOWED_EXPERIENCE = {"student", "fresher", "junior", "mid", "senior"}


@router.post("/api/enrollments", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    payload: EnrollmentCreate,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EnrollmentOut:
    track = payload.track.strip().lower()
    if track not in ALLOWED_TRACKS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown track for this internship")
    skill_level = payload.skill_level.strip().lower()
    if skill_level not in ALLOWED_SKILL_LEVELS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown skill level")
    experience = payload.experience_level.strip().lower() if payload.experience_level else None
    if experience is not None and experience not in ALLOWED_EXPERIENCE:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown experience level")

    existing = db.scalar(
        select(Enrollment).where(Enrollment.user_id == current_user.id, Enrollment.track == track)
    )
    if existing:
        response.status_code = status.HTTP_200_OK
        return EnrollmentOut.model_validate(existing)

    enrollment = Enrollment(
        user_id=current_user.id,
        track=track,
        status=EnrollmentStatus.active,
        skill_level=skill_level,
        experience_level=experience,
        goals=(payload.goals or "").strip() or None,
    )
    db.add(enrollment)
    db.flush()
    db.add(
        ActivityEvent(
            user_id=current_user.id,
            actor=f"user:{current_user.id}",
            action="enrollment.created",
            object_type="enrollment",
            object_id=enrollment.id,
            payload={"track": track, "skill_level": skill_level},
        )
    )
    db.commit()
    db.refresh(enrollment)
    return EnrollmentOut.model_validate(enrollment)


@router.get("/api/enrollments/me", response_model=list[EnrollmentOut])
def get_my_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EnrollmentOut]:
    rows = db.scalars(select(Enrollment).where(Enrollment.user_id == current_user.id)).all()
    return [EnrollmentOut.model_validate(r) for r in rows]
