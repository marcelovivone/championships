# Agent Phase 1 Local Validation Pack

Last updated: 2026-05-01

## Purpose

This document is the repeatable local verification matrix for Agent Phase 1.

Phase 1 validation is local-only:

- local PostgreSQL
- local Nest backend
- local Next.js admin frontend
- local Expo mobile app remains out of scope for agent execution, but the shared local stack must stay intact

## Automated Validation Matrix

| Requirement | Coverage | Notes |
| --- | --- | --- |
| Control-plane schema tables and enums | `backend/test/agents/agent-control-plane-schema.e2e-spec.ts` | Verifies the exported control-plane enums and key schema columns for `agent_definitions`, `agent_config`, `run_history`, `action_logs`, `approvals`, `notifications`, and `trigger_metadata`. |
| Manual, scheduled, and event trigger parity | `backend/test/agents/agents.controller.e2e-spec.ts` | Verifies standardized execution reports across all three trigger paths. |
| Mode enforcement and semi-automatic blocking | `backend/test/agents/agent-runner.e2e-spec.ts` | Covers `dry-run`, `manual`, `semi-automatic`, and `autonomous` handling in the shared runner. |
| Duplicate-trigger idempotency | `backend/test/agents/agent-runner.e2e-spec.ts` | Verifies that repeated requests with the same agent key and `idempotencyKey` reuse the existing run instead of executing again. |
| Approval execution path | `backend/test/agents/agent-admin-approvals.e2e-spec.ts` | Covers approve/reject flow and approved action execution success/failure persistence. |
| First-agent acceptance scenario | `backend/test/agents/scheduled-season-results-updater.handler.e2e-spec.ts` | Verifies deterministic planning for the Scheduled Season Results Updater on an active season and the approval-aware write payload it emits. |
| Approval-required and failed-run notifications | `backend/test/agents/agent-notification.service.e2e-spec.ts` | Covers notification persistence, bounded retries, and `run_history.resultJson.notificationSummary`. |
| Subsequent-load finished-score correction regression | `backend/test/api/applyAllRows.e2e-spec.ts` | Verifies that `ApiService.applyAllRowsToApp()` updates an existing finished match when the staged finished score differs from the stored score. |

## Latest Snapshot (2026-05-01)

- The Scheduled Season Results Updater has already been demonstrated locally through run creation, waiting-approval, run-detail inspection, and approval cleanup.
- The subsequent-load score-correction bug in `backend/src/api/api.service.ts` is fixed and covered by `backend/test/api/applyAllRows.e2e-spec.ts`.
- The admin approval rejection flow in `frontend/app/admin/agents/console/page.tsx` now uses an in-app modal instead of `window.prompt(...)`.
- Current non-blocking follow-up: replay one fresh pending approval through the new rejection modal for a final UI-only proof.
- Latest handoff note: `documentation/AGENT_PHASE1_HANDOFF_2026-05-01.md`.

## Recommended Local Command Pack

Run the backend validation pack from the backend folder:

```bash
npx jest --config ./jest-e2e.json test/agents/agent-control-plane-schema.e2e-spec.ts test/agents/agents.controller.e2e-spec.ts test/agents/agent-runner.e2e-spec.ts test/agents/agent-admin-approvals.e2e-spec.ts test/agents/scheduled-season-results-updater.handler.e2e-spec.ts test/agents/agent-notification.service.e2e-spec.ts test/api/applyAllRows.e2e-spec.ts --runInBand
npx tsc --noEmit
```

Run the admin frontend typecheck from the frontend folder:

```bash
npx tsc --noEmit
```

## Operator Checklist

1. Start the local PostgreSQL-backed stack and confirm the backend boots without agent module errors.
2. Open `/admin/agents` and confirm the Scheduled Season Results Updater loads with persisted config values.
3. Open `/admin/agents/console` and confirm existing runs, approval state, and notification state render without hosted services.
4. Trigger a manual dry-run from the admin UI and confirm a new run appears with auditable action logs and no direct writes.
5. Switch the updater to `semi-automatic`, trigger it against a locally active season, and confirm the run stops in `waiting-approval` with a generated artifact path.
6. Approve the queued updater action and confirm the run resolves to an executed or failed terminal state through the same audited action pipeline.
7. Confirm the `notifications` row and `run_history.result_json.notificationSummary` update for approval-required or failed runs.
8. If SMTP is not configured, confirm local notification delivery still records successfully through the Nodemailer JSON transport fallback.

## Exit Criteria

Phase 1 local validation is complete when:

- the backend validation pack passes
- backend and frontend typechecks pass
- the admin UI can demonstrate configuration, run history, approval handling, and notification visibility locally
- the Scheduled Season Results Updater can be exercised end-to-end on the local stack without hosted infrastructure