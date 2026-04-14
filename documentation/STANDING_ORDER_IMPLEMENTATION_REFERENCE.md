# Standing Order and Tiebreaker System - Implementation Reference

Last updated: 2026-04-11

## Purpose

This is the canonical implementation reference for the standing-order and tiebreaker system.

It documents the code that is currently implemented for configurable standings ordering across sports and leagues. This document is intentionally separate from the ETL reference because the standing-order system does not belong to the extract/transform/load pipeline.

## Scope

This document covers:

- database structures used by the standing-order system
- rule resolution by sport, league, and season year
- the tiebreaker sorting engine
- head-to-head mini-standings calculation
- standings integration points
- admin UI for rules, point systems, and criteria reference
- seed data for sport defaults and league overrides
- known limitations and follow-up validation items

This document does not cover:

- external API extraction
- transitional ETL parsing
- raw standings row generation before sorting

## Related Documents

- `documentation/TIEBREAKER_IMPLEMENTATION_DESIGN.md` — original design rationale
- `documentation/MULTI_SPORT_TIEBREAKER_RULES.md` — sport and league rules research
- `documentation/ETL_AND_STANDINGS_IMPLEMENTATION_REFERENCE.md` — ETL and public standings flow

## Implementation Status

The standing-order system is implemented end-to-end across backend, database, seed data, and admin frontend.

Implemented areas:

- configurable `standing_order_rules` table
- point-system support on leagues
- hockey-specific regulation counters in standings
- resolution of league-level overrides and sport-level defaults
- recursive criteria-based sorting engine
- head-to-head calculator with point-system awareness
- admin CRUD for rule management
- admin page for league point-system maintenance
- admin criteria reference page
- seed migration for known sport defaults and selected league overrides

## Real Sport IDs Used by the System

The seed data and configuration must use the actual sport IDs from this database:

| Sport | sport_id |
|---|---:|
| Basketball | 34 |
| Ice Hockey | 35 |
| Football | 36 |
| Handball | 37 |
| Futsal | 38 |
| Volleyball | 39 |

This mapping is already reflected in the seed migration.

## Database Model

### 1. `leagues.point_system`

Added column:

- `point_system varchar(20) not null default 'FOOTBALL_3_1_0'`

Purpose:

- defines how points are awarded for standings and H2H mini-standings
- lets the same sport support multiple league point systems, especially ice hockey

Supported values currently used by the implementation:

- `FOOTBALL_3_1_0`
- `HOCKEY_2_0_OTL`
- `HOCKEY_3_2_1_0`
- `BASKETBALL_W_L`
- `VOLLEYBALL_3_2_1_0`
- `HANDBALL_2_1_0`

### 2. `standings.regulation_wins` and `standings.regulation_ot_wins`

Added columns:

- `regulation_wins integer default 0`
- `regulation_ot_wins integer default 0`

Purpose:

- support hockey leagues that distinguish regulation wins from overtime and shootout wins

### 3. `standing_order_rules`

Implemented schema:

| Column | Meaning |
|---|---|
| `id` | primary key |
| `sport_id` | required sport scope |
| `league_id` | nullable; null means sport-level default |
| `start_year` | nullable; null means all years |
| `end_year` | nullable; null means still in effect |
| `sort_order` | gapped ordering, typically 100, 200, 300 |
| `criterion` | criterion ID such as `POINTS` or `H2H_POINTS` |
| `direction` | `DESC` or `ASC` |
| `created_at` | timestamp |

Practical meaning:

- sport default: `league_id is null`
- league override: `league_id is not null`
- year filtering: rule applies when `start_year <= season.start_year <= end_year`, with null treated as open-ended

## Migrations and Seed Data

### Migration files

- `backend/drizzle/0019_create_standing_order_rules_table.sql`
- `backend/drizzle/0020_seed_standing_order_rules.sql`

### Seed contents

The seed migration includes:

