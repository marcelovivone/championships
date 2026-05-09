# Agent Phase 1 Execution Plan

Last updated: 2026-05-01

## Purpose

This document converts the roadmap in `documentation/PLAN_AGENTS.md` into an actionable Phase 1 ticket list.

Phase 1 is strictly local-first:

- local PostgreSQL
- local Nest backend
- local Next.js web/admin frontend
- local Expo mobile app

Deployment of the hosted web app, backend runtime, and mobile distribution is explicitly out of scope for this phase.

## Phase 1 Goal

By the end of Phase 1, the repository should support one production-shaped but local-only agent flow:

- shared Agent Control Plane schema
- reusable backend agent runtime
- manual, scheduled, and event trigger plumbing
- approval-aware execution modes
- admin UI for configuration, run history, and approvals
- Scheduled Season Results Updater working on the local stack
- audit trail, notifications, and validation tests

## Current Status

Phase 1 implementation is complete on the local stack.

- AGT-001 through AGT-011 are implemented.
- The shared control plane, runtime, trigger plumbing, approval flow, admin UI, notifications, and validation pack are in place.
- The Scheduled Season Results Updater has been demonstrated locally through dry-run, waiting-approval, approval/rejection persistence, and run-detail inspection.
- A backend regression fix is now in place for finished-score corrections during the subsequent-load fast path in `backend/src/api/api.service.ts`.
- The admin approval rejection flow no longer depends on `window.prompt`; it now uses an in-app modal in `frontend/app/admin/agents/console/page.tsx`.

Non-blocking follow-up:

- Replay one fresh pending-approval run through the new rejection modal for a final UI-only operator proof.

Recommended next implementation track after that follow-up:

- Start Agent 2 from the roadmap: Data Quality Monitor.

## Non-Negotiable Constraints

- ESPN remains the first data source assumption for early agent implementations.
- Agents must be pluggable for sport-specific and league-specific behavior.
- Agents may generate SQL, migration files, or update scripts, but database-changing scripts are still executed by a human operator.
- Phase 1 does not include hosted deployment.
- Phase 1 does not include web/mobile deployment.

## Delivery Order

### Milestone A: Control Plane Foundation

- AGT-001
- AGT-002
- AGT-003
- AGT-004

### Milestone B: Operator Workflow

- AGT-005
- AGT-006
- AGT-007

### Milestone C: First Agent

- AGT-008
- AGT-009
- AGT-010
- AGT-011

## Tickets

### AGT-001 — Define the Agent Operating Contract

Goal:
Define the common execution contract every agent must obey.

Deliverables:

- Canonical mode definitions for `dry-run`, `manual`, `semi-automatic`, and `autonomous`
- Standard result model for runs, actions, errors, warnings, approvals, and notifications
- Idempotency-key policy and run correlation metadata
- Write classification rules for read-only work, script generation, approval-required actions, and direct writes

Likely touchpoints:

- `backend/src/` new `agents/` module types/interfaces
- `documentation/PLAN_AGENTS.md`
- `documentation/AGENT_PHASE1_EXECUTION_PLAN.md`

Acceptance criteria:

- A dummy agent can return a standardized result object
- Mode semantics are documented and not duplicated across backend/frontend files
- Approval-required actions are structurally distinguishable from pure read-only actions

Dependencies:

- None

### AGT-002 — Add the Agent Control Plane Schema

Goal:
Persist agent definitions, configuration, runs, approvals, and notifications.

Deliverables:

- Drizzle schema for:
  - `agent_definitions`
  - `agent_config`
  - `run_history`
  - `action_logs`
  - `approvals`
  - `notifications`
  - `trigger_metadata`
- Status and mode enums where appropriate
- Indexes for `agent_key`, `status`, `created_at`, and unresolved approvals
- Generated migration or SQL script ready for manual execution

Likely touchpoints:

- `backend/src/db/schema.ts`
- `backend/drizzle/`
- migration helper scripts if needed

Acceptance criteria:

- The schema compiles cleanly with the backend typecheck
- Migration artifacts are generated but not auto-executed
- The schema can represent one agent with multiple runs and approvals

