# DevSpace AI — Product Requirements Document (PRD)

**Hackathon MVP — Product Requirements & System Architecture**

Version 2.2.1 | 27 October 2026 | Indie Developer Track | Canonical working specification

Mission: Give students without access to conventional internships a realistic, verifiable AI engineering workplace simulation. The experience is a simulation, not employment or an accredited internship by default.

## Canonical implementation contract (v2.2.1 synchronization)

This Markdown file is the **product and acceptance-criteria source of truth**. `AGENTS.md` defines durable engineering constraints; `docs/prompts/build-playbook.md` defines execution order and phase gates. Later numbered amendments in this PRD supersede older sections where they differ. In particular, **Section 21 voice P0 requirements supersede the earlier scope table**. Do not implement the legacy Section 18 one-shot prompt instead of the staged playbook.

**MVP invariant:** exactly one fully specified six-ticket sprint (AI-001 through AI-006) plus a visible 12-week roadmap; five AI teammates plus a distinct Learning Assistant, implemented through one orchestrator; a real GitHub PR with verified webhook and SHA-pinned checks; deterministic approval/unlock; and P0 push-to-talk voice standups and Tech Lead discussions with text fallback.

**External AI models:** Model IDs, endpoints, quotas, prices, tool/JSON capabilities, and STT/TTS access must be verified for the user's account before claiming live integration. Muse Wonder and Muse Spark 1.3 are *optional configurable model routes*, not dependencies for a successful build; use a mock provider only when prominently marked. Coding IDE model choice is separate from runtime routing.

**Delivery:** 12 gated phases, Prompt 00, and API preflight as defined in `docs/prompts/build-playbook.md`; verify each phase before proceeding.

# 1. Executive decision

Build a feature-broad but depth-limited hackathon prototype: one student, one AI customer-support backend project, one complete six-ticket sprint, five role-configured AI teammates plus a separate AI Learning Assistant, real GitHub pull-request evaluation, and a deterministic unlock policy. The 12-week experience remains the product roadmap, not a requirement for the hackathon demo.

# 2. Personas, outcomes and positioning

- Primary: final-year Tier 2/3 Indian engineering student with basic Python; beginners enter a preparatory foundation path.

- Student outcome: finish real GitHub tasks, explain decisions, receive review feedback and show a verifiable portfolio.

- Hackathon judge outcome: observe an end-to-end agentic workflow that uses model reasoning for feedback and adaptive remediation.

- Business buyer later: students directly, then college placement/training departments.

# 3. Scope and priorities

| Priority | Capability                            | Acceptance criteria                                                                                                                                                                     |
|----------|---------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| P0       | Sign-in + onboarding                  | Student can create a profile, select Applied AI Engineering, and enter a seeded cohort.                                                                                                 |
| P0       | Curriculum + task board               | One sprint with six tickets, prerequisites, acceptance criteria and statuses.                                                                                                           |
| P0       | AI teammates + standup                | Engineering Manager, Tech Lead, Senior Engineer, QA Engineer and Scrum Master use shared task and project state; a separate Learning Assistant provides guided hints; standup is saved. |
| P0       | GitHub PR integration                 | Student links repository; webhook maps a PR to a ticket; immutable head SHA recorded.                                                                                                   |
| P0       | Code evaluation                       | Trusted tests/checks plus structured LLM review; evaluation tied to exact SHA.                                                                                                          |
| P0       | Task progression                      | Backend unlocks dependent tasks only after trusted approval; retries and overrides audited.                                                                                             |
| P0       | Voice standup and Tech Lead discussion | Push-to-talk, editable transcript, spoken reply, shared text/voice context, confirmation before state changes, accessible text fallback. |
| P0       | Hint assistant                        | Progressive hints, no full solution or hidden-test leakage; task-specific context.                                                                                                      |
| P1       | Adaptive remediation                  | Failed review generates a bounded practice task tagged to a skill gap.                                                                                                                  |
| P1       | Progress dashboard                    | Shows completed tasks, attempts, skills and review history.                                                                                                                             |
| P2       | Beginner foundations                  | Diagnostic and one short starter module; full beginner curriculum later.                                                                                                                |
| Later    | Payments, B2B portal, 12-week content | Out of hackathon scope.                                                                                                                                                                 |

