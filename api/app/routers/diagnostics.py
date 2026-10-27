from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.diagnostics_data import grade, public_questions
from app.models import Enrollment, User
from app.schemas import DiagnosticAttemptIn, DiagnosticAttemptOut, DiagnosticQuestionOut

router = APIRouter(tags=["diagnostics"])


@router.get("/api/diagnostics/questions", response_model=list[DiagnosticQuestionOut])
def list_questions(current_user: User = Depends(get_current_user)) -> list[DiagnosticQuestionOut]:
    return [DiagnosticQuestionOut.model_validate(q) for q in public_questions()]


@router.post("/api/diagnostics/attempts", response_model=DiagnosticAttemptOut)
def submit_attempt(
    payload: DiagnosticAttemptIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DiagnosticAttemptOut:
    score, total = grade(payload.answers)
    enrollment = db.scalar(
        select(Enrollment)
        .where(Enrollment.user_id == current_user.id, Enrollment.track == "applied-ai-engineering")
        .order_by(Enrollment.created_at.asc())
    )
    if enrollment is not None:
        enrollment.diagnostic_result = {
            "score": score,
            "total": total,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        db.add(enrollment)
        db.commit()
    return DiagnosticAttemptOut(score=score, total=total)