- sport-level defaults for football, basketball, ice hockey, handball, futsal, and volleyball
- league-level overrides for selected leagues such as La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga, Eredivisie, Brasileirao, NBA, KHL, SHL, and DEL
- point-system initialization for leagues by sport and special league overrides where needed

Important:

- the seed file was corrected to use real sport IDs 34 through 39, not placeholder IDs 1 through 6

## Backend Architecture

### 1. StandingOrderRules module

Files:

- `backend/src/standing-order-rules/standing-order-rules.module.ts`
- `backend/src/standing-order-rules/standing-order-rules.service.ts`
- `backend/src/standing-order-rules/standing-order-rules.controller.ts`

Responsibilities:

- CRUD operations on standing-order rules
- filtered listing by sport and league
- effective-rule resolution for a given league and season year
- re-sequencing of `sort_order` values back to 100, 200, 300, ...

### 2. StandingOrderRules REST API

Base path:

- `v1/standing-order-rules`

Implemented endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/v1/standing-order-rules` | list rules with filters and pagination |
| `GET` | `/v1/standing-order-rules/resolve/:leagueId/:sportId/:year` | resolve effective rules |
| `GET` | `/v1/standing-order-rules/:id` | fetch single rule |
| `POST` | `/v1/standing-order-rules` | create rule |
| `POST` | `/v1/standing-order-rules/resequence` | normalize sort order gaps |
| `PUT` | `/v1/standing-order-rules/:id` | update rule |
| `DELETE` | `/v1/standing-order-rules/:id` | delete rule |

### 3. Rule resolution logic

Current resolution order in `StandingOrderRulesService.resolveForLeagueAndSeason(...)`:

1. find league-level rules matching `sport_id`, `league_id`, and season start year
2. if none exist, find sport-level default rules matching `sport_id` and season start year
3. if still none exist, return an empty array so the caller can fall back to legacy sorting

### 4. TiebreakerEngine

File:

- `backend/src/standings/tiebreaker.engine.ts`

Current behavior:

- accepts standings rows and an ordered list of criteria
- recursively groups tied rows by the current criterion
- uses overall row stats for non-H2H criteria
- delegates H2H criteria to `H2HCalculator`
- keeps recursing until groups are split or criteria are exhausted

Currently implemented overall criteria in code:

- `POINTS`
- `WINS`
- `WIN_PCT`
- `GOAL_DIFFERENCE`
- `GOALS_FOR`
- `GOALS_AGAINST`
- `AWAY_GOALS_FOR`
- `GAMES_PLAYED`
- `REGULATION_WINS`
- `REGULATION_OT_WINS`
- `OT_WINS`
- `PENALTY_WINS`
- `SET_RATIO`
- `POINT_RATIO`
- `NET_POINTS`
- `CLUB_ID`

Currently implemented H2H criteria in code:

- `H2H_POINTS`
- `H2H_WINS`
- `H2H_WIN_PCT`
- `H2H_GOAL_DIFFERENCE`
- `H2H_GOALS_FOR`
- `H2H_AWAY_GOALS`
- `H2H_POINT_DIFFERENCE`

Note:

- the design document discusses restarting the full rule chain after partial H2H resolution
- the current implementation does not fully restart the chain; it continues with remaining criteria
- this is acceptable for many cases but should be kept in mind when validating edge cases

### 5. H2HCalculator

File:

- `backend/src/standings/h2h-calculator.ts`

Responsibilities:

- fetch mutual matches among the tied clubs
- compute mini-standings stats for those clubs only
- allocate H2H points using the league point system
- detect overtime and penalties through `match_divisions`

Current H2H stats produced:

- points
- wins
- played
- goals for
- goals against
- away goals for
- point differential
- win percentage

Point-system awareness is critical for:

- hockey leagues with loser points
- basketball win/loss systems
- volleyball and handball variants

### 6. StandingsService integration

Primary integration file:

- `backend/src/standings/standings.service.ts`

Current integration behavior:

- `sortWithTiebreakers(...)` resolves the season start year
- then loads the effective rules for the league and year
- then loads the league point system
- then delegates the sort to `TiebreakerEngine`
- if no rules are found or any error occurs, it falls back to the legacy hardcoded comparator

The configurable engine is used by:

- standings by round
- standings by match date

### 7. StandingsCalculatorService changes

File:

- `backend/src/standings/standings-calculator.service.ts`

Changes relevant to standing order:

- `regulationWins` and `regulationOtWins` were added to the stats object
- these values are initialized from the previous standings row
- for ice hockey, regulation and regulation-plus-overtime counters are derived from match divisions

## Frontend Admin UI

The admin sidebar includes a dedicated `Standing Order` section.

Routes implemented:

- `/admin/standing-order/rules`
- `/admin/standing-order/point-systems`
- `/admin/standing-order/criteria`

### 1. Rules page

File:

- `frontend/app/admin/standing-order/rules/page.tsx`

Features:

- list, create, update, and delete rules
- filter by sport
- filter by league, including sport-default rules only
- pagination and sort controls
- add/edit modal form
- re-sequence action for the selected scope

### 2. Point Systems page

File:

- `frontend/app/admin/standing-order/point-systems/page.tsx`

Features:

- lists leagues and their configured point system
- documents the supported point-system values
- allows updating a league by `PUT /v1/leagues/:id`

### 3. Criteria Reference page

File:

- `frontend/app/admin/standing-order/criteria/page.tsx`

Features:

- static reference of available criteria
- grouped by category
- shows description, default direction, and data source

## Operational Workflow

Recommended workflow when adding or modifying standings rules:

1. confirm the real sport and league IDs in the database
2. add or edit rules in the admin rules page
3. keep `sort_order` values gapped when inserting between existing rules
4. use re-sequence if the order becomes messy
5. verify the league `point_system` for the affected league
6. validate standings output for a known season with official league rules

## Relationship to ETL

This system runs after standings rows exist.

The ETL pipeline is responsible for:

- extracting source data
- parsing and normalizing source payloads
- creating matches, divisions, and standings rows

The standing-order system is responsible for:

- deciding how already-generated standings rows are ordered for presentation and ranking

That is why this document is separate from the ETL implementation reference.

## Known Limitations and Follow-up Items

### 1. Validation still required for some leagues and seasons

Known item to investigate next:

- Italy / Serie A 2020-2021 may still have a suspected incorrect two-team ordering and should be validated against the official rule set and actual results

### 2. Partial H2H restart behavior

The design document describes a fuller restart behavior after some H2H splits. The current engine continues with the remaining criteria instead of restarting the full sequence. This should be reviewed if a real league case depends on the stricter interpretation.

### 3. Criteria catalog mismatch to future ambitions

The design document includes some possible future structural criteria such as division and conference win percentage. Those are not part of the current shipped engine.

### 4. Rules correctness remains a data problem as much as a code problem

Even with a configurable engine, standings can still be wrong if:

- a league override is missing
- a point system is wrong
- a year range is too broad or too narrow
- historical rules changed and were not entered

## Suggested Validation Checklist

When validating a league/season:

1. confirm the effective rules resolved for that league and season year
2. confirm the league point system
3. confirm finished matches and division rows are complete
4. compare the produced table against an official or trusted historical table
5. if the discrepancy involves H2H, inspect the exact mutual matches among the tied clubs

## Canonical Files for This Feature

- `backend/src/db/schema.ts`
- `backend/drizzle/0019_create_standing_order_rules_table.sql`
- `backend/drizzle/0020_seed_standing_order_rules.sql`
- `backend/src/standing-order-rules/standing-order-rules.service.ts`
- `backend/src/standing-order-rules/standing-order-rules.controller.ts`
- `backend/src/standings/tiebreaker.engine.ts`
- `backend/src/standings/h2h-calculator.ts`
- `backend/src/standings/standings.service.ts`
- `backend/src/standings/standings-calculator.service.ts`
- `frontend/app/admin/standing-order/rules/page.tsx`
- `frontend/app/admin/standing-order/point-systems/page.tsx`
- `frontend/app/admin/standing-order/criteria/page.tsx`