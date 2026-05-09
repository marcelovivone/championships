## Plan: Autonomous Agents Roadmap

### Summary
Build a shared Agent Control Plane, then implement agents in waves. Start with a local-first, semi-automatic runtime and provide per-agent controls in an admin UI. Allow each agent to be switched to fully autonomous mode later.
Important: We should for the first implementations considerer ESPN API as the origin of the data. So, in the cases of new sports, the agente should prepare our code to automatically adapt to what comes on its payloads. Every sport has a different payload configurations and elements. And, not rare, within the same sport, there are differences between different leagues. The agent should do the similar work we have done on several interactions in the cases of football (ESPN API calls it soccer) and basketball, NBA league.

### Current implementation state (2026-05-01)
- The repository is still validated only on the local stack: local PostgreSQL + local Nest backend + local web frontend + local Expo mobile app.
- Agent Phase 1 is implemented locally: AGT-001 through AGT-011 are complete.
- The Scheduled Season Results Updater is working on the local stack with shared runtime support, manual and scheduled trigger plumbing, approval-aware writes, admin configuration screens, run console visibility, persisted notifications, and a documented validation pack.
- The subsequent-load finished-score correction bug in `backend/src/api/api.service.ts` is fixed.
- The admin approval rejection flow no longer depends on `window.prompt`; it now uses an in-app modal in `frontend/app/admin/agents/console/page.tsx`.
- Deployment of the public web app and the mobile app remains a separate later workstream.
- The current handoff note for resuming this work is `documentation/AGENT_PHASE1_HANDOFF_2026-05-01.md`.

Detailed Phase 1 tickets now live in `documentation/AGENT_PHASE1_EXECUTION_PLAN.md`.

### Confirmed decisions
- First wave: Scheduled Season Results Updater
- Runtime: local-first on the current local server stack (hosted-ready later)
- Initial autonomy: semi-automatic (requires approval before writes)
- Per-agent admin controls: enable/disable, mode, schedule, retries/timeouts, email recipients, manual test-run
- Alerts: start with email; extendable to other channels

### Implementation phases

1. Define agent operating contract and guardrails
	- Modes: `dry-run`, `semi-automatic`, `autonomous`
	- Approval rules, retry policy, idempotency, rollback behavior, run metadata

2. Add Agent Control Plane schema
	- Tables: agent_definitions, agent_config, run_history, action_logs, approvals, notifications, trigger_metadata
	- Database updates: the agent framework will only *generate* migration or update scripts for schema or data changes. Any script that modifies the database must be executed by a human operator (you). The project policy is: agents generate scripts, but DB execution is performed manually to ensure control and auditability.

3. Build reusable backend agent framework
	- Components: `AgentRunner`, `AgentRegistry`, `TriggerDispatcher`
	- Interfaces: dry-run/action/result, standardized result shape and error handling

4. Implement trigger channels
	- Manual (API/UI), scheduled (cron), event (ETL / match lifecycle hooks)

5. Approval flow & mode switching
	- Modes: `dry-run`, `manual`, `semi-automatic`, `autonomous`
	- Manual: entirely manual execution where actions are prepared but require human operators to apply any writes (no automatic writes executed)
	- Semi-automatic: pause before write, require admin approval
	- Autonomous: direct writes with full audit trail

6. Admin Agent Setup screen and run console
	- Per-agent controls, run history, failure investigation, manual test-run

7. Implement agents (waves)
	- Agent 1: Scheduled Season Results Updater (schedule + manual)
	- Agent 2: Data Quality Monitor (schedule)
	- Agent 3: Standings Recalculation Orchestrator (manual + event)
	- Agent 4: Timezone & Postponement Repair (schedule + manual)
	- Agent 5: ETL Batch Import Orchestrator (manual + schedule)
	- Agent 6: Sports Onboarding Agent — starts with Ice Hockey, extended to all sports currently present in the `sports` table and designed to be pluggable for future sports; runs staged readiness checks (parser/scoring correctness, standings/tiebreaker validation, phase/playoff validation, frontend readiness). Keep semi-automatic until confidence gates pass.

8. Notifications & incident workflow
	- Email alerts for failures, approval-required runs, and threshold anomalies
	- In-application (online) notifications for alerts, approval requests, and run status updates (UI notifications / admin console)

9. Hosted-ready runtime profile (optional)
	- Local profile: single-machine API + DB + scheduler/worker
	- Hosted profile: split API/worker, managed DB, external queue, centralized logging

10. Application deployment track (after local agent validation)
	- Web deployment: define staging and production hosting for the public/admin frontend.
	- Mobile deployment: define the mobile distribution path (EAS build, internal distribution, TestFlight / Play testing, then store release if desired).
	- Backend deployment: expose a hosted API/runtime only after the local-first agent flow is stable and observable.

### Agent catalog & trigger map (short)
- Scheduled Season Results Updater — schedule, manual
- ETL Batch Import Orchestrator — schedule, manual
- Round Inference Auto-Validator — event (ESPN ambiguity)
- Entity Alias Auto-Resolver — event (entity review)
- Data Quality Monitor — schedule
- Standings Recalc Orchestrator — manual, event
- Timezone & Postponement Repair — schedule, manual
- Phase & Bracket Consistency Agent — event (postseason updates)
- Standing Rule Drift Detector — schedule, manual
- Public Snapshot Publisher — event (successful imports)
- Incident Auto-Triage — event (repeated failures)

### Key existing touchpoints
app.module.ts, schema.ts, api.controller.ts, api.service.ts, admin.controller.ts, admin.service.ts,
standings-calculator.service.ts, matches.service.ts, seasons.service.ts, winston.config.ts, docker-compose.yml,
admin-sidebar.tsx, ETL_AND_STANDINGS_IMPLEMENTATION_REFERENCE.md, MULTI_SPORT_TIEBREAKER_RULES.md,
TIEBREAKER_IMPLEMENTATION_DESIGN.md

### Verification plan
- Schema and mode-transition tests for control plane
- Trigger-path tests for manual/schedule/event parity
- Approval-flow tests for semi-automatic write blocking
- Idempotency tests for duplicate-trigger safety
- Acceptance tests for Scheduled Season Results Updater on active leagues
- Repair-agent deterministic diff/output tests
- Email alert tests for failures and approval-required states
- End-to-end local runtime validation (staging hosted-profile validation later)

The current local validation pack and operator checklist live in `documentation/AGENT_PHASE1_LOCAL_VALIDATION.md`.

### Recommended next step
Use `documentation/AGENT_PHASE1_HANDOFF_2026-05-01.md` as the immediate restart note. The next practical sequence is:

1. Replay one fresh pending-approval run through the new rejection modal if you want a final UI-only proof.
2. Start the next agent track from this roadmap: Data Quality Monitor.
3. Keep the existing control plane, runtime, admin UI, approval flow, and notification plumbing as the shared foundation for the next agent.