Dependencies:

- AGT-001

### AGT-003 — Build the Reusable Backend Agent Runtime

Goal:
Create the backend runtime primitives that every agent will use.

Deliverables:

- `AgentModule`
- `AgentRegistry`
- `AgentRunner`
- `TriggerDispatcher`
- Shared interfaces for execution context, result payloads, and action payloads
- Standardized run lifecycle hooks for start, success, failure, and cancellation

Likely touchpoints:

- `backend/src/app.module.ts`
- new `backend/src/agents/` folder
- shared logger configuration via `winston.config.ts`

Acceptance criteria:

- A registered dummy agent can be resolved and executed through the runner
- The runtime captures start/end state and standardized error handling
- No agent-specific business logic is hardcoded into the shared runtime

Dependencies:

- AGT-001
- AGT-002

### AGT-004 — Implement Trigger Channels

Goal:
Support the three trigger paths defined in the roadmap using one execution pipeline.

Deliverables:

- Manual trigger endpoint for admin/UI use
- Scheduled trigger adapter for cron-based execution on the local stack
- Event trigger adapter for ETL or match-lifecycle hooks
- Shared dispatch path so all triggers use the same runner and audit model

Likely touchpoints:

- `backend/src/admin/`
- `backend/src/api/`
- new scheduler integration inside `backend/src/agents/`

Acceptance criteria:

- The same dummy agent can be started manually and by a scheduled trigger
- Trigger source is stored in run metadata
- Manual, scheduled, and event execution all produce the same result shape

Dependencies:

- AGT-003

### AGT-005 — Enforce Approval and Mode Switching Rules

Goal:
Make execution mode behavior real instead of only documented.

Deliverables:

- Mode enforcement for `dry-run`, `manual`, `semi-automatic`, and `autonomous`
- Approval queue creation for semi-automatic runs
- Write blocking for manual mode
- Audit trail for approvals, rejections, and cancellations

Likely touchpoints:

- `backend/src/agents/`
- approval-related admin endpoints/services
- `run_history`, `approvals`, and `action_logs` persistence

Acceptance criteria:

- `dry-run` never emits write actions
- `manual` can prepare actions but does not execute writes automatically
- `semi-automatic` pauses before write execution and requires approval
- `autonomous` can execute only through the same audited action pipeline

Dependencies:

- AGT-002
- AGT-003
- AGT-004

### AGT-006 — Build the Admin Agent Setup Screen

Goal:
Provide the operator UI for agent configuration on the local web/admin stack.

Deliverables:

- Agent list screen
- Per-agent detail/configuration screen
- Controls for enable/disable, mode, schedule, retries, timeout, recipients, and manual test-run
- Read-only summary of latest run status per agent

Likely touchpoints:

- `frontend/` admin area
- existing admin sidebar/navigation
- backend admin endpoints for reading/updating config

Acceptance criteria:

- The Scheduled Season Results Updater can be configured from the admin UI
- Config changes persist and reload correctly
- Manual test-run can be initiated from the screen

Dependencies:

- AGT-002
- AGT-003
- AGT-004

### AGT-007 — Build the Run Console and Approval Queue

Goal:
Give operators visibility into runs and pending actions.

Deliverables:

- Run history list with filters by agent, status, and trigger type
- Run detail page with action logs, warnings, and failure details
- Approval queue with approve/reject actions for semi-automatic runs
- Notification panel or lightweight admin alert surface

Likely touchpoints:

- `frontend/` admin pages/components
- backend admin endpoints for run history and approvals

Acceptance criteria:

- An operator can inspect a failed run without reading server logs directly
- A semi-automatic run can be approved or rejected in the UI
- Approval decisions are reflected in persisted run state

Dependencies:

- AGT-005
- AGT-006

### AGT-008 — Implement Scheduled Season Results Updater Logic (Read/Plan)

Goal:
Build the first real agent in dry-run/manual planning form.

Deliverables:

- Candidate selection for active leagues/seasons
- Read path into the existing ETL, season, match, and standings services
- Detection of proposed result updates and downstream recalculation work
- Deterministic action-plan generation without applying writes

Likely touchpoints:

- `backend/src/matches/`
- `backend/src/seasons/`
- `backend/src/standings/`
- new agent implementation under `backend/src/agents/`

Acceptance criteria:

- The agent produces the same action plan for the same input state
- Proposed changes are visible in run output without mutating data
- At least one active-league local scenario can be exercised end-to-end in dry-run

Dependencies:

- AGT-003
- AGT-004
- existing ETL/matches/standings services

### AGT-009 — Integrate Scheduled Season Results Updater with Approval-Aware Writes

Goal:
Connect the first agent to the control plane’s write rules.

Deliverables:

- Action serialization into `action_logs`
- Generated SQL/update artifacts for human-reviewed DB changes where required
- Approval-aware execution path for semi-automatic mode
- Full run-history capture for successful, blocked, approved, and failed runs

Likely touchpoints:

- `backend/src/agents/`
- script generation utilities
- approval services/controllers

Acceptance criteria:

- The agent can complete local end-to-end runs in `dry-run`, `manual`, and `semi-automatic`
- DB-changing work is represented as auditable actions or generated scripts
- No unapproved write slips through the manual or semi-automatic modes

Dependencies:

- AGT-005
- AGT-008

### AGT-010 — Add Notifications and Failure Handling

Goal:
Make agent failures and approval waits visible to the operator.

Deliverables:

- Email notification flow for failures and approval-required runs
- Retry policy and failure classification
- Notification persistence in the control plane tables

Likely touchpoints:

- `backend/src/agents/`
- notification service layer
- local email configuration for development/testing

Acceptance criteria:

- A failed run creates an auditable notification
- An approval-required run notifies recipients
- Retry behavior is bounded and recorded in run history

Dependencies:

- AGT-007
- AGT-009

### AGT-011 — Local Validation Pack

Goal:
Close Phase 1 with a repeatable local verification matrix.

Deliverables:

- Schema tests for control plane tables and enums
- Trigger-path tests for manual, scheduled, and event dispatch parity
- Approval-flow tests for semi-automatic blocking
- Idempotency tests for duplicate triggers
- Acceptance test scenario for Scheduled Season Results Updater on at least one active league
- Short operator checklist for local runtime validation

Validation pack reference:

- `documentation/AGENT_PHASE1_LOCAL_VALIDATION.md`

Likely touchpoints:

- backend automated tests
- admin UI smoke checks
- `documentation/PLAN_AGENTS.md`
- this file

Acceptance criteria:

- Phase 1 has a documented local validation checklist
- Core trigger/mode/idempotency behavior is covered by automated tests
- The first agent is locally demonstrable without relying on hosted infrastructure

Implementation status:

- Completed locally as of 2026-05-01.
- The validation pack now also includes a focused regression test for finished-score corrections on subsequent loads: `backend/test/api/applyAllRows.e2e-spec.ts`.
- Latest handoff and restart instructions live in `documentation/AGENT_PHASE1_HANDOFF_2026-05-01.md`.

Dependencies:

- AGT-002 through AGT-010

## Out of Scope for Phase 1

- Hosted backend deployment
- Web frontend deployment
- Mobile app deployment or store distribution
- Full autonomous rollout for all agents
- Sports Onboarding Agent implementation
- Production queue infrastructure

## Recommended Starting Sequence

Start with these four tickets in order:

1. AGT-001
2. AGT-002
3. AGT-003
4. AGT-004

Once those are accepted, the next critical path is:

1. AGT-005
2. AGT-006
3. AGT-008
4. AGT-009

## Definition of Done for Phase 1

Phase 1 is done when all of the following are true on the local stack:

- one agent is configurable from the admin UI
- one agent can run manually and on schedule through the shared runner
- `manual` and `semi-automatic` modes block writes correctly
- run history, approvals, action logs, and notifications are persisted
- the Scheduled Season Results Updater is locally demonstrable with auditability
- validation coverage exists for the control-plane foundation and the first agent