# 4. Golden-path demo (must work live)

- Student signs in, joins the Applied AI Engineering virtual team, sees sprint board and receives a ticket.

- Student completes a **spoken Scrum Master standup**, reviews and confirms a blocker, and asks the **Tech Lead by voice** about the same task; text conversation retains context.

- Tech Lead explains task context; student opens a GitHub PR with an intentional authorization bug.

- GitHub webhook queues evaluation; automated test detects issue; AI reviewer explains issue and links to relevant code.

- Mentor provides a hint without writing the fix; optional remediation task practices authorization.

- Student pushes a new commit; evaluation reruns against new SHA; approval unlocks next dependent ticket.

- Progress page displays audit trail, competency signal, and completed work.

# 5. Curriculum and sample sprint

Project: AI-powered customer support backend. Starter repository: FastAPI, PostgreSQL, seeded tickets, pytest, Dockerfile, GitHub Actions, README and intentional TODOs.

| Ticket | Task                                      | Dependency / assessment                      |
|--------|-------------------------------------------|----------------------------------------------|
| AI-001 | Implement ticket creation REST API        | Schema validation, tests                     |
| AI-002 | Add authorization to ticket access        | AI-001; hidden negative-access tests         |
| AI-003 | Integrate LLM ticket summarization        | AI-001; structured output and error handling |
| AI-004 | Add retrieval over support knowledge base | AI-003; retrieval relevance fixture          |
| AI-005 | Add safe order lookup tool                | AI-002; tool permissions and audit           |
| AI-006 | Evaluation and monitoring                 | AI-004; golden dataset and latency metrics   |

# 6. Functional requirements

- FR-01: A student can view active, locked, blocked, in-review and approved tickets with explicit prerequisites.

- FR-02: AI personas have distinct instructions but read the same authoritative project state and student history.

- FR-03: Standup records yesterday/today/blockers and can update ticket status only through authorized backend actions.

- FR-04: PR webhook verification checks GitHub signature; delivery is idempotent and stores repository, PR, SHA and ticket.

- FR-05: Evaluation executes allowlisted test commands in an isolated ephemeral environment with resource/network restrictions.

- FR-06: LLM reviewer produces schema-validated JSON: findings, severity, evidence, skill tags and review recommendation.

- FR-07: Deterministic policy controls approval; failed tests or unresolved blockers prevent unlocking.

- FR-08: Hint service uses escalating levels: question, conceptual hint, targeted diagnostic; never exposes solution patch.

- FR-09: Remediation uses approved templates or constrained generation and requires a fresh assessment.

- FR-10: Student can see evidence, appeal false negatives, and retry without losing prior attempts.

# 7. Nonfunctional and trust requirements

- Security: never run student code on the API host; sandbox CPU/memory/time limits, no production secrets, deny outbound network by default.

- Privacy: minimal personal data, consent for GitHub access, retention/deletion controls, avoid sending secrets or unnecessary student data to models.

- Reliability: webhook deduplication, retry with backoff, dead-letter queue, graceful failure and visible evaluation status.

- Auditability: persist model version, prompt template version, test suite version, SHA, policy version and decision reason.

- Accessibility: mobile-responsive UI, low-bandwidth support, clear English; regional language support later.

- Cost: quota per student, token budget, model routing, caching and capped evaluations per task.

- Honesty: label simulated internship clearly; no employment or placement guarantee.

# 8. Recommended architecture

Next.js frontend → FastAPI modular monolith → PostgreSQL. Redis-backed worker handles webhook evaluation and model calls. GitHub App handles repository/PR permissions. Isolated runner executes test suites. Meta model access sits behind an LLM gateway with model-agnostic interface, quotas and structured output validation. No microservices or autonomous agent swarm needed for hackathon.

