---
name: build-screen
description: Implement one DevSpace AI screen from automation/screens-library via lead-orchestrated frontend/backend/QA subagents, then stop for approval.
---

# Build-Screen

Use this skill when the developer names a screen ID (e.g. `Implement page-03 using build-screen`).
Implement exactly one screen per run, then stop. No auto-advance, no merge/push/deploy.

## 0. Load authority (in order)

1. `AGENTS.md`, 2. `docs/design/design-system.md`, 3. relevant PRD sections for the screen,
4. `docs/progress.md` phase + gate, 5. `automation/orchestrator.md` (roles, lifecycle, contracts),
6. `automation/screens-library/screens.json` entry for the requested ID.

## 1. Resolve and validate

- Find the screen in `screens.json`; record id, title, phase, prompt path, reference path, `depends_on`.
- Verify the prompt file and reference image exist and are readable. If either is missing: report it, stop before touching application code, never invent a replacement.
- Confirm dependency screens are implemented in the repo; if not, report and stop.
- Read only this screen's prompt + image + the supporting project files the plan needs. Never load all 18 prompts.

## 2. Prepare a bounded plan

- Inspect existing routes, API contracts, and models; decide whether the screen is new, partial, or already implemented.
- List the frontend work, backend work (or "none — reuse X"), and the verification commands.
- Write the plan and the API contract (endpoints, request/response, validation, error/loading states, DB changes) before spawning builders.

## 3. Delegate with contracts

Spawn via `muse.subagent_spawn` (`general-purpose`), one focused objective each:

- `fe-<id>`: screen prompt requirements, reference image path, deliverables, owned files, API contract, acceptance criteria, test expectations, excluded scope. Must not alter backend contracts.
- `be-<id>`: endpoints, schemas, migrations, auth rules, owned files, tests, excluded scope. Only when backend work exists.
- `qa-<id>`: acceptance criteria, contract-compatibility review, commands to run, themes/a11y/responsive checks. Spawns after integration.

Every delegation carries the §4 contract from `automation/orchestrator.md`.
Use `worktree_isolation: true` when two writers run in parallel; serialize otherwise.
Keep each child's context minimal: screen excerpt + contract + file list.
Worktree caveat (verified): `git worktree add <path> <checked-out-branch>` fails —
use `--detach <commit>` or a fresh branch name for the isolation worktree.

## 4. Integrate, verify, report

- Integrate workstreams; check API compatibility, auth, and error handling end to end.
- Run lint, type checks, relevant tests, and build. Tests must execute before being reported passed.
- Update `automation/orchestration-state.json` (screen status, verification, blockers, approval: `awaiting_approval`).
- Update `docs/progress.md` (change log) and `docs/handoff.md` (gate/state) when state moved.
- Emit the Stage-6 completion report: screen, per-agent work, files changed, API/DB changes, test outcomes, acceptance-criteria status, remaining issues, recommended next action.

## 5. Phase-aware selection ("Build next screen")

Read `automation/execution-plan.yaml`, then `automation/orchestration-state.json`,
then reconcile both against the repo (routes, components, tests, `git log`).

- Walk phases in plan order; within a phase walk `screens` in listed order
  (plan order wins over manifest numbering). Optional screens (`screen_optional`)
  build only on explicit request — they never block the phase.
- The next eligible screen is the first one whose status is not `approved`,
  whose `depends_on` screens are all `approved`, and whose prompt + image validate.
- Never mark a screen `approved` because its components exist: `done-prior`
  means implemented outside this workflow and still needs QA validation +
  explicit approval before it counts.
- A phase with empty `screens` is a manual gate, never auto-completed: report its
  `non_ui_deliverables` with evidence (or their absence) and wait for approval.
- Never skip an unapproved screen without an explicit developer decision; record
  skips with the reason in the state file.

## 6. Supported intents (natural language — no invented slash commands)

- `Show roadmap` — render the 12-phase plan with per-screen status from the state file.
- `Show current progress` — current phase, active screen, approved/pending/blocked counts, last verification.
- `Build next screen` — run the §5 selection, then the normal §§1–4 single-screen flow.
- `Build page-XX` — build that screen if its dependencies are approved; otherwise report the blocker and stop.
- `Resume current screen` — re-inspect code + Git, resume only the unfinished workstream.
- `Validate current screen` — QA pass only, no implementation; flips `done-prior`/`implemented` to `approved` only via explicit approval afterwards.
- `Approve current screen` — record explicit developer approval; never self-approved by the lead or QA.

## 7. Stop

End at the approval gate. State the exact command to resume or start the next screen, and wait.
