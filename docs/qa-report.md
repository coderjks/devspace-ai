# DevSpace AI — QA Report (Phase 11)

**Date:** 2026-10-29 · **Branch:** `feat/11-qa` · **Scope:** full-stack verification, no new features.
**Method:** repo test suite + live local stack (API :8000, web :3000, Postgres 16, Redis 7) + synthetic signed deliveries + fixture WAVs. Nothing was verified against real github.com, a live Meta model, or live STT/TTS (no credentials) — those stay UNTESTED.

## 1. End-to-end journey (fresh user, live)

| Step | Result | Evidence |
|---|---|---|
| Register → enroll | PASS | 201/201, live |
| Start work todo→in_progress | PASS | 200 (fails honestly with 409 when state was polluted — reset to seed, documented in §4) |
| Tech Lead chat | PASS | 200, reply persisted |
| Voice session + typed turn + submit | PASS | 201/201/200, mock reply + WAV audio returned |
| Standup propose → confirm, blocker shared | PASS | 201/200, `blocker_shared: true` |
| Blocker on task + in Tech Lead conversation | PASS | `blocked_reason` set; system message present |
| Repo link + PR submit | PASS | 201/201 |
| Eval trigger → real Redis queue → worker | PASS | job payload pins (submission, SHA); processed `evaluated` |
| Bad PR denied + remediation, no secret dump | PASS | `secret_scan` blocking; hints [1,2,3]; `sk-live` absent |
| Fixed PR approved, unlocks AI-002+AI-003 | PASS | decision approved; exactly-once (repeat 200, new key 409) |
| Progress / eligibility / check-in / notifications / competencies / retro | PASS | all agree with records (1 approved, 1 denied) |
| Negative probes (unauth, forged webhook, cross-user) | PASS | 401/401/404 as appropriate |

One script-side miss: re-requesting approval with a *regenerated* key correctly returned 409 (script error, not app error — same-key idempotency is covered by `test_fixed_pr_approves_and_unlocks_exactly_once`).

## 2. Automated gates

| Check | Result |
|---|---|
| `pytest tests/api/` | PASS — 101 passed (added hostile-diff injection test) |
| `ruff check api/app` | PASS |
| `mypy api/app` | PASS — 48 files |
| `tsc --noEmit` (web) | PASS |
| `npm run build` (web) | PASS — all routes compile, incl. /voice, /learning, /progression, /submissions/[id] |

## 3. Security audit

| Area | Result | Evidence |
|---|---|---|
| Auth/ownership scoping | PASS | per-endpoint tests: activity, submissions, evaluations, approvals, remediation, voice, insights all owner-scoped; cross-user → 404 |
| Webhook HMAC + idempotency | PASS | forged → 401; duplicate delivery → no-op; unlinked/unresolvable → acked+ignored; 11 webhook tests |
| SHA freshness / stale jobs | PASS | stale → `stale` evaluation, no overwrite; duplicate → same row; fixed in worker + policy tests |
| Malformed review / reviewer crash | PASS | recorded as error, never coerced; policy denies on review error |
| Prompt injection | PASS | hostile diff (fake `[SYSTEM]` approval, `os.system`) treated as plain text; no execution; `policy_decision` stays unset |
| Secrets | PASS | repo scan: only scanner regexes; `.env` gitignored, nothing tracked; no `NEXT_PUBLIC_*` keys; redaction before review |
| Voice consent / retention | PASS | consent=false → 422; no-consent session → 403 upload; sessions+transcripts deletable; raw audio never stored (`audio_stored` always false) |
| Transactions / exactly-once | PASS | approval+unlock+competency+remediation in one transaction; unique(submission_id)+idempotency key; 409 on conflict |
| Rate limiting | DEFERRED | No rate limits on auth/webhook/voice endpoints. Recommended before any public deployment (Phase 12). |
| Voice retention auto-purge | DEFERRED | `VOICE_RETENTION_DAYS` configured; no purge job — manual delete only. Acceptable for hackathon; schedule before production. |
| Sandbox execution | DISABLED (by design) | No code execution anywhere; static checks only. Documented in progress.md. |

## 4. Test-data hygiene finding (fixed)

Live E2E runs mutate the shared dev sprint (global task statuses) and enqueue real Redis jobs. During this phase a polluted `AI-001=approved` state caused an honest 409 mid-journey. Fixed by resetting the dev DB to seed + flushing the queue; procedure (status reset, delete non-demo users, flush `devspace:eval:jobs`) is now part of the demo reset routine for Phase 12. No app change needed — the API behaved correctly throughout.

## 5. Accessibility spot-check (static)

All inputs on new pages (`/voice`, `/github`, `/learning`, `/progression`, `/submissions/[id]`) carry `aria-label`, wrapping `<label>`, or `htmlFor`; status regions use `role="alert"`/`role="status"`/`aria-live`; reply playback includes a text fallback for unsupported audio. No automated axe run (no browser tooling in this environment) — recommend one in Phase 12. No blocking issues found.

## 6. Status labels

- `LIVE` (local): auth, sprints/tasks, chat (mock), standups, activity feed, GitHub pipeline w/ synthetic deliveries, evaluation pipeline + worker, policy/unlock, voice pipeline (typed + fixture STT), insights.
- `MOCK`: LLM replies, AI review findings, STT (fixtures only), TTS (tone).
- `DISABLED`: sandbox execution.
- `DEFERRED`: rate limits, retention purge, Hindi-English live recognition quality.
- `UNTESTED`: real github.com delivery, live Meta model, live STT/TTS, production deploy, automated axe run, dark-theme pixels, reload-restore.
