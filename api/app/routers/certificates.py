"""Completion certificates with publicly verifiable QR codes.

Eligibility is server-derived: every ticket in the current sprint must be
approved for the requesting student. Each certificate carries an unguessable
credential ``code.signature`` where the signature is HMAC(secret, code), so
forged or mistyped credentials fail closed before any database lookup. The
verify endpoint is intentionally public (no login): employers must be able to
check a certificate without a DevSpace account.
"""

import base64
import hashlib
import hmac
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import config as config_module
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Certificate, Competency, Enrollment, Project, Sprint, TaskStatus, User
from app.schemas import (
    CertificateOut,
    CertificateProgramOut,
    CertificateSkillOut,
    MyCertificateOut,
    VerifyCertificateOut,
)
from app.task_state import resolve_statuses
from app.task_view import deduped_tasks

router = APIRouter(tags=["certificates"])


def _signing_key() -> bytes:
    return config_module.get_settings().jwt_secret_key.encode("utf-8")


def _signature(code: str) -> str:
    digest = hmac.new(_signing_key(), code.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def _credential(code: str) -> str:
    return f"{code}.{_signature(code)}"


def _split_credential(credential: str) -> str | None:
    if credential.count(".") != 1:
        return None
    code, sig = credential.split(".")
    if not code or not sig:
        return None
    if not hmac.compare_digest(_signature(code), sig):
        return None
    return code


def _sprint_tasks(db: Session):
    project = db.scalar(select(Project).order_by(Project.created_at.asc()))
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No project seeded")
    sprint = db.scalar(
        select(Sprint).where(Sprint.project_id == project.id).order_by(Sprint.created_at.asc())
    )
    if sprint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No sprint seeded")
    tasks = deduped_tasks(list(sprint.tasks))
    return project, sprint, tasks


def _progress(db: Session, user: User) -> tuple[bool, int, int, list[str]]:
    _, _, tasks = _sprint_tasks(db)
    if not tasks:
        return False, 0, 0, []
    effective, _ = resolve_statuses(db, user.id, tasks)
    approved = [t for t in tasks if effective[t.id] == TaskStatus.approved]
    remaining = [t.key for t in tasks if effective[t.id] != TaskStatus.approved]
    return len(remaining) == 0, len(approved), len(tasks), remaining


def _skills(cert: Certificate) -> list[CertificateSkillOut]:
    return [
        CertificateSkillOut(
            skill=s["skill"], score=s["score"], evidence_count=s["evidence_count"]
        )
        for s in (cert.skills.get("skills", []) if isinstance(cert.skills, dict) else [])
    ]


def _program(cert: Certificate) -> CertificateProgramOut:
    raw = cert.skills.get("program", {}) if isinstance(cert.skills, dict) else {}
    if not isinstance(raw, dict):
        return CertificateProgramOut()
    return CertificateProgramOut(
        sprint=str(raw.get("sprint", "") or ""),
        tickets_approved=int(raw.get("tickets_approved", 0) or 0),
        tickets_total=int(raw.get("tickets_total", 0) or 0),
    )


def _out(cert: Certificate) -> CertificateOut:
    return CertificateOut(
        id=cert.id,
        track=cert.track,
        recipient_name=cert.recipient_name,
        skills=_skills(cert),
        program=_program(cert),
        issued_at=cert.issued_at,
        credential=_credential(cert.code),
    )


@router.get("/api/certificates/me", response_model=MyCertificateOut)
def my_certificate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyCertificateOut:
    cert = db.scalar(select(Certificate).where(Certificate.user_id == current_user.id))
    eligible, approved, total, remaining = _progress(db, current_user)
    return MyCertificateOut(
        certificate=_out(cert) if cert else None,
        eligible=eligible,
        approved=approved,
        total=total,
        remaining=remaining,
    )


@router.post("/api/certificates/issue", response_model=CertificateOut, status_code=201)
def issue_certificate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CertificateOut:
    existing = db.scalar(select(Certificate).where(Certificate.user_id == current_user.id))
    if existing is not None:
        return _out(existing)
    eligible, approved, total, remaining = _progress(db, current_user)
    if not eligible:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Complete all {total} sprint tickets first ({approved} approved, {len(remaining)} remaining)",
        )
    enrollment = db.scalar(
        select(Enrollment).where(Enrollment.user_id == current_user.id).order_by(Enrollment.created_at.asc())
    )
    comps = db.scalars(select(Competency).where(Competency.user_id == current_user.id)).all()
    name = (current_user.full_name or "").strip() or current_user.email.split("@")[0]
    project, sprint, tasks = _sprint_tasks(db)
    cert = Certificate(
        user_id=current_user.id,
        code=secrets.token_urlsafe(24),
        track=enrollment.track if enrollment else "applied-ai-engineering",
        recipient_name=name,
        skills={
            "skills": [
                {"skill": c.skill, "score": c.score, "evidence_count": c.evidence_count}
                for c in comps
            ],
            "program": {
                "sprint": sprint.name,
                "tickets_approved": len(tasks),
                "tickets_total": len(tasks),
            },
        },
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return _out(cert)


@router.get("/api/certificates/verify/{credential:path}", response_model=VerifyCertificateOut)
def verify_certificate(credential: str, db: Session = Depends(get_db)) -> VerifyCertificateOut:
    code = _split_credential(credential)
    if code is None:
        return VerifyCertificateOut(valid=False)
    cert = db.scalar(select(Certificate).where(Certificate.code == code))
    if cert is None:
        return VerifyCertificateOut(valid=False)
    return VerifyCertificateOut(
        valid=True,
        recipient_name=cert.recipient_name,
        track=cert.track,
        issued_at=cert.issued_at,
        skills=_skills(cert),
        program=_program(cert),
    )
