# Championships Documentation Catalog

Last updated: 2026-04-30

## Purpose

This file is the top-level catalog for the repository documentation.

Use it to understand which document is the canonical source for each topic, and which files are historical, exploratory, or implementation-specific.

## Recommended Reading Paths

### 1. General project context

- `documentation/ARCHITECTURE_SUMMARY.md` — high-level architecture and project structure
- `PROJECT_REVIEW.ts` — current project status, implementation history, and next steps
- `documentation/API Documentation.md` — broader API notes and business context

### 2. ETL and data ingestion

- `documentation/ETL_AND_STANDINGS_IMPLEMENTATION_REFERENCE.md` — canonical implementation reference for ETL, parse/load flow, and public standings integration
- `documentation/ETL_TRANSFORM_LOAD_IMPLEMENTATION.md` — transform/load process details
- `documentation/API + ETL Documentation - espn.md` — ESPN extraction and parsing notes
- `documentation/API + ETL Documentation - api-football - copia.md` — Api-Football extraction notes

Latest canonical updates now documented there:

- ESPN local-time timestamp normalization for basketball/date-based imports
- timestamp repair tooling for already-imported seasons
- enforcement of persistent ignored club aliases (`entity_id = -1`) during later ESPN imports
- the sidebar layout refinement completed in the same work window

### 3. Standings ordering and tiebreakers

- `documentation/STANDING_ORDER_IMPLEMENTATION_REFERENCE.md` — canonical implementation reference for the standing-order and tiebreaker system
- `documentation/TIEBREAKER_IMPLEMENTATION_DESIGN.md` — original design document for the standing-order system
- `documentation/MULTI_SPORT_TIEBREAKER_RULES.md` — research catalog of sport and league rules
- `documentation/FOOTBALL_TIEBREAKER_RULES.md` — football-specific rules research

### 4. Public standings frontend

- `documentation/STANDINGS_PAGE_ARCHITECTURE.md` — public standings page structure and frontend behavior
- `documentation/FOOTBALL_MOCKUP_ANALYSIS.md` — football standings UI analysis

### 5. Historical backend implementation docs

The files under `backend/documentation/` are mostly backend delivery snapshots from earlier phases of the project. They remain useful for implementation history, but they are not the canonical source for the new multi-sport standing-order system.

Recommended entry point:

- `backend/documentation/DOCUMENTATION_INDEX.md`

## Canonical Ownership by Topic

| Topic | Canonical document |
|---|---|
| ETL extraction, parsing, load | `documentation/ETL_AND_STANDINGS_IMPLEMENTATION_REFERENCE.md` |
| Standing-order engine and rules configuration | `documentation/STANDING_ORDER_IMPLEMENTATION_REFERENCE.md` |
| Tiebreaker design rationale | `documentation/TIEBREAKER_IMPLEMENTATION_DESIGN.md` |
| Rules research by sport/league | `documentation/MULTI_SPORT_TIEBREAKER_RULES.md` |
| Public standings frontend architecture | `documentation/STANDINGS_PAGE_ARCHITECTURE.md` |
| Repository-wide architecture summary | `documentation/ARCHITECTURE_SUMMARY.md` |
| Mobile app onboarding and architecture | `documentation/MOBILE_ONBOARDING.md` |

## Notes on Scope

- The standing-order implementation is not an ETL feature. It affects how standings are ordered after standings rows have been produced.
- The ETL reference still documents how standings are created and exposed, but the tiebreaker configuration system now has its own dedicated implementation reference.
- The design document and the implementation reference serve different purposes:
  - Design document: why the system was designed this way.
  - Implementation reference: what is currently implemented in code and how to operate it.

## Agent Platform & Automation

