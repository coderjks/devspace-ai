from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DbHealthOut, HealthOut

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut(status="ok", service="devspace-api")


@router.get("/health/db", response_model=DbHealthOut)
def health_db(db: Session = Depends(get_db)) -> DbHealthOut:
    try:
        db.execute(text("SELECT 1"))
        return DbHealthOut(status="ok", database="connected")
    except Exception:
        return DbHealthOut(status="error", database="unavailable")
