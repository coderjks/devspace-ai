#!/usr/bin/env python3
"""Sign and POST a synthetic pull_request webhook delivery to a local API.

Local development only. The server code path is identical to production;
only the delivery origin differs. Usage:

    GITHUB_WEBHOOK_SECRET=local-dev-secret python scripts/simulate_webhook.py \
        --repo student/internship --pr 7 --sha <40-hex> --task AI-001
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sys
import urllib.request
import uuid


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:8000")
    ap.add_argument("--repo", required=True)
    ap.add_argument("--pr", type=int, required=True)
    ap.add_argument("--sha", required=True)
    ap.add_argument("--task", default="AI-001")
    ap.add_argument("--action", default="synchronize")
    args = ap.parse_args()

    secret = os.environ.get("GITHUB_WEBHOOK_SECRET", "")
    if not secret:
        print("GITHUB_WEBHOOK_SECRET is required", file=sys.stderr)
        return 2

    payload = {
        "action": args.action,
        "number": args.pr,
        "repository": {"full_name": args.repo, "id": 1},
        "pull_request": {
            "number": args.pr,
            "title": f"[{args.task}] Simulated submission",
            "body": "Local synthetic delivery.",
            "state": "open",
            "merged": False,
            "head": {"sha": args.sha, "ref": f"{args.task.lower()}-work"},
            "base": {"ref": "main"},
        },
    }
    body = json.dumps(payload).encode()
    sig = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    req = urllib.request.Request(
        args.base.rstrip("/") + "/api/github/webhook",
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-GitHub-Event": "pull_request",
            "X-GitHub-Delivery": uuid.uuid4().hex,
            "X-Hub-Signature-256": sig,
        },
    )
    with urllib.request.urlopen(req) as res:
        print(res.status, res.read().decode())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