Logical modules: auth, students, enrollment, curriculum, sprints, tasks, github, evaluations, agents, mentoring, skills, progress, audit. One orchestrator selects role prompt + tools + shared state; persona does not own independent truth.

# 9. Event and evaluation sequence

- 1\. GitHub sends pull_request opened/synchronize event; backend verifies signature and stores delivery id.

- 2\. Resolve repository/branch/PR to task; create Evaluation(status=queued, sha=head_sha).

- 3\. Worker checks out exact commit in sandbox; runs lint, unit and hidden tests; collects bounded logs.

- 4\. LLM receives sanitized diff, task rubric, relevant logs and produces validated review JSON.

- 5\. Policy engine checks trusted test status, security blockers, required criteria and SHA freshness.

- 6\. Persist evaluation and decision atomically; update ticket status; publish UI notification.

- 7\. If failed, mentor can reference findings and remediation engine can assign bounded practice.

- 8\. If approved and SHA remains latest, unlock tasks whose prerequisites are all approved.

# 10. Approval policy

Approval is not an LLM tool call. The server verifies: (a) evaluated SHA equals latest PR SHA, (b) build and required tests passed, (c) security checks passed, (d) review findings contain no unresolved blocking issues, (e) required rubric criteria satisfied, and (f) no pending newer evaluation. Use a database transaction and unique idempotency key. Human override requires reason and audit record.

# 11. Data model

| Entity         | Key fields                                                                 |
|----------------|----------------------------------------------------------------------------|
| User           | id, email, role, created_at                                                |
| Enrollment     | id, user_id, track_id, status, skill_level                                 |
| Project        | id, starter_repo, curriculum_version                                       |
| Sprint         | id, project_id, starts_at, status                                          |
| Task           | id, sprint_id, key, rubric_json, status, prerequisites                     |
| RepositoryLink | id, user_id, github_installation_id, repo_id                               |
| Submission     | id, task_id, pr_number, head_sha, status                                   |
| Evaluation     | id, submission_id, sha, test_results, ai_review, policy_decision, versions |
| Conversation   | id, user_id, task_id, persona, messages                                    |
| SkillEvidence  | id, user_id, skill_key, evaluation_id, score                               |
| AuditEvent     | id, actor, action, object_id, timestamp                                    |

# 12. API contracts (suggested)

| Method / route                        | Purpose                           |
|---------------------------------------|-----------------------------------|
| POST /api/enrollments                 | Join internship                   |
| GET /api/sprints/current              | Board and dependencies            |
| GET /api/tasks/{id}                   | Task and rubric                   |
| POST /api/standups                    | Save standup                      |
| POST /api/agents/chat                 | Persona chat with task context    |
| POST /api/github/webhook              | Signed GitHub events              |
| GET /api/submissions/{id}/evaluations | Review history                    |
| POST /api/tasks/{id}/hint             | Progressive hint                  |
| GET /api/progress                     | Student competency and completion |
| POST /api/evaluations/{id}/appeal     | Flag incorrect assessment         |

# 13. Meta model integration

Use the Meta model endpoint and model identifiers available in your hackathon account; verify actual access, rate limits, tool-calling and structured-output support before implementation. Keep API credentials server-side. Build an LLMProvider interface with review_code(), respond_as_teammate(), generate_hint() and propose_remediation(). Validate all outputs against typed schemas. Never let generated text directly update approval state.

# 14. Solo build plan (8-day aggressive target)

