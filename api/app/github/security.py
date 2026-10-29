"""GitHub App integration helpers (Phase 05).

Webhook authenticity is verified with HMAC-SHA256 over the RAW request body
before any JSON parsing or processing. Installation tokens are minted from the
App private key only when App credentials are configured; without them the
server refuses live GitHub calls (fail-closed) while manual repo linking and
synthetic signed deliveries keep local development testable.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import time
from pathlib import Path

import httpx
import jwt

TASK_KEY_RE = re.compile(r"\bAI-(\d{3})\b", re.IGNORECASE)
PR_URL_RE = re.compile(r"^https://github\.com/([^/]+)/([^/]+)/pull/(\d+)/?$")


class GithubNotConfigured(Exception):
    pass


def verify_signature(secret: str, raw_body: bytes, header: str | None) -> bool:
    """Constant-time check of the X-Hub-Signature-256 header."""
    if not secret or not header or not header.startswith("sha256="):
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", header)


def resolve_task_key(*texts: str | None) -> str | None:
    """Find the first AI-NNN ticket key in PR title/body/branch, if any."""
    for text in texts:
        if not text:
            continue
        m = TASK_KEY_RE.search(text)
        if m:
            return f"AI-{m.group(1)}"
    return None


def parse_pr_url(url: str) -> tuple[str, str, int] | None:
    """Parse https://github.com/<owner>/<repo>/pull/<n> or return None."""
    m = PR_URL_RE.match(url.strip())
    if not m:
        return None
    return m.group(1), m.group(2), int(m.group(3))


def _read_private_key(path: str) -> str:
    key_file = Path(path)
    if not key_file.is_file():
        raise GithubNotConfigured(f"GitHub App private key not found: {path}")
    return key_file.read_text()


def mint_app_jwt(app_id: str, private_key_path: str) -> str:
    now = int(time.time())
    return jwt.encode(
        {"iat": now - 60, "exp": now + 540, "iss": app_id},
        _read_private_key(private_key_path),
        algorithm="RS256",
    )


def get_installation_token(
    app_id: str,
    private_key_path: str,
    installation_id: int,
    api_url: str = "https://api.github.com",
) -> tuple[str, str]:
    """Exchange the App JWT for an installation token. Returns (token, expires_at)."""
    if not app_id or not private_key_path:
        raise GithubNotConfigured("GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY_PATH not set")
    app_jwt = mint_app_jwt(app_id, private_key_path)
    res = httpx.post(
        f"{api_url}/app/installations/{installation_id}/access_tokens",
        headers={
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github+json",
        },
        timeout=15,
    )
    res.raise_for_status()
    data = res.json()
    return data["token"], data.get("expires_at", "")


def fetch_pr_head_sha(
    api_url: str,
    token: str,
    owner: str,
    repo: str,
    pr_number: int,
) -> tuple[str, str, str, str]:
    """Return (head_sha, state, head_ref, base_ref) for a PR. Raises on error."""
    res = httpx.get(
        f"{api_url}/repos/{owner}/{repo}/pulls/{pr_number}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        timeout=15,
    )
    res.raise_for_status()
    pr = res.json()
    return pr["head"]["sha"], pr["state"], pr["head"]["ref"], pr["base"]["ref"]
