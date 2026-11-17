============================================================
FILE: AGENTS.md
============================================================

# Project Instructions

This repository contains a frontend and backend application.

## General principles

When modifying this repository:

- Prefer simple, readable, maintainable code.
- Avoid unnecessary duplication.
- Avoid over-engineering.
- Prefer generic and reusable solutions when they provide real value.
- Reuse existing types, components, utilities, hooks, services, and
  abstractions before creating new ones.
- Follow the existing project architecture and naming conventions.
- Keep changes scoped to the requested task.
- Preserve existing working behavior unless the task requires changing it.
- Do not introduce unnecessary dependencies.
- Do not create speculative abstractions for possible future requirements.
- Never claim that a validation command passed unless it was actually run.

## Tests for new issues

- Always add new automated tests when implementing a new issue, covering
  the issue's acceptance criteria and affected behavior.
- For bug fixes, include a regression test that fails without the fix.
- Add new test cases to existing suites when appropriate; a new test file
  is not required for every issue.
- Keep tests independent of personal databases and local developer state.
- Run the relevant tests before considering the issue complete, and report
  the command and result. If tests cannot be added or run, explain the
  blocker explicitly instead of silently skipping them.

## Frontend

When creating, modifying, refactoring, or reviewing frontend code,
follow the `frontend-conventions` skill located at:

`agents/skills/frontend-conventions/SKILL.md`

This includes frontend pages, components, hooks, services, utilities,
types, styling, and frontend tests.

## Backend

No dedicated backend skill is currently defined.

When working on backend code, follow the existing backend architecture
and the general principles in this file.

## Full-stack tasks

For tasks that modify both frontend and backend:

- Apply the `frontend-conventions` skill to all frontend changes.
- Follow the existing backend architecture for backend changes.
- Keep the API contract between frontend and backend strongly typed
  and consistent.
