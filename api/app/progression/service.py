"""Deterministic TaskProgressionService (Phase 07).

Approval rests ONLY on trusted evidence — SHA freshness, check outcomes,
and review vetoes. An LLM response alone never approves: the review can deny
(blocking findings, errors) but a clean review never suffices without passing
checks. Every verdict is persisted exactly once per submission (unique
submission_id + idempotency key) inside one transaction together with task
state changes, unlocks, competency credits, and remediation.

Unlock rule: an approved task unlocks dependents whose prerequisites are ALL
approved and whose status is locked (-> todo). Runs inside the same
transaction, so exactly-once approval implies exactly-once unlock.
"""

from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    ActivityEvent,
    Approval,
    Competency,
    Evaluation,
    Remediation,
    Submission,
    Task,
    TaskDependency,
    TaskStatus,
)

POLICY_VERSION = "policy-1"

# PRD §7 skills tracked from approval evidence.
TRACKED_SKILLS = (
    "python",
    "apis",
    "testing",
    "security",
    "databases",
    "llm_integration",
    "engineering_practices",
)

# Static check -> skill evidence mapping (Phase 06 check names).
CHECK_SKILLS = {
    "secret_scan": ("security",),
    "wip_marker": ("engineering_practices",),
    "diff_available": ("testing", "engineering_practices"),
}


class ProgressionError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def latest_evaluation_for_head(db: Session, submission: Submission) -> Evaluation | None:
    if not submission.head_sha:
        return None
    return (
        db.query(Evaluation)
        .filter(Evaluation.submission_id == submission.id, Evaluation.sha == submission.head_sha)
        .order_by(Evaluation.created_at.desc())
        .first()
    )


def decide(submission: Submission, evaluation: Evaluation) -> tuple[str, str, list[str]]:
    """Return (decision, reason, failed_check_names). Pure function, no I/O."""
    failed: list[str] = []
    if evaluation.sha != submission.head_sha:
        return "denied", f"Stale evaluation: evaluated {evaluation.sha[:7]} but head is {(submission.head_sha or '')[:7]}.", failed
    if submission.pr_state == "closed" and not submission.merged:
        return "denied", "Pull request was closed without merging. Reopen it and push a new commit.", failed
    checks = (evaluation.test_results or {}).get("checks", [])
    for c in checks:
        if c.get("status") == "fail" and c.get("blocking"):
            failed.append(c.get("name", "unknown"))
    if failed:
        return "denied", f"Blocking checks failed: {', '.join(failed)}. See remediation for next steps.", failed
    skipped = [c.get("name", "unknown") for c in checks if c.get("status") == "skip"]
    if skipped:
        return "denied", f"Incomplete evidence: {', '.join(skipped)} unavailable. This blocks approval until resolved.", skipped
    review = evaluation.ai_review or {}
    if review.get("error"):
        return "denied", f"AI review unavailable: {review['error']}. Fix the pipeline input and re-run evaluation.", failed
    blocking_findings = [f for f in review.get("findings", []) if f.get("severity") == "blocking"]
    if blocking_findings:
        failed.append("ai_review")
        quoted = "; ".join(f.get("message", "")[:160] for f in blocking_findings[:3])
        return "denied", f"Reviewer raised blocking findings: {quoted}", failed
    passed = sum(1 for c in checks if c.get("status") == "pass")
    findings = len(review.get("findings", []))
    mock_note = " (advisory mock review — live model still required for production assurance)" if review.get("mock") else ""
    return (
        "approved",
        f"Head SHA verified, {passed} checks passed, {findings} blocking findings{mock_note}.",
        failed,
    )


def build_hints(check_names: list[str], reason: str, findings_text: str = "") -> list[dict]:
    """Three progressive hints from evidence. Guidance only — no solutions."""
    focus = check_names[0] if check_names else "general"
    guides = {
        "secret_scan": (
            "A secret scanner flagged text that looks like a credential in your diff. Find which file and line it is — the check detail names it.",
            "Committed secrets must be revoked at the source, not just deleted from the file: anyone with repo access already has a copy.",
            "Remove the secret, rotate it in the provider dashboard, read it from an environment variable instead, amend the commit, and push a new SHA.",
        ),
        "wip_marker": (
            "Your diff still carries a WIP / do-not-merge marker. Search the diff for it.",
            "Reviewers treat these markers as an explicit request not to merge — CI gates honor them literally.",
            "Remove the marker once the work is actually complete, then push so a fresh evaluation runs.",
        ),
        "diff_available": (
            "The pipeline could not read your PR diff, so there is no evidence to approve against.",
            "Diff access needs the repository linked and (for private repos) the GitHub App installed with pull-request read permission.",
            "Link the repo on the GitHub page, confirm the PR URL and SHA match, and trigger a fresh evaluation.",
        ),
        "ai_review": (
            f"The reviewer left blocking feedback: {findings_text[:200]}".rstrip() or "The reviewer left blocking feedback — read it in the report.",
            "Address the finding's root cause in your code, not just its wording: re-read the task's acceptance criteria first.",
            "Make the smallest change that resolves the finding, push a new commit, and let evaluation rerun against the new SHA.",
        ),
        "general": (
            f"Start from the denial reason: {reason[:200]}",
            "Reproduce the failure locally before changing anything — a fix you cannot reproduce is a guess.",
            "Change one thing, push a new commit, and check the fresh evaluation report for this exact SHA.",
        ),
    }
    l1, l2, l3 = guides.get(focus, guides["general"])
    return [
        {"level": 1, "title": "Orient", "body": l1},
        {"level": 2, "title": "Understand", "body": l2},
        {"level": 3, "title": "Act", "body": l3},
    ]