| Day | Deliverable                                                 | Exit gate                                    |
|-----|-------------------------------------------------------------|----------------------------------------------|
| 1   | Repo, schemas, auth, seeded project                         | Student signs in and sees project            |
| 2   | Sprint board, tasks, standup                                | Board and task dependencies persist          |
| 3   | Five role-configured teammates, separate learning assistant | Task-aware responses; no solution leak       |
| 4   | GitHub App/webhook, submission linkage                      | Real PR linked to task                       |
| 5   | Sandbox tests, AI review                                    | Deterministic failure detected and explained |
| 6   | Policy unlock, remediation                                  | Fix PR → approve → next task unlocks         |
| 7   | End-to-end reliability, observability                       | Golden path passes 3 times                   |
| 8   | Deploy, demo, fallback recording                            | Working URL, video, README and pitch         |

# 15. Definition of done

- Demo student completes full golden path with a real GitHub PR and a real model-generated review.

- Five AI teammates demonstrate distinct workplace responsibilities; a sixth, separate Learning Assistant gives progressive hints. All share controlled project context.

- Failed PR cannot unlock task; passing newer commit can; stale approvals are rejected.

- No model API keys in client or student runner; webhook signatures verified.

- Demo can be replayed with seeded data; logs allow troubleshooting.

- README documents architecture, model usage, known limitations and honest simulation framing.

# 16. Known risks and fallbacks

| Risk                      | Mitigation / fallback                                                                        |
|---------------------------|----------------------------------------------------------------------------------------------|
| GitHub permissions delay  | Use a preinstalled GitHub App and seeded repository; do not fake PR evaluation.              |
| Sandbox setup delay       | Use managed ephemeral CI or isolated runner with fixed test commands.                        |
| Model review instability  | Typed JSON, retry, conservative fail-closed approval, saved example reviews for demo backup. |
| Too much scope            | Freeze feature development once golden path works; prioritize demo reliability.              |
| AI generated code defects | Contract tests, manual review of auth, webhook and unlock logic.                             |

# 17. First 90 minutes

- Create GitHub mono-repo with /web, /api, /worker, /curriculum, /infra and /docs.

- Write one sample task rubric and one failing pytest case for unauthorized access.

- Set up Next.js, FastAPI, PostgreSQL and a single health endpoint; commit and run tests.

- Confirm Meta model API connectivity using a server-side smoke test and structured JSON response.

- Create GitHub App with minimum required permissions; save secrets in local environment manager.

- Implement the golden path before visual polish.

# 18. Legacy starter prompt (superseded by the staged playbook)

Legacy reference only; for actual development use Prompt 00 and Phase 01 in `docs/prompts/build-playbook.md`. Original starter wording: Build the DevSpace AI hackathon MVP as a typed, testable monorepo. Stack: Next.js/TypeScript, FastAPI/Python, PostgreSQL, Redis worker. Start ONLY with project skeleton, database models, migrations, seed data, and API contracts. Include a sample Applied AI Engineering sprint and a failing authorization task. Follow modular monolith boundaries. Never expose API secrets. Add unit/integration tests and a README with exact setup commands. Stop after Phase 1 and list verification commands and remaining tasks. Do not implement GitHub or LLM orchestration until Phase 1 passes.

# 19. Post-hackathon roadmap

- Expand one sprint into a human-reviewed 12-week Applied AI Engineering curriculum.

- Add beginner diagnostic and four-week preparatory pathway.

- Introduce instructor escalation, student appeals and cohort operations.

- Pilot with 30–100 students and measure completion, independent skill gain, review accuracy and willingness to pay.

- Add institutional reporting and monetization only after validated learning outcomes.

# 20. AI Team Architecture — v2.1 Amendment

This section supersedes any earlier reference to only three AI teammates. The hackathon prototype includes five distinct workplace teammates and one separate learning assistant. They are six role configurations within one orchestrator, not six separately deployed autonomous services.

## 20.1 Six personas and responsibilities

