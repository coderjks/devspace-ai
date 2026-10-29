# DevSpace AI — Lead Orchestrator

Reusable, repository-driven multi-agent workflow for implementing screens from
`automation/screens-library/`. This file defines the architecture; the executable
entry point is the [`build-screen`](../.agents/skills/build-screen/SKILL.md) project skill.

## 1. Authority order

1. `AGENTS.md` — binding engineering constraints (never overridden by this file).
2. `docs/prd/requirements.md` v2.2.1 — product behavior and acceptance criteria.
3. `docs/prompts/build-playbook.md` — phase sequence; screens are views, not phases.
4. `docs/design/design-system.md` — visual authority when a reference image differs from tokens.
5. `automation/screens-library/screens.json` — screen catalog (ids, prompts, images, dependencies).
6. The active screen prompt + reference image — visual direction and scope for one screen only.

Reference images are layout concepts, never proof that displayed data exists.
Do not fabricate data, testimonials, metrics, or AI evaluations to match an image.

## 2. Environment capabilities (verified, not assumed)

| Capability | Mechanism | Status |
|---|---|---|
| Invoke subagents from the lead | `muse.subagent_spawn` (`role`, `objective`, `output_schema`, `task_name`, `command_id`) | SUPPORTED |
| Read-only analysis children | Same tool with a read-only objective; no write tools granted separately — scope is enforced by the objective text and lead review | SUPPORTED (by contract) |
| Isolated Git worktrees | `git worktree` (v2.55.0); `worktree_isolation: true` on spawn for parallel writers | SUPPORTED |
| Pass task descriptions + file refs | `objective` text + `output_schema` (`required_fields`, `schema_ref`) | SUPPORTED |
| Subagents inspect images | Children inherit Work tools; `muse.read_file` renders images model-visible | SUPPORTED |
| Lead receives results | `muse.subagent_wait` / delivered result envelope (`ref`, `text`, `data`, `error_kind`) | SUPPORTED |
| Reusable skills | Markdown `SKILL.md` with `name`/`description` frontmatter under `.agents/skills/`; loaded via `read_skill` | SUPPORTED |
| Custom persistent agent identities | None in this environment (catalog: `general-purpose`, `workflow-subagent`) | NOT SUPPORTED — roles are contract blocks in §3, instantiated per spawn |

Writing a Markdown role description does **not** register an executable subagent.
A role becomes real only when the lead spawns it via `muse.subagent_spawn`
with that role's contract block in the objective.

## 3. Roles

### A. Lead Orchestrator (primary model: Muse Spark 1.3)

Owns the final integrated result. Reads the screen spec, inspects architecture,
defines scope and API contracts **before** parallel work, assigns file ownership,
integrates, evaluates tests, resolves or escalates blockers, writes the completion
report, and enforces the approval gate (§7). Never delegates contract decisions.

### B. Frontend Engineering Agent (`general-purpose`, task_name `fe-<screen-id>`)

Reads the screen prompt + reference image; implements the screen in existing
Next.js conventions reusing the shadcn/ui design system, both themes, responsive
layouts, restrained motion, validation and UI states; integrates against the
agreed API contract; adds frontend checks. Must not change backend contracts or
invent endpoints — missing backend is reported to the lead, not worked around.

### C. Backend Engineering Agent (`general-purpose`, task_name `be-<screen-id>`)

Implements endpoints, Pydantic schemas, business logic, persistence, and
Alembic migrations; enforces auth/ownership/validation; adds backend tests.
No duplicate endpoints/tables; no destructive or production migrations.

### D. QA and Integration Agent (`general-purpose`, task_name `qa-<screen-id>`)

Independently assesses the integrated result against the screen's acceptance
criteria: contract compatibility, functional requirements, automated tests
(actually executed), auth/unauthorized behavior, a11y, light/dark themes,
responsive rendering where tooling exists. Reports bugs and regressions; never
rubber-stamps another agent's completion report.

## 4. Task contract (every delegation carries all of these)

```
Screen ID + objective | requirements (screen prompt § refs) | reference image
path (frontend only) | deliverables | file ownership boundaries | API/interface
contract + dependencies | acceptance criteria | verification expectations |
explicitly excluded scope
```

Frontend and backend agents never edit the same files concurrently. Shared types,
auth middleware, routing, and schema decisions are owned by the lead before
parallel execution. Overlapping work runs in isolated worktrees
(`worktree_isolation: true`) or serialized with explicit handoff.

## 5. Execution lifecycle

**Stage 1 — Preparation.** Resolve screen ID in `screens.json`; validate prompt
+ image paths exist and are readable; check `depends_on` screens are implemented;
inspect existing code; determine frontend/backend work; detect already-implemented
screens (adapt, don't rebuild).

**Stage 2 — Contract definition.** Define endpoint contracts, request/response
shapes, validation, error/loading states, and DB changes first. Prefer existing
contracts. Record the contract in the completion report and
`automation/orchestration-state.json`.

**Stage 3 — Parallel development.** Spawn FE/BE agents only when genuinely
independent (contract + file ownership settled). Otherwise sequential. Never
parallelize for its own sake.

**Stage 4 — Integration (lead).** Merge workstreams, check API compatibility,
connect UI to real services, verify error handling and auth end to end.

**Stage 5 — Quality assurance.** QA agent runs the §3D checklist; tests must
execute before they are reported passed.

**Stage 6 — Completion report.** Screen, per-agent work, files changed, API/DB
changes, test outcomes, screenshot paths if any, acceptance-criteria status,
remaining issues, recommended next action.

**Stage 7 — Approval gate.** Stop. No next screen, no merge/push/deploy, no
production changes without explicit developer approval.

## 6. Phase-aware execution

`automation/execution-plan.yaml` orders the 12 phases and the screens inside
each phase (plan order wins over manifest numbering). `Build next screen`
walks the plan, reconciles with `orchestration-state.json` and the repo, and
picks the first unapproved screen whose dependencies are approved and whose
assets validate. Phases with no screens (08, 11, 12) are manual gates with
listed deliverables — never auto-completed. See the `build-screen` skill §§5–6.

## 7. State and recovery

`automation/orchestration-state.json` tracks screen status, workstreams,
verification, blockers, and approval. It is a progress pointer, not proof —
code and test results are the source of truth. On restart: inspect code + Git,
resume only what is necessary, never repeat migrations or overwrite done work.

## 8. Cost discipline

Small focused tasks; never send the full PRD or all 18 prompts to a child —
each child gets its screen prompt excerpt, contract, and file list only.
Escalation to Muse Wonder is proposed to the developer, never taken silently.
