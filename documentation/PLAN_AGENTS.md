## Plan: Autonomous Agents Roadmap

### Summary
Build a shared Agent Control Plane, then implement agents in waves. Start with a local-first, semi-automatic runtime and provide per-agent controls in an admin UI. Allow each agent to be switched to fully autonomous mode later.
Important: We should for the first implementations considerer ESPN API as the origin of the data. So, in the cases of new sports, the agente should prepare our code to automatically adapt to what comes on its payloads. Every sport has a different payload configurations and elements. And, not rare, within the same sport, there are differences between different leagues. The agent should do the similar work we have done on several interactions in the cases of football (ESPN API calls it soccer) and basketball, NBA league.

### Confirmed decisions
- First wave: Scheduled Season Results Updater
- Runtime: local-first (hosted-ready later)
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

### Recommended next step
Approve this roadmap and I will produce a detailed Phase 1 execution plan with concrete tickets (schema, backend framework, admin setup screen, and Scheduled Season Results Updater first).