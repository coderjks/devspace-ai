---
name: token-efficient-research
description: Research this repository with a fixed read budget and targeted file windows.
---

# Token-Efficient Research

Use this skill when answering questions about existing repository behavior, planning a change, or locating relevant code without reading the whole project.

## Research budget

- Start with at most 3 discovery calls: repository file list, focused search, and relevant docs.
- Read at most 3 files per question unless the evidence is still insufficient.
- Prefer `muse.search` over recursive shell scans.
- Do not read `node_modules`, `.venv`, `.next`, caches, build output, lockfiles, or generated files unless the task is specifically about them.
- Do not reopen files already read in the same session unless the file changed.

## Targeted reading order

1. Read the governing requirement or task description first.
2. Use search results to identify owning modules, entry points, tests, and configuration.
3. Read only the relevant line windows with `muse.read_file`, starting around the matched lines.
4. Expand to callers, tests, or configuration only when needed to resolve behavior.

## Stop conditions

- Stop when the current behavior, constraints, reuse options, and validation path are supported by inspected evidence.
- Record unresolved items as gaps instead of reading more files speculatively.
- For implementation, cite file paths and observed behavior; mark guesses as assumptions.
