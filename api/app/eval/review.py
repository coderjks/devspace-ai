"""Model reviewer with schema-validated structured output (Phase 06).

The review NEVER approves by itself: it returns findings, and the Phase 07
policy engine decides. Mock reviewer output is explicitly labeled so mock
findings can never be mistaken for a live review. Malformed model output is
returned as an error, never coerced into findings.
"""

from __future__ import annotations

REVIEW_SCHEMA_VERSION = "1"
MOCK_MODEL_VERSION = "mock-reviewer-1"
PROMPT_VERSION = "pr-review-1"


def empty_review(mock: bool, sha: str, reason: str) -> dict:
    return {
        "schema_version": REVIEW_SCHEMA_VERSION,
        "sha": sha,
        "mock": mock,
        "summary": reason,
        "findings": [],
        "error": None,
    }


def validate_review(data: dict, sha: str) -> tuple[dict | None, str | None]:
    """Validate model output. Returns (review, error)."""
    if not isinstance(data, dict):
        return None, "review must be a JSON object"
    if data.get("schema_version") != REVIEW_SCHEMA_VERSION:
        return None, f"unsupported schema_version {data.get('schema_version')!r}"
    if data.get("sha") != sha:
        return None, "review SHA does not match evaluated SHA"
    findings = data.get("findings")
    if not isinstance(findings, list):
        return None, "findings must be a list"
    for f in findings:
        if not isinstance(f, dict):
            return None, "each finding must be an object"
        if f.get("severity") not in ("info", "minor", "major", "blocking"):
            return None, f"bad severity {f.get('severity')!r}"
        if not f.get("message") or not isinstance(f.get("message"), str):
            return None, "each finding needs a text message"
    return (
        {
            "schema_version": REVIEW_SCHEMA_VERSION,
            "sha": sha,
            "mock": bool(data.get("mock", False)),
            "summary": str(data.get("summary", ""))[:2000],
            "findings": findings,
            "error": None,
        },
        None,
    )


def mock_review(sha: str, checks_summary: str) -> dict:
    """Clearly labeled mock review: zero findings, never an approval."""
    review = empty_review(True, sha, f"Mock review (no live model). Static checks: {checks_summary}.")
    review["model_version"] = MOCK_MODEL_VERSION
    return review
