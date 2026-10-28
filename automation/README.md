# Automation — Screen Orchestration

## What lives here

- `orchestrator.md` — architecture, roles, lifecycle, contracts (read before running).
- `subagent-contracts.md` — exact spawn blocks for the frontend/backend/QA agents.
- `orchestration-state.json` — lightweight progress pointer (screen statuses, verification, blockers, approval).
- `screens-library/` — screen manifest + prompts + reference images. **Gitignored by repo policy** (contains supplied PNGs); preserved in place as local source artifacts, never committed.

## Run a screen

1. Say which screen: `Implement page-04 using build-screen`.
2. The lead loads the `build-screen` skill, resolves the screen in `screens-library/screens.json`, validates prompt + image, and posts a bounded plan + API contract.
3. Frontend/backend agents build in owned files (isolated worktrees when parallel); the lead integrates; QA verifies independently.
4. You get a completion report. Approve explicitly before the next screen.

## Inspect results

- `git status` / `git diff --stat` — what changed (work stays uncommitted until you approve a commit).
- `automation/orchestration-state.json` — screen status and verification summary.
- Completion report in chat — per-agent work, tests, acceptance-criteria status, remaining issues.

## Approve a screen

Reply `approve page-XX` (or request fixes). Approval never implies merge/push/deploy — those need their own explicit instruction.

## Resume after a failure

Point at the screen: `Resume page-XX — <what broke>`. The lead re-inspects code + Git state, trusts test output over the state file, and resumes only the unfinished workstream. It never repeats migrations or overwrites completed work.