| Persona                  | Responsibilities                                                                       | Allowed tools                                              | Boundaries                                                   |
|--------------------------|----------------------------------------------------------------------------------------|------------------------------------------------------------|--------------------------------------------------------------|
| Engineering Manager      | Onboarding, goal setting, progress check-ins, retrospective feedback                   | read_progress, read_skill_summary, record_checkin          | Cannot approve PRs or change grades                          |
| Tech Lead                | Architecture discussion, task clarification, dependencies, planning                    | read_project, read_tasks, propose_task_plan                | Cannot reveal reference implementations or bypass task gates |
| Senior Software Engineer | Debugging guidance, code-quality feedback, progressive technical hints                 | read_pr_summary, read_review, propose_hint                 | Cannot directly commit fixes or unilaterally approve         |
| QA Engineer              | Edge-case questions, acceptance-criteria coverage, test gap feedback                   | read_test_results, read_acceptance_criteria, suggest_tests | Cannot change trusted test outcomes                          |
| Scrum Master             | Async standups, blocker tracking, sprint retrospectives                                | read_sprint, record_standup, flag_blocker                  | May update task status only through authorized backend rules |
| AI Learning Assistant    | Concept explanations, Socratic questioning, progressive hints and remediation guidance | read_skill_gaps, read_task_context, propose_hint           | No full task solution, hidden tests, or reference code       |

## 20.2 Agent runtime and shared context

- Frontend selects persona_id; backend validates student enrollment and tool permissions. Agent Orchestrator loads versioned role configuration, student/task context and relevant conversation summary.

- All six personas call one Meta model provider adapter. Shared facts live in PostgreSQL (task state, reviews, progress, sprint events); persona-specific chat histories are isolated by conversation_id.

- Agent tool calls are validated against server-side allowlists and user permissions. All mutations are audited. No agent may directly mark a task approved or bypass the progression policy.

- For hackathon reliability, agents respond on demand; do not run autonomous background conversations or parallel agent loops. The learning assistant is explicitly not a simulated coworker.

- Prompt-injection defense: treat repository text, comments and user messages as untrusted inputs. Never pass secrets, hidden tests or model credentials into prompts.

## 20.3 Functional requirements and acceptance criteria

- AG-01 — Student sees all five teammates with distinct names, roles and responsibilities on a Team page.

- AG-02 — Student can open separate chat threads; each reply cites the relevant current ticket or sprint context when applicable.

- AG-03 — Engineering Manager conducts onboarding and records a goal-setting check-in.

- AG-04 — Scrum Master runs an asynchronous standup; saved blockers appear on the sprint board.

- AG-05 — Tech Lead discusses design tradeoffs and clarifies acceptance criteria without supplying finished code.

- AG-06 — Senior Engineer and QA Engineer give different feedback grounded in the same PR and evaluation results.

- AG-07 — Learning Assistant offers up to three graduated hints; solution leakage is checked by tests and manual review.

- AG-08 — Failed evaluation can produce a bounded remedial challenge tied to a competency; passing the original task remains required.

- AG-09 — Unauthorized agent attempts to approve a task or access hidden tests are rejected and audited.

- AG-10 — Every AI interaction has a timeout, retry/error state, model usage logging and safe fallback message.

## 20.4 API and data model additions

- GET /api/team — returns five workplace personas and separate learning assistant metadata.

- POST /api/agents/{persona_id}/messages — validated chat request; returns answer, referenced task IDs, optional suggested actions.

- GET /api/agents/{persona_id}/conversations — lists student-owned conversation threads.

- POST /api/standups — records yesterday/today/blockers, linked to sprint and student.

- POST /api/learning/hints — returns hint_level 1–3, associated task_id and audit metadata.

- Database: agent_profiles (role, version, allowed_tools); conversations; messages; standups; agent_tool_audit; hint_events. Link records to student_id, enrollment_id and optional task_id.

## 20.5 Updated hackathon sequencing

1.  Day 1–2: Existing foundation, seeded sprint, task board and student onboarding.

2.  Day 3: Create all five teammate personas, Team page, shared context and Scrum Master standup. Add Learning Assistant as a separate panel.

3.  Day 4–5: GitHub PR association, isolated test runner, Meta-powered review and deterministic progression.

4.  Day 6: Add skill-gap remediation and role-specific reviewer/QA conversations using actual review evidence.

