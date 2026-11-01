"""Safe, non-executing static checks over PR diff text (Phase 06).

Never executes student code. Operates only on diff text (fetched from GitHub
or injected in tests) plus submission metadata. Every check returns explicit
evidence; unavailable inputs produce `skipped` with a reason, never a pass
by assumption. Secrets are redacted before anything leaves this module toward
the model reviewer.
"""

from __future__ import annotations

import re

SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*['\"]?[A-Za-z0-9_\-./+]{8,}"),
    re.compile(r"sk-(live|test)-[A-Za-z0-9]{8,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{10,}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
]

MAX_DIFF_CHARS = 200_000


def redact_secrets(text: str) -> str:
    redacted = text
    for pat in SECRET_PATTERNS:
        redacted = pat.sub("[REDACTED]", redacted)
    return redacted


def diff_stats(diff_text: str) -> dict:
    files = set()
    added = removed = 0
    for line in diff_text.splitlines():
        if line.startswith("+++ b/") or line.startswith("--- a/"):
            files.add(line[6:])
        elif line.startswith("+") and not line.startswith("+++"):
            added += 1
        elif line.startswith("-") and not line.startswith("---"):
            removed += 1
    return {"files_changed": len(files), "lines_added": added, "lines_removed": removed}


def run_static_checks(diff_text: str | None, head_sha: str) -> dict:
    """Run safe checks. Returns {"checks": [...]} with status pass/fail/skip."""
    checks: list[dict] = []
    if diff_text is None:
        checks.append(
            {
                "name": "diff_available",
                "status": "skip",
                "detail": "No diff available (GitHub App not configured and no diff supplied). "
                "Static checks cannot run; this blocks approval until resolved.",
                "blocking": True,
            }
        )
        return {"checks": checks, "stats": {}, "redacted_diff": ""}
    if len(diff_text) > MAX_DIFF_CHARS:
        checks.append(
            {
                "name": "diff_size",
                "status": "fail",
                "detail": f"Diff is {len(diff_text)} chars, over the {MAX_DIFF_CHARS} limit. Split the PR.",
                "blocking": True,
            }
        )
        return {"checks": checks, "stats": {}, "redacted_diff": ""}
    stats = diff_stats(diff_text)
    checks.append({"name": "diff_available", "status": "pass", "detail": f"{stats['files_changed']} files, +{stats['lines_added']}/-{stats['lines_removed']}.", "blocking": False})

    secrets_found = [pat.pattern[:24] for pat in SECRET_PATTERNS if pat.search(diff_text)]
    checks.append(
        {
            "name": "secret_scan",
            "status": "fail" if secrets_found else "pass",
            "detail": "Possible committed secret — remove and rotate it." if secrets_found else "No secret patterns detected.",
            "blocking": bool(secrets_found),
        }
    )

    if re.search(r"(?i)\b(WIP|DO NOT MERGE|FIXME\s*:\s*merge)\b", diff_text):
        checks.append(
            {"name": "wip_marker", "status": "fail", "detail": "WIP/do-not-merge marker present.", "blocking": True}
        )
    else:
        checks.append({"name": "wip_marker", "status": "pass", "detail": "No WIP markers.", "blocking": False})

    return {"checks": checks, "stats": stats, "redacted_diff": redact_secrets(diff_text)}