- `documentation/PLAN_AGENTS.md` — roadmap for the local-first Agent Control Plane, agent catalog, verified triggers, and recommended Phase 1 execution plan.
- `documentation/AGENT_PHASE1_EXECUTION_PLAN.md` — concrete ticket list for Phase 1: control plane foundation, admin workflow, and the Scheduled Season Results Updater on the local stack.
- `documentation/AGENT_PHASE1_LOCAL_VALIDATION.md` — repeatable validation matrix, command pack, regression coverage, and operator checklist for the Phase 1 local stack.
- `documentation/AGENT_PHASE1_HANDOFF_2026-05-01.md` — latest end-of-session stop point, implementation snapshot, residual follow-ups, and ready-to-paste restart prompt.

### Current execution status

- The current implementation is verified only on the local stack: local PostgreSQL + local Nest backend + local Next.js web app + local Expo mobile app.
- Agent Phase 1 is implemented on that local stack.
- The Scheduled Season Results Updater is locally demonstrable with approval-aware execution, notifications, and run-console visibility.
- The latest regression hardening and restart instructions are documented in `documentation/AGENT_PHASE1_LOCAL_VALIDATION.md` and `documentation/AGENT_PHASE1_HANDOFF_2026-05-01.md`.
- Deployment of the public web app and the mobile app is a separate future workstream.

## Mobile Application

- `documentation/MOBILE_ONBOARDING.md` — canonical onboarding guide for the Expo mobile app: architecture decisions, network setup, backend dependency, developer workflow, security notes, and next steps.
- `mobile/README.md` — quick-start reference for running the mobile app locally.

### Mobile application state (as of 2026-04-30)

The Expo SDK 54 mobile app (`mobile/`) is tested locally on iPhone via Expo Go against the local Nest backend. Current implementation:

- `mobile/src/api.ts` — axios client + typed helpers for sports/leagues/seasons/rounds, standings, sliced matches, standing zones, season clubs, and postseason brackets. LAN host is derived from Expo's `hostUri` when `.env.development` is absent.
- `mobile/src/RegularSeasonScreen.tsx` — sport → league → season → phase → stage selectors; standings grouped by conference for basketball; standing-zone colors; regular-season games list; postseason switch into bracket rendering.
- `mobile/src/PostseasonBracket.tsx` — generic postseason bracket; NBA play-ins bracket; NBA mirrored playoffs bracket with round-to-round connectors, placeholder slots, and winner propagation once a series reaches 4 wins.
- SDK: Expo 54.0.34, React Native 0.81.5, React 19.1.0.

#### Pending mobile tasks (priority order)

1. Add NBA-specific standing columns: GB, HOME W-L, AWAY W-L, OT W-L — see `basketball-standings-spec.md` memory.
2. Fix `SafeAreaView` deprecation warning: replace `react-native` import with `react-native-safe-area-context`.
3. Decide whether to extract shared web/mobile API types into a small shared package.
4. Start the Agent Control Plane work described in `documentation/PLAN_AGENTS.md`.
5. Open the deployment workstream for the public web app and the mobile app after local validation remains stable.

#### Key runtime facts

| Fact | Value |
|---|---|
| Expo start command | `cd mobile && npx expo start --host lan --clear` |
| Real iPhone backend URL | `API_BASE_URL=http://192.168.1.156:3000` |
| Android emulator URL | `API_BASE_URL=http://10.0.2.2:3000` |
| Deployment status | Local only; not yet deployed |
| NBA league id | 57 |
| Active season id | 80 (2025/2026) |
| Eastern Conference group id | 10 |
| Western Conference group id | 11 |

## Current Documentation Structure Decision

For this repository, documentation should be organized by responsibility:

- ETL and data ingestion docs stay under `documentation/` as data-pipeline references.
- Standing-order and tiebreaker docs stay under `documentation/` as standings-domain references.
- Backend delivery snapshots remain under `backend/documentation/` as historical implementation records.

## Open Validation Items

- Serie A / Italy 2020-2021 may still need a league-specific review for two-team ordering correctness.
- That validation should be handled as a rules verification task, not as part of ETL documentation.