5.  Day 7: End-to-end tests, prompt-leak tests, permission checks, UX polish and error recovery.

6.  Day 8: Demo rehearsal and submission; cut secondary UI polish before risking the PR-to-approval flow.

## 20.6 Definition of done for the six-role experience

All five teammates are visible and respond differently to the same task. The Learning Assistant is clearly separate, gives progressive hints, and does not disclose a complete solution. Scrum standup persists blockers. Manager check-in persists goals. Reviewer and QA ground feedback in real evaluation records. An agent cannot unlock a task without trusted evaluation results. The complete student → PR → review → hints → revision → approval journey works twice consecutively.

# 21. Voice-Enabled AI Workplace — v2.2 Amendment

Status: Approved for hackathon scope. This amendment extends, rather than replaces, the five AI teammates and separate Learning Assistant defined in section 20. Voice is an optional interface to the existing agents, not a separate agent system.

## 21.1 Product goal and principles

- Let students speak naturally with AI teammates during daily standups, technical discussions and learning support while keeping project state consistent across voice and text.

- Every voice session must be accessible through an equivalent text workflow. Spoken fluency, accent or microphone quality must not determine technical competency scores.

- Voice actions are grounded in current task, sprint, pull request and blocker context. Agent responses may propose changes, but consequential updates require explicit user confirmation and server-side authorization.

- Prioritize a reliable turn-based experience over simultaneous multi-party, low-latency speech-to-speech conversations.

## 21.2 Feature priorities and role coverage

| Experience                                    | Priority     | Hackathon acceptance criterion                                                                                                   |
|-----------------------------------------------|--------------|----------------------------------------------------------------------------------------------------------------------------------|
| Scrum Master: spoken daily standup            | P0           | Record speech, transcribe, respond aloud, propose blocker/progress updates; update board only after confirmation.                |
| Tech Lead: one-on-one technical discussion    | P0           | Student asks task-specific question by voice; agent uses active ticket context and speaks a grounded reply.                      |
| Engineering Manager: onboarding and feedback  | P1           | Voice mode available for onboarding and progress review, using shared context.                                                   |
| Senior Engineer: debugging and PR walkthrough | P1           | Agent discusses actual PR feedback and offers progressive hints, not a full solution.                                            |
| QA Engineer: test and edge-case discussion    | P1           | Agent asks about acceptance criteria and testing; does not override automated checks.                                            |
| Learning Assistant: spoken tutoring           | P1           | Agent provides concept explanations and tiered hints, with transcript and text alternative.                                      |
| Engineering Design Review                     | P2 / stretch | Short oral or text defense of a submitted PR; follow-up questions refer to actual diff; assessment is advisory and non-punitive. |
| Simultaneous multi-agent voice meeting        | Out of scope | Do not implement in hackathon MVP.                                                                                               |

## 21.3 User stories

- As a student, I can start and stop a microphone session, view live or completed transcripts, and switch to text without losing conversation context.

- As a student, I can conduct a daily standup verbally and review a structured summary before the system records my progress and blockers.

- As a student, I can ask the Tech Lead about my assigned ticket and receive an audible, context-aware answer.

- As a student, I can replay or read the AI response, and retry after speech-recognition errors.

- As a student, I can opt out of microphone use and request deletion of retained audio, subject to published retention policy.

## 21.4 Reference architecture and sequence

Browser microphone (explicit permission) → Voice Session API → Speech-to-Text adapter → existing Agent Orchestrator (persona, context, tools, authorization) → response text → Text-to-Speech adapter → browser audio playback. Store transcripts and agent events with the same conversation/thread identifiers as text chat. Speech services are provider-adapter interfaces; verify availability, latency, terms and pricing of supported Meta or third-party speech services before selection. Muse Spark access alone does not imply native STT/TTS support.

- Browser captures audio via MediaRecorder for turn-based push-to-talk; enforce max recording duration, upload size and allowed MIME types.