def _credit_competencies(db: Session, user_id: str, task: Task | None, checks: list[dict]) -> None:
    skills: set[str] = set()
    if task and isinstance(task.rubric_json, dict):
        for s in task.rubric_json.get("skills", []):
            if s in TRACKED_SKILLS:
                skills.add(s)
    for c in checks:
        for s in CHECK_SKILLS.get(c.get("name", ""), ()):
            skills.add(s)
    for skill in sorted(skills):
        row = (
            db.query(Competency)
            .filter(Competency.user_id == user_id, Competency.skill == skill)
            .first()
        )
        if row is None:
            row = Competency(user_id=user_id, skill=skill, score=0, evidence_count=0)
            db.add(row)
        row.score += 1
        row.evidence_count += 1


def _unlock_dependents(db: Session, task: Task) -> list[str]:
    """Unlock dependents whose prerequisites are ALL approved. Returns unlocked keys."""
    unlocked: list[str] = []
    dependents = db.query(TaskDependency).filter(TaskDependency.depends_on_task_id == task.id).all()
    for dep in dependents:
        child = db.query(Task).filter(Task.id == dep.task_id).first()
        if child is None or child.status != TaskStatus.locked:
            continue
        prereqs = db.query(TaskDependency).filter(TaskDependency.task_id == child.id).all()
        all_approved = True
        for pre in prereqs:
            pt = db.query(Task).filter(Task.id == pre.depends_on_task_id).first()
            if pt is None or pt.status != TaskStatus.approved:
                all_approved = False
                break
        if all_approved:
            child.status = TaskStatus.todo
            unlocked.append(child.key)
    return unlocked


def request_approval(db: Session, user_id: str, submission_id: str, idempotency_key: str) -> tuple[Approval, bool, list[str]]:
    """Run the policy transactionally. Returns (approval, created, unlocked_keys).

    Raises ProgressionError for 4xx conditions. Concurrent duplicates collapse
    to the stored row via the unique submission_id constraint.
    """
    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id, Submission.user_id == user_id)
        .first()
    )
    if submission is None:
        raise ProgressionError(404, "submission not found")

    existing = db.query(Approval).filter(Approval.submission_id == submission_id).first()
    if existing is not None:
        if existing.idempotency_key != idempotency_key:
            raise ProgressionError(409, "submission already decided under a different idempotency key")
        return existing, False, []

    evaluation = latest_evaluation_for_head(db, submission)
    if evaluation is None:
        raise ProgressionError(422, "no evaluation for the current head SHA; run evaluation first")

    decision, reason, failed = decide(submission, evaluation)
    approval = Approval(
        submission_id=submission.id,
        evaluation_id=evaluation.id,
        decision=decision,
        reason=reason,
        policy_version=POLICY_VERSION,
        idempotency_key=idempotency_key,
    )
    try:
        db.add(approval)
        db.flush()
    except IntegrityError:
        db.rollback()
        existing = db.query(Approval).filter(Approval.submission_id == submission_id).first()
        if existing is None:
            raise
        if existing.idempotency_key != idempotency_key:
            raise ProgressionError(409, "submission already decided under a different idempotency key")
        return existing, False, []

    unlocked: list[str] = []
    if decision == "approved":
        task = db.query(Task).filter(Task.id == submission.task_id).first()
        if task is not None and task.status != TaskStatus.approved:
            task.status = TaskStatus.approved
        if task is not None:
            unlocked = _unlock_dependents(db, task)
            _credit_competencies(db, user_id, task, (evaluation.test_results or {}).get("checks", []))
    else:
        findings_text = "; ".join(
            f.get("message", "") for f in (evaluation.ai_review or {}).get("findings", []) if f.get("severity") == "blocking"
        )
        db.add(
            Remediation(
                approval_id=approval.id,
                failed_checks=failed,
                hints=build_hints(failed, reason, findings_text),
            )
        )

    db.add(
        ActivityEvent(
            user_id=user_id,
            actor="policy",
            action=f"approval.{decision}",
            object_type="approval",
            object_id=approval.id,
            payload={"submission_id": submission.id, "policy": POLICY_VERSION, "unlocked": unlocked},
        )
    )
    db.commit()
    db.refresh(approval)
    return approval, True, unlocked