- Backend authenticates user, checks enrollment and agent access, transcribes audio, calls existing agent orchestrator and synthesizes reply. Never expose speech/model API keys in browser.

- Agent returns structured proposed_actions; UI displays a confirmation card for blocker/task updates. Only a dedicated backend tool executes confirmed, authorized actions.

- Persist conversation turn, transcript, timestamps, agent role, session state, consent state and optional speech artifacts; avoid storing raw audio by default.

- Failures degrade to text: STT uncertainty triggers transcript editing; TTS failure shows text; slow model calls show progress and permit cancellation.

## 21.5 Suggested API contracts

- POST /api/voice/sessions — create session {agent_role, conversation_id?, consent}; return session_id and permitted settings.

- POST /api/voice/sessions/{id}/turns — authenticated audio upload; return transcript, assistant_text, audio_url? or audio payload reference, proposed_actions and correlation_id.

- POST /api/voice/sessions/{id}/confirm-action — {action_id, decision}; revalidate permissions and current task version.

- GET /api/voice/sessions/{id}/turns — transcript and reply history, scoped to enrolled user.

- DELETE /api/voice/sessions/{id} — close session and apply retention/deletion policy; never promise deletion beyond configured data processors.

## 21.6 Data model additions

voice_sessions(id, user_id, enrollment_id, conversation_id, agent_role, status, consent_at, started_at, ended_at); voice_turns(id, session_id, sequence_no, transcript_text, transcript_confidence?, assistant_text, stt_provider, tts_provider, duration_ms, audio_storage_key?, created_at); voice_action_proposals(id, session_id, turn_id, action_type, payload_json, status, confirmed_at, executed_at). Apply existing tenant/enrollment authorization and audit logging.

## 21.7 Privacy, accessibility and safety requirements

- Obtain microphone permission and clear notice before recording; show a visible recording indicator and stop control.

- Do not retain raw audio by default. Define transcript retention and deletion, consent, encryption at rest/in transit, and vendor data handling before external beta.

- Do not record background audio or create sessions without an explicit student action. Prevent prompt-injection instructions inside speech transcripts from escalating agent privileges.

- Allow transcript editing, captions, keyboard-only text alternative, playback controls and accessible status/error messages.

- Do not grade technical ability based on accent, speaking speed, pronunciation, fluency or ASR confidence; design reviews offer an equivalent text response.

- Enforce quotas, audio size/time limits, rate limits, request timeouts, per-user budgets and abuse monitoring.

## 21.8 Acceptance tests / definition of done

- P0: Student starts standup, records 10–30 seconds, receives correct editable transcript, hears Scrum Master reply, and sees proposed blocker.

- P0: Student confirms blocker and it appears on the sprint board; rejecting it makes no change.

- P0: Tech Lead answers a voice question using the correct active ticket; subsequent text chat continues the same context.

- P0: Microphone denial, transcription failure, synthesis failure and network timeout each have recoverable text fallback.

- P0: Unauthenticated user cannot access another student’s voice session or transcript.

- P1: All six personas accept voice turns through one shared integration with distinct permissions.

- P2: Design review references real PR evidence and offers equivalent text-based participation.

## 21.9 Delivery sequencing and fallback

Build voice only after the core sprint board and agent orchestrator work. First add session schema and a push-to-talk standup (approximately one focused implementation block); then spoken Tech Lead conversations; then reusable voice toggle for remaining roles. Protect the PR evaluation and task-unlocking milestones. If latency, provider access or audio permissions become blockers, ship a transcript-first voice standup with optional synthesized playback rather than dropping the core engineering workflow.

## 21.10 Demo addition

During the live demo, student verbally reports an authorization bug blocker in the standup. The Scrum Master proposes the blocker; student confirms it; the sprint board updates. Student then asks the Tech Lead by voice for guidance; the agent references the exact task and gives a hint. Continue with GitHub PR evaluation, remediation and gated unlock. This demonstrates voice as a stateful workplace interaction rather than a standalone audio chatbot.
