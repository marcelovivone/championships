# ETL and Public Standings — Complete Implementation Reference

> **Purpose**: This document describes the full, current implementation of the ETL (Extract → Transform → Load) pipeline and the public standings frontend in the Championships application.  
> It is intended as a **context-restoring prompt** — ask Copilot to read this file at the start of any new session to recover full knowledge of the system.
>
> **Last updated**: 2026-04-05
> **Last updated**: 2026-04-09

> **Scope note**: The configurable standing-order and tiebreaker system is documented separately in `documentation/STANDING_ORDER_IMPLEMENTATION_REFERENCE.md`.  
> This file remains the canonical reference for ETL, data flow, standings creation, and the public standings pages, but not for the new standing-order rules engine.

---

## Developer Session Prompt (Script/Prompt.txt) — 2026-04-08

The following is the developer prompt file discovered at `Script/Prompt.txt`. It was captured and added here to keep the repository's context and onboarding prompts in the canonical ETL reference.

```
Hello! I'm ready to continue working on the Championships. Please review the following key project files to get a complete picture of the current status, architecture, and environment:

Environment configuration:
- docker-compose.yml (in the root directory)

Backend
- backend/package.json (for the installed modules)
- backend/.env (for global configuration)
- backend/src/db/schema.ts (for the database structure)
- backend/src/app.module.ts (for the overall module architecture)
- backend/src/main.ts (for global configuration)

Frontend
- frontend/package.json (for the installed modules)
- frontend/README_FRONTEND.md

After you've analyzed these, let me know you're ready, and we can proceed with the next task from the next steps. We can consult the implementation historic, the work to be done and the next steps accessing the PROJECT_REVIEW.ts.

Along the development/implementation is must keep the PROJECT_REVIEW.ts uptodate.

Very important, see section Next Steps in the PROJECT_REVIEW.ts.

Remember, you are a senior software engineer.


I'm continuing work on the Championships project. Please read the following files to get full context:

1. PROJECT OVERVIEW AND STATUS:
  - Read: PROJECT_REVIEW.ts (complete file)
  This contains all project history, architecture, completed work, and next steps.

2. DATABASE & BACKEND CONTEXT:
  - Read: backend/src/db/schema.ts (lines 1-400, all table definitions)
  - Read: backend/drizzle.config.ts (database configuration)
  - Read: backend/.env (database connection details)
  - List files in: backend/drizzle/meta/ (to see latest migrations)

3. FRONTEND CONTEXT:
  - Read: frontend/lib/api/types.ts (lines 1-250, all TypeScript interfaces)
  - List files in: frontend/app/admin/ (to see implemented admin pages)
  - Read: frontend/lib/api/entities.ts (API client configuration)

4. CURRENT WORK STATUS:
  We are on Item 2 of Phase 1B (Frontend Admin Panels). Recently completed:
  - Sports, Leagues, Seasons (with sport_id), Season_clubs, Sport_clubs tables
   
  Next to implement:
  - Review work done so far and move on to item 3 of next steps section of project_review.ts

5. ENVIRONMENT:
  - Backend: NestJS + TypeScript + Drizzle ORM, running on port 3000
  - Frontend: Next.js 14+ + TypeScript + Tailwind CSS, running on port 3001
  - Database: PostgreSQL in Docker (port 5433)
  - Pattern: Database → Backend (schema/DTOs/service) → Frontend (types/API/admin page)

After reading these files, confirm you understand the project context and ask me what table or feature I want to work on next.

Very important, you should think and work as a senior software engineer.

You don't need to ask for my authorization to read or write any file or to run any command shell during your changes. You are authorized from now to perform any reading or changing to the project files and to run shell commands.
```


## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Sources (Origins)](#2-data-sources-origins)
3. [Phase 1 — Extract](#3-phase-1--extract)
4. [Phase 2 — Transform (Parse)](#4-phase-2--transform-parse)
   - 4.1 [Api-Football parsing](#41-api-football-parsing)
   - 4.2 [ESPN parsing — Full (first load)](#42-espn-parsing--full-first-load)
   - 4.3 [ESPN parsing — Lightweight (subsequent load)](#43-espn-parsing--lightweight-subsequent-load)
   - 4.4 [Round inference algorithm (ESPN)](#44-round-inference-algorithm-espn)
   - 4.5 [Round review workflow](#45-round-review-workflow)
5. [Phase 3 — Load (Apply to DB)](#5-phase-3--load-apply-to-db)
   - 5.1 [First-load path](#51-first-load-path)
   - 5.2 [Subsequent-load (fast-path)](#52-subsequent-load-fast-path)
   - 5.3 [Per-row processing loop](#53-per-row-processing-loop)
   - 5.4 [Upsert logic](#54-upsert-logic)
   - 5.5 [Standings calculation](#55-standings-calculation)
   - 5.6 [Cascade recalculation for future rounds](#56-cascade-recalculation-for-future-rounds)
   - 5.7 [Entity Review and Deduplication](#57-entity-review-and-deduplication)
   - 5.8 [Persistent Entity Aliases (Canonical Matching)](#58-persistent-entity-aliases-canonical-matching)
   - 5.9 [REST API Standings Creation (Matches Page)](#59-rest-api-standings-creation-matches-page)
6. [Database Tables Involved](#6-database-tables-involved)
7. [Frontend Pages](#7-frontend-pages)
8. [Key Decisions & Edge Cases](#8-key-decisions--edge-cases)
9. [Phase 4 — ESPN Partial-Score Enrichment](#9-phase-4--espn-partial-score-enrichment)
   - 9.1 [Why enrichment is needed](#91-why-enrichment-is-needed)
   - 9.2 [How enrichment is triggered](#92-how-enrichment-is-triggered)
   - 9.3 [ESPN Summary endpoint — response structure](#93-espn-summary-endpoint--response-structure)
   - 9.4 [`fetchEspnEventLinescores` — private helper](#94-fetchespneventlinescores--private-helper)
   - 9.5 [`enrichMatchDivisionsFromEspn` — orchestrator](#95-enrichmatchdivisionsfromespn--orchestrator)
   - 9.6 [Background vs. inline execution](#96-background-vs-inline-execution)
   - 9.7 [Guards and safety conditions](#97-guards-and-safety-conditions)
   - 9.8 [Return value and logging](#98-return-value-and-logging)
10. [Recent Additions Since 2026-03-31](#10-recent-additions-since-2026-03-31)
  - 10.1 [New staging flags and fetch lifecycle](#101-new-staging-flags-and-fetch-lifecycle)
  - 10.2 [ESPN non-football parse and division repair](#102-espn-non-football-parse-and-division-repair)
  - 10.3 [Grouped seasons and group-aware load](#103-grouped-seasons-and-group-aware-load)
  - 10.4 [Background apply jobs and polling](#104-background-apply-jobs-and-polling)
  - 10.5 [Admin frontend additions](#105-admin-frontend-additions)
  - 10.6 [Public standings pages and fallback logic](#106-public-standings-pages-and-fallback-logic)
11. [Pending / Future Work](#11-pending--future-work)

---

## 1. Architecture Overview

```
┌──────────────────────┐    ┌──────────────────────┐    ┌───────────────────────┐
│   External APIs      │    │   Frontend (Next.js)  │    │   Backend (NestJS)    │
│  ┌────────────────┐  │    │                       │    │                       │
│  │ Api-Football   │──┼───>│  Extract page         │───>│  fetchAndStore()      │
│  │ ESPN           │  │    │  /admin/api/etl/       │    │  → api_transitional   │
│  └────────────────┘  │    │     extract/           │    │                       │
│                      │    │                       │    │                       │
│                      │    │  Transform & Load page│───>│  parseTransitional()  │
│                      │    │  /admin/api/etl/       │    │  applyAllRowsToApp()  │
│                      │    │     transform-load/    │    │  → real DB tables     │
│                      │    │        football/       │    │                       │
└──────────────────────┘    └──────────────────────┘    └───────────────────────┘
```

**Key files**:
- Backend service: `backend/src/api/api.service.ts` (~2800 lines)
- Backend controller: `backend/src/api/api.controller.ts`
- Standings calculator: `backend/src/standings/standings-calculator.service.ts`
- Frontend Extract page: `frontend/app/admin/api/etl/extract/page.tsx`
- Frontend T&L page: `frontend/app/admin/api/etl/transform-load/football/page.tsx`
- Frontend shared standings shell: `frontend/components/common/standings/BaseStandings.tsx`
- Frontend shared standings controls: `frontend/components/common/standings/FilterBar.tsx`
- Frontend football public page: `frontend/app/common/standings/football/page.tsx`
- Frontend basketball public page: `frontend/app/common/standings/basketball/page.tsx`

---

## 2. Data Sources (Origins)

The system supports two external API origins, stored in the `origin` column of `api_transitional`:

| Origin | API Base URL | Auth | Notes |
|--------|-------------|------|-------|
| **Api-Football** | `https://v3.football.api-sports.io/fixtures` | API key (`APISPORTS_KEY` env var) in `x-apisports-key` header | Provides round numbers directly in `league.round` (e.g. "Regular Season - 1") |
| **Api-Espn** | `https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/scoreboard` | No auth (public) | Does NOT provide round numbers — they must be **inferred** by the algorithm |

### Key difference
- **Api-Football**: round numbers come in the JSON payload → no inference needed
- **ESPN**: round numbers are absent → the system must **derive rounds** from match dates, team uniqueness constraints, and match count per round

---

## 3. Phase 1 — Extract

**Frontend**: Extract page (`/admin/api/etl/extract/`)  
**Backend**: `fetchAndStore()` in `api.service.ts`

### Flow
1. User selects **Origin** and **Sport** on the top row
2. User fills in **League** and either **Season** (Api-Football) or **Start Date / End Date** (ESPN) on the secondary row
3. User clicks **Fetch & Store**
4. Backend calls the external API and stores the raw JSON response in `api_transitional` table
5. The returned `transitional_id` is shown to the user with a link to open the ETL Preview (Transform & Load page)

### Additional staging flags stored on `api_transitional`

The extract step now persists more than the raw payload metadata. The row also carries execution flags that directly control both the load behavior and the frontend workflow:

| Column | Purpose |
|--------|---------|
| `fetch_status` | Tracks asynchronous fetch lifecycle for long ESPN non-football imports: `fetching`, `done`, or `error` |
| `flg_infer_clubs` | Enables club inference behavior during load for payloads where clubs are not guaranteed to be pre-resolved |
| `flg_has_groups` | Declares that the incoming season is group-based |
| `number_of_groups` | User-selected or inferred expected group count for the season |
| `flg_run_in_background` | Controls whether long-running steps return immediately and continue asynchronously |

These fields were added incrementally via migrations `0012_add_flginferclubs_to_api_transitional_table.sql`, `0013_add_flghasgroups_to_api_transitional_table.sql`, and `0014_add_numberofgroups_to_api_transitional_table.sql`, and are also guarded by runtime `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` checks inside `fetchAndStore()` for compatibility with already-existing databases.

### ESPN URL construction
```
https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20250801-20260531&limit=1000
```
- Date range is built from startDate/endDate, formatted as `YYYYMMDD-YYYYMMDD`
- `limit=1000` ensures all matches in the range are returned

### ESPN non-football day-by-day fetches

For soccer/football, ESPN supports season-range scoreboard queries. For non-football sports such as basketball, the backend now uses a different extraction strategy:

1. Insert a placeholder row into `api_transitional` immediately with `payload = '{}'` and `fetch_status = 'fetching'`
2. Return the new `transitional_id` to the frontend without waiting for the season fetch to complete
3. Continue the real ESPN collection in the background using `fetchEspnSeasonByDay(...)`
4. Update the same row with the final merged payload and set `fetch_status = 'done'`
5. If the background request fails, mark the row as `fetch_status = 'error'`

This avoids HTTP timeouts for long seasons such as the NBA, where a full day-by-day scoreboard collection can take over a minute.

### Api-Football URL construction
```
https://v3.football.api-sports.io/fixtures?league=39&season=2025
```
- Uses league ID and season year as query params

---

## 4. Phase 2 — Transform (Parse)

**Endpoint**: `GET /v1/api/transitional/:id/parse`  
**Backend method**: `parseTransitional(id, roundOverrides?)`

This is the step that converts the raw API JSON into a normalized flat-row format that the Load step can consume. The behavior is **completely different** depending on the origin and whether this is a first-time or subsequent load.

### 4.1 Api-Football parsing

Straightforward JSON flattening:
1. Find the data array in the payload (tries `response[]`, `data[]`, `results[]`, or deep-searches for the first nested array)
2. Flatten each object into dot-notation keys (e.g., `league.name`, `teams.home.name`, `fixture.date`)
3. Return `{ found: true, columns, rows }`

Round numbers are extracted directly from `league.round` (e.g., "Regular Season - 1" → extracts `1` via regex `/(\d{1,3})\b/`)

### 4.2 ESPN parsing — Full (first load)

Called when **no rounds exist yet** in the DB for this league/season.

**Method**: `parseTransitionalEspn(row, roundOverrides)`

This is the heavyweight parser. It:
1. Extracts league metadata from the ESPN payload structure (`payload.leagues[0]`, `event.season`, etc.)
2. Runs the **round inference algorithm** (see §4.4)
3. Maps each ESPN event to the standardized flat-row format:

| Flat key | ESPN source |
|----------|-------------|
| `league.name` | `payload.leagues[0].name` |
| `league.season` | `firstEvent.season.year` |
| `league.country` | `competition.venue.address.country` |
| `league.round` | `derivedRounds.get(eventId)` ← from inference |
| `league.season` | derived from ESPN season start date / calendar start date for cross-year leagues (e.g. NBA 2025/26 → `2025`) |
| `goals.home` | `homeTeam.score` |
| `goals.away` | `awayTeam.score` |
| `teams.home.name` | `homeTeam.team.displayName` |
| `teams.away.name` | `awayTeam.team.displayName` |
| `fixture.date` | `competition.date` |
| `fixture.venue.city` | `venue.address.city` |
| `fixture.venue.name` | `venue.fullName` |
| `fixture.status.long` | `status.description` |
| `fixture.status.short` | `status.shortDetail` |
| `fixture.status.state` | `status.state` — ESPN game state: `'pre'`, `'in'`, or `'post'` |
| `fixture.status.completed` | `status.completed` — authoritative boolean used to decide whether the game is actually finished |
| `origin_api_id` | `event.id` (string) |

### 4.3 ESPN parsing — Lightweight (subsequent load)

Called when **rounds already exist** in the DB for this league/season.

**Method**: `parseTransitionalEspnLightweight(row)`

Produces the **exact same flat-row format** as the full parser BUT:
- **Does NOT run round inference** (saves significant processing time and avoids round review)
- Sets `league.round = null` for every row
- The Load step will preserve the existing `round_id` from the database via `COALESCE`
- Still emits `fixture.status.completed` and the normalized cross-year `league.season` value so update loads behave identically to first-load parsing for finished-state and season matching

**Detection**: In `parseTransitional()`, before calling the full ESPN parser:
1. Extract league metadata via `extractLeagueMetadata(row)`
2. Look up the league and season in the DB
3. For round-based schedules: count rounds via `SELECT COUNT(*) FROM rounds WHERE league_id = ? AND season_id = ?`
4. For date-based schedules: count matches instead of rounds, because leagues such as NBA do not rely on persisted round rows
5. If an existing league/season is found → it's a subsequent load → use lightweight parser and return `isSubsequentLoad: true`

### 4.4 Round inference algorithm (ESPN)

This is the core algorithm in `getEspnRoundNumbers()`. It assigns round numbers to ESPN events that have no explicit round information.

#### Key concepts
- **`maxMatchesPerRound`**: `uniqueClubs / 2` (e.g., 20 clubs → 10 matches per round)
- **`expectedRoundCount`**: `totalEvents / maxMatchesPerRound`
- Events are **sorted by date** before processing

#### Algorithm steps

1. **Sort** all events chronologically
2. **Check for authoritative overrides**: If the user has manually assigned ALL events, skip automatic inference entirely
3. **Main loop** — iterate through sorted events:
   - **Round full**: If `matchesInCurrentRound >= maxMatchesPerRound` → advance to next round
   - **Date gap boundary**: If >1 day gap between consecutive matches (in league-local timezone, e.g., `America/Brasilia`) AND the round isn't full yet, advance to next round and track the current round as "open incomplete"
   - **Strong boundary**: If gap > `ROUND_BOUNDARY_GAP_DAYS` (1) and at least one match is assigned → advance
   - **Open incomplete round backfill**: When a match's home AND away teams are both missing from exactly one open incomplete round → assign the match to that round (this handles early-played / rescheduled games)
   - **Team conflict detection**: If a team is already in the current round:
     - If >2 teams are missing: attempt "stray detection" — if an already-assigned event in this round has a date `>3 days` before the current event, it's likely a rescheduled game placed incorrectly. Unassign the stray and mark it for review
     - If exactly 2 teams are missing: search forward for a future event matching those exact teams → assign it to the current round as "reserved" (early-played game). Advance to next round
     - Otherwise: mark the current event for manual review
4. **Post-processing**:
   - **Prune sparse rounds**: Rounds with ≤3 automatically-assigned matches are pruned (their events go to manual review). This runs up to 5 passes since pruning can create new sparse rounds
   - **Compact round numbers**: Remove gaps in numbering (e.g., rounds 1, 3, 5 → 1, 2, 3)
   - **Apply manual overrides**: User-supplied overrides are overlaid after prune+compact
   - **Re-compact if needed**: If manual overrides created empty rounds, compact again

#### Conflict detection output
When the algorithm can't fully resolve all rounds, it returns:
```json
{
  "reason": "needs_round_review",
  "details": {
    "reviewMatches": [...],   // all matches with their assigned/candidate rounds
    "roundSummary": [...],    // per-round stats (assigned, expected, missing, status)
    "validationErrors": [...] // unassigned, overflow, duplicate-team, incomplete
  }
}
```

### 4.5 Round review workflow

When round inference produces conflicts:

1. **Backend** returns `{ found: false, reason: 'needs_round_review', details: { reviewMatches, roundSummary, validationErrors } }`
2. **Frontend** displays:
   - A **Round Summary** table showing each round's status (complete, incomplete, conflict, empty)
   - Each round is expandable to show its assigned games
   - A **Review Matches** table showing ALL matches with:
     - Current `assignedRound` (auto-assigned or null)
     - `candidateRounds`: list of valid rounds the match could be assigned to (no team conflicts, not full)
     - `assignmentSource`: 'automatic', 'manual', or 'unassigned'
     - `needsReview`: boolean flag
   - Input fields for the user to manually type round numbers
3. **User** fills in the missing/conflicting round assignments
4. **Frontend** collects all overrides via `collectManualRoundOverrides()` and calls `loadRow(id, overrides)` — which re-parses with the overrides
5. **Backend** re-runs the inference with the overrides applied. If no validation errors remain, parsing succeeds → the user can now proceed to Load

#### Round review persistence
- Draft overrides can be saved: `PATCH /v1/api/transitional/:id/round-review`
- Backend stores them in `api_transitional_round_review` table
- On next parse, saved draft overrides are merged with any new overrides from the request
- After successful load, the review is deleted

---

## 5. Phase 3 — Load (Apply to DB)

**Endpoint**: `POST /v1/api/transitional/:id/apply-all-rows`  
**Backend method**: `applyAllRowsToApp(id, options)`

This writes the parsed data into the real application tables. The entire operation runs in a **single database transaction** (atomic commit/rollback).

### 5.1 First-load path

Used when **no rounds exist** for the league/season in the DB.

1. Run `parseTransitional(id, roundOverrides)` — full parse with round inference (ESPN) or standard parse (Api-Football)
2. If parse fails (needs review), return error to frontend
3. Call `applyFirstRowToApp()` to upsert **Country**, **League**, and **Season**:
   - Country: fuzzy match by name/code/alias → insert if not found
   - League: match by `original_name` or `secondary_name` + `country_id` + `sport_id` → insert if not found
   - Season: match by `sport_id` + `league_id` + `start_year` → insert if not found
4. Proceed to per-row processing loop (§5.3)

### 5.2 Subsequent-load (fast-path)

Used when **rounds already exist** for the league/season.

**Detection** (in `applyAllRowsToApp`):
1. Fetch the transitional row's raw payload
2. Call `extractLeagueMetadata(row)` to get league name and season
3. Look up league → season → count rounds in DB
4. If rounds exist → set `isSubsequentLoad = true`, set `leagueId` and `seasonId` from DB

**Behavior differences** (parse phase):
- **Skip full parse**: Use `parseTransitionalEspnLightweight()` for ESPN (or standard `parseTransitional()` for Api-Football which is already lightweight)
- **Skip `applyFirstRowToApp()`**: Country/League/Season already exist; this call (which handles Country/League/Season upsert) is not made

**Per-row fast path** (implemented in `backend/src/api/api.service.ts`):

When `isSubsequentLoad = true`, the standard per-row loop (§5.3) contains a complete self-contained fast path block at the **very top** of each iteration, executed before any entity resolution code. The fast path:

1. **Reads `origin_api_id`** from the current row (the external API's event ID)
2. **Looks up the existing match** in the DB:
   ```sql
   SELECT id, status, home_club_id, away_club_id, round_id
   FROM matches
   WHERE origin_api_id = $1 AND league_id = $2 AND season_id = $3
   ```
3. **Skips the row** if:
   - The match is already `Finished` in the DB (standing already computed; don't overwrite)
   - The incoming payload row also shows non-Finished status (nothing changed; no work to do)
4. **When a previously non-Finished match is now Finished** in the payload:
   - `UPDATE matches SET status = 'Finished', home_score = ?, away_score = ?, updated_at = NOW() WHERE id = ?`
   - `DELETE FROM match_divisions WHERE match_id = ?` + recreate them via `createMatchDivisions()`
   - `INSERT INTO standings` for both home and away clubs (with the same duplicate-guard as the first-load path)
   - Runs `cascadeClub()` for both clubs to recalculate any future rounds with early-played games
5. **`continue`** — the rest of the loop body (all entity resolution) is never reached

**What is completely skipped** on subsequent loads:
- Round lookup / creation (`ensureRound`)
- Club fuzzy matching and creation (`findOrCreateClub`)
- Sport-club bridging (`ensureSportClub`)
- Season-club bridging (`ensureSeasonClub`)
- City/stadium creation (`ensureCity`, `ensureStadium`)
- Club-stadium bridging (`ensureClubStadium`)
- Match INSERT (only UPDATE is needed; new matches don't appear in subsequent payloads of the same season)
- Entity review (all entities were resolved during the first load)
- Round review (all round assignments were resolved during the first load)

> **Design rationale**: Skipping all entity resolution is safe because every entity that can appear in a subsequent payload (for an already-loaded season) was created or mapped during the first load. The second payload for the same season only provides score updates for previously-scheduled matches. Any attempt to re-run entity resolution would at best be wasteful and at worst cause duplicate-entity or constraint errors if names differ slightly between API payloads.

### 5.3 Per-row processing loop

Rows are **sorted by round number ascending** before processing (critical for correct standings calculation).

> **Subsequent-load**: When `isSubsequentLoad = true`, each iteration begins with the fast-path block described in §5.2. If the fast path fires (the row is relevant and needs updating) it handles everything and calls `continue`, skipping all steps below. Steps 1–4 are therefore **only executed on the first load**.

For each row (first-load path, or rows where fast-path did not apply):
1. **Resolve round**: Extract round number → look up or create `rounds` row → cache
2. **Resolve clubs**: Find or create home/away clubs by name (fuzzy match by `short_name`/`name` within the league's country) → cache
3. **Ensure bridging rows**: `sport_clubs`, `season_clubs` for each club
4. **Resolve venue**: Find or create city and stadium with fuzzy matching → create `club_stadiums` link
5. **Prepare match data**: Parse date, determine status (see status mapping rules below), extract scores (null if not finished)

   **Status mapping** (applied in both first-load and subsequent-load paths):
   ```typescript
   const statusShort = r['fixture.status.short'] ?? null;  // e.g. 'FT', 'ABN', "90'+6'"
   const statusState = r['fixture.status.state'] ?? null;  // e.g. 'post', 'in', 'pre'
   const status = (statusShort === 'FT' || statusState === 'post') ? 'Finished' : 'Scheduled';
   ```
   - **Api-Football**: `fixture.status.short` is `'FT'` for finished matches. `fixture.status.state` is null (not emitted).
   - **ESPN**: `fixture.status.short` is `status.shortDetail` which can be `'FT'`, `'ABN'` (abandoned), `'AET'` (after extra time), or a clock value like `"90'+6'"`. The `fixture.status.state` field captures ESPN's `status.type.state` (`'post'` = game over, `'in'` = live, `'pre'` = not started). Using `state === 'post'` as a second trigger ensures abandoned, forfeited, and extra-time matches are correctly recognized as finished even when `shortDetail` is not `'FT'`.
6. **Upsert match** (see §5.4)
7. **Create match_divisions** (see §5.3.1)
8. **Calculate and insert standings** (see §5.5)

#### 5.3.1 Match Divisions

For each match, `createMatchDivisions()` creates rows in `match_divisions`:
- Reads sport defaults (`min_match_divisions_number`, `max_match_divisions_number`, `has_overtime`, `has_penalties`, `flg_espn_api_partial_scores`)
- For football: 2 divisions (first half, second half)
  - Div 1: halftime scores
  - Div 2: fulltime minus halftime (second half scores)
- If `flg_espn_api_partial_scores` is false on the sport: all division scores are set to 0 (ESPN doesn't provide halftime data for football)

### 5.4 Upsert logic

When `origin_api_id` is available (the external API's unique match identifier), the system checks for existing matches:

```
SELECT id, status, home_score, away_score, round_id
FROM matches
WHERE origin_api_id = ? AND league_id = ? AND season_id = ?
```

| Existing match state | Payload state | Action |
|---------------------|---------------|--------|
| `status = 'Finished'` | Any | **Skip** — already fully loaded |
| `status != 'Finished'` | `status = 'Finished'` with scores | **Update** — set status, scores, recreate match_divisions, create standings |
| `status != 'Finished'` | Still not finished | **Skip** — nothing new to do |
| Not found | Any | **Insert** new match |

**Round preservation**: On subsequent loads, `league.round` is null (lightweight parse). The update query uses `round_id = COALESCE($4, round_id)` to preserve the DB's existing round assignment.

### 5.5 Standings calculation

Standings rows are created only for **Finished** matches. Each match produces **two standings rows** (one for home club, one for away club).

**Guard**: Before inserting, checks `SELECT COUNT(*) FROM standings WHERE match_id = ?` to avoid duplicates on re-runs.

**Base standings lookup**: For each club, finds the **previous standings row with the highest round number LOWER than the current round**:
```sql
SELECT s.* FROM standings s
  JOIN rounds r ON r.id = s.round_id
WHERE s.club_id = ? AND s.league_id = ? AND s.season_id = ?
  AND r.round_number < (SELECT round_number FROM rounds WHERE id = ?)
ORDER BY r.round_number DESC LIMIT 1
```

> **Important**: This query uses `round_number` ordering, NOT `id DESC`. Using `id DESC` would incorrectly pick an early-played future round (e.g., round 31 played before round 30) as the base.

**Calculation**: `StandingsCalculatorService.calculate(sportName, matchData, previousHome, previousAway)`:
- Increments `played`, `goalsFor`, `goalsAgainst` from previous
- For football/handball/futsal: Win=3pts, Draw=1pt, Loss=0pts
- Tracks home/away splits separately
- Handles overtime and penalty outcomes from match_divisions

**Standings row fields**: `points, played, wins, draws, losses, goals_for, goals_against, sets_won, sets_lost, home_games_played, away_games_played, home_points, away_points, home_wins, home_draws, home_losses, home_goals_for, home_goals_against, away_wins, away_draws, away_losses, away_goals_for, away_goals_against, overtime_wins, overtime_losses, penalty_wins, penalty_losses`

### 5.6 Cascade recalculation for future rounds

**Problem**: When inserting standings for round N, there may already be standings rows for round N+1, N+2, etc. (early-played games). Those future rows were computed WITHOUT round N's result as their base — their cumulative totals are now wrong.

**Solution**: After inserting standings for both clubs in a match, `cascadeClub(clubId)` runs for each club:

1. Get current round number
2. Find ALL standings rows for this club where `round_number > currentRoundNumber`, ordered ASC
3. For each future standings row:
   - Find the **previous standings** (highest round < this future round) — which now includes the just-inserted row
   - Find the **opponent's previous standings** for context
   - Fetch `match_divisions` for the future match
   - Re-calculate using `StandingsCalculatorService.calculate()`
   - **UPDATE** the existing future standings row with recalculated stats

This cascades correctly because future rows are processed in ascending order — each recalculated row becomes the base for the next.

### 5.7 Entity Review and Deduplication

**Purpose**: Before loading data into the application tables, the system detects potential entity conflicts (leagues, clubs, stadiums) between the incoming API data and existing database records. This prevents duplicate entities from being created when the same real-world entity appears under slightly different names or in data from different API origins.

**Triggered**: Automatically before the first load for a transitional row, unless explicitly skipped (e.g., after the user has completed the review workflow).

#### 5.7.1 Overview and workflow

Entity review is a **two-stage interactive process**:

1. **Stage 1 — League selection**: The user must first review and resolve the league entity
2. **Stage 2 — Clubs & Stadiums**: After the league is resolved, the system uses the league's `country_id` to filter and present club and stadium suggestions from the same country

**State encoding pattern**: For each entity needing review, the frontend maintains a state value:
- `undefined` = User must make a selection (validation blocks proceed button)
- `null` = User chose "Create New Entity" (tells backend to insert new record)
- `number` = User selected an existing entity ID (tells backend to map/link to that existing record)

**Skip mechanism**: The `skipEntityReview` parameter is passed to `handleToDbTables()` after the user completes the entity review workflow. This prevents infinite loops where the system would re-check for conflicts after the user has already resolved them all.

#### 5.7.2 Backend infrastructure

**Database table**: `api_transitional_entity_review`

```sql
CREATE TABLE IF NOT EXISTS api_transitional_entity_review (
    transitional_id INTEGER PRIMARY KEY REFERENCES api_transitional(id) ON DELETE CASCADE,
    league_mapping INTEGER NULL,           -- NULL = create new, number = map to existing league_id
    club_mappings JSONB DEFAULT '{}',      -- { "Club Name": existingClubId | null, ... }
    stadium_mappings JSONB DEFAULT '{}',   -- { "Stadium Name": existingStadiumId | null, ... }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key methods** (in `backend/src/api/api.service.ts`):

- **`ensureEntityReviewTable()`** (lines ~440-454): Creates the review table if it doesn't exist
- **`getDraftEntityMappings(id)`** (lines ~456-463): Retrieves saved mappings for a transitional row
  - Returns: `{ league: number|null, clubs: Record<string, number|null>, stadiums: Record<string, number|null> }`
  - Returns empty structures if no review exists yet
  
- **`detectEntitiesForReview(id, sportId)`** (lines ~465-735): Core detection algorithm
  - Returns: `{ found: true, needsReview: boolean, league?, clubs[], stadiums[] }`
  - Each entity includes list of suggestions with scoring
  
- **`saveEntityReview(id, mappings)`** (lines ~737-771): Persists user selections
  - Accepts partial updates (e.g., just league, or just clubs)
  - Uses `ON CONFLICT UPDATE` to merge with existing mappings
  
- **`parseTransitional(id, roundOverrides?)`** (line ~775+): Modified to use mappings during load
  - Passes mappings to `findOrCreateClub()` and `ensureStadium()` methods
  
**API endpoints** (in `backend/src/api/api.controller.ts`):
- `GET /v1/api/transitional/:id/entity-suggestions?sportId=:sportId` → calls `detectEntitiesForReview()`
- `GET /v1/api/transitional/:id/entity-review` → calls `getDraftEntityMappings()`
- `PATCH /v1/api/transitional/:id/entity-review` → calls `saveEntityReview()`
- `DELETE /v1/api/transitional/:id/entity-review` → removes review record after successful load

#### 5.7.3 Detection algorithm — League

**Query strategy** (cascading fallback):

1. **Exact match**: `WHERE (original_name = $1 OR secondary_name = $1) AND sport_id = $2`
2. **Fuzzy match** (if exact fails): `WHERE (original_name ILIKE '%' || $1 || '%' OR secondary_name ILIKE '%' || $1 || '%') AND sport_id = $2 LIMIT 20`
3. **All leagues fallback** (if fuzzy returns nothing): `WHERE sport_id = $1 LIMIT 50`

**Scoring**: Each suggestion includes a similarity score (0-1) calculated by:
```typescript
const score = Math.max(
  stringSimilarity(incomingName, candidate.original_name),
  stringSimilarity(incomingName, candidate.secondary_name || '')
);
```

**Decision**: `needsReview = true` if:
- No exact match found, OR
- Multiple matches with the same top score

**Special handling**: Once the league is mapped, its `country_id` is used to filter clubs and stadiums in subsequent detection calls.

#### 5.7.4 Detection algorithm — Clubs

**Query strategy** (cascading fallback with country filtering):

1. **Exact match**: `WHERE (name = $1 OR short_name = $1) AND country_id = $2`
2. **Fuzzy match** (if exact fails): `WHERE (name ILIKE '%' || $1 || '%' OR short_name ILIKE '%' || $1 || '%') AND country_id = $2 LIMIT 10`
3. **All from country fallback**: `WHERE country_id = $1 LIMIT 100`

**Scoring**: Similarity calculated against both `name` and `short_name` fields

**Skipping already-mapped clubs**: Before querying, checks if the club name exists in `clubMappings` — if found, skips detection for that club

**Alias pre-check**: Before adding a club to the review list, the system checks `entity_name_aliases WHERE entity_type = 'club' AND alias_name = $1 AND country_id = $2`. If an alias is found the club is silently skipped (no human review required). See §5.8.

**Key difference from league**: Uses the **league's country** for filtering (not all sports clubs globally), which dramatically reduces false positives

#### 5.7.5 Detection algorithm — Stadiums

**Query strategy** (NO fuzzy matching):

1. **Exact match**: 
```sql
SELECT s.*, c.country_id, ci.name as city_name
FROM stadiums s
JOIN cities ci ON ci.id = s.city_id
JOIN countries c ON c.id = ci.country_id
WHERE s.name = $1 AND c.country_id = $2 AND s.sport_id = $3
```

2. **All from country** (if exact fails):
```sql
SELECT s.*, c.country_id, ci.name as city_name
FROM stadiums s
JOIN cities ci ON ci.id = s.city_id
JOIN countries c ON c.id = ci.country_id
WHERE c.country_id = $1 AND s.sport_id = $2
LIMIT 100
```

**Critical schema note**: The `stadiums` table does NOT have a direct `country_id` column. All stadium queries must JOIN through the `cities` table to access `cities.country_id`. Using `s.country_id` in queries will cause a PostgreSQL error.

**No fuzzy matching**: User feedback indicated that fuzzy matching for stadiums was producing too many irrelevant suggestions. The current implementation only shows exact matches or the full country list as a dropdown.

**Skipping already-mapped stadiums**: Same logic as clubs — checks `stadiumMappings` before querying

**Alias pre-check**: Before adding a stadium to the review list, the system checks `entity_name_aliases WHERE entity_type = 'stadium' AND alias_name = $1 AND sport_id = $2`. If an alias is found the stadium is silently skipped (no human review required). See §5.8.

#### 5.7.6 Frontend workflow

**Component**: `frontend/app/admin/api/etl/transform-load/football/page.tsx`

**State management** (lines ~86-96):
```typescript
const [leagueForReview, setLeagueForReview] = useState<any>(null);
const [leagueMapping, setLeagueMapping] = useState<number | null | undefined>(undefined);
const [clubsForReview, setClubsForReview] = useState<any[]>([]);
const [clubMappings, setClubMappings] = useState<Record<string, number | null | undefined>>({});
const [stadiumsForReview, setStadiumsForReview] = useState<any[]>([]);
const [stadiumMappings, setStadiumMappings] = useState<Record<string, number | null | undefined>>({});
const [pendingEntityReviewApplyId, setPendingEntityReviewApplyId] = useState<number | null>(null);
```

**Trigger condition** (lines ~358-402):
```typescript
if (!isSubsequentLoad && !skipEntityReview) {
  const suggResponse = await fetch(`/v1/api/transitional/${id}/entity-suggestions?sportId=${sportId}`);
  const suggData = await suggResponse.json();
  
  if (suggData.needsReview && (suggData.league || suggData.clubs?.length || suggData.stadiums?.length)) {
    // Show entity review UI
    setPendingEntityReviewApplyId(id);
    // Initialize all mappings to undefined (forces user to choose)
    if (suggData.league) setLeagueMapping(undefined);
    if (suggData.clubs) {
      const clubMap: Record<string, undefined> = {};
      suggData.clubs.forEach(c => { clubMap[c.name] = undefined; });
      setClubMappings(clubMap);
    }
    // ... similar for stadiums
    return; // Block load process until user resolves
  }
}
```

**Two-stage detection**: After the user selects a league mapping and clicks "Apply & Continue":

1. Frontend sends `PATCH /entity-review` with `{ leagueMapping }`
2. Backend saves the league mapping
3. Frontend immediately calls `GET /entity-suggestions` again
4. Backend uses the saved `leagueMapping` to determine `country_id` and filter clubs/stadiums
5. If clubs/stadiums are found, frontend shows Stage 2 UI
6. If not, frontend proceeds directly to load with `skipEntityReview=true`

#### 5.7.7 Frontend UI components

**League selection UI** (lines ~1182-1232):
- Displays incoming league name
- Dropdown with suggestions (if any)
- "Create New League" button (always visible)
- Horizontal layout with "OR" separator

**Club selection UI** (lines ~1248-1300):
- **Responsive grid**: `grid-cols-1 lg:grid-cols-2` (1 column on mobile, 2 on large screens)
- Each club card shows:
  - Incoming club name (bold)
  - Count message: "X existing club(s) found from [Country]"
  - Dropdown (only shown if suggestions exist)
  - "Create New Club" button (always visible, even if dropdown is shown)
- Controls layout: `flex-col sm:flex-row` — vertical stack on mobile, horizontal on desktop
- OR separator: `hidden sm:flex` — only visible on larger screens
- Button styling: `sm:whitespace-nowrap text-center` for responsive wrapping

**Stadium selection UI** (lines ~1305-1357):
- Same responsive pattern as clubs
- Additional display: city name from incoming data
- Count message: "X existing stadium(s) found from [Country]"

**Apply button** (lines ~1360-1445):
- **Disabled when**: `leagueMapping === undefined` OR any club mapping `=== undefined` OR any stadium mapping `=== undefined`
- **Dynamic button text**:
  - If only league selected (no clubs/stadiums in UI yet): "Continue to check clubs/stadiums"
  - If clubs/stadiums present: "Apply mappings and proceed to load"
- **On click handler**:
  1. Saves all mappings via `PATCH /entity-review`
  2. If only league was selected (Stage 1 completion):
     - Re-calls `/entity-suggestions` to get clubs/stadiums
     - If found, populates Stage 2 UI and returns (stays on review screen)
     - If none found, proceeds to load
  3. If clubs/stadiums were present (Stage 2 completion):
     - Calls `handleToDbTables(id, undefined, undefined, false, true)` with `skipEntityReview=true`
  4. Clears entity review state

#### 5.7.8 Integration with load process

**Modified signature** (line ~308):
```typescript
const handleToDbTables = async (
  id: number,
  selectedRoundOverrides?: any,
  roundReviewDrafts?: any,
  dryRun = false,
  skipEntityReview = false  // NEW PARAMETER
) => { ... }
```

**Check condition** (line ~358):
```typescript
if (!isSubsequentLoad && !skipEntityReview) {
  // Run entity detection
}
```

**Skip scenarios**:
- `isSubsequentLoad = true`: Subsequent loads skip entity review (entity mappings already resolved in first load)
- `skipEntityReview = true`: Explicitly passed after user completes entity review, prevents infinite loop
- Round review override present: If user is re-parsing with round overrides, skip entity review (already done)

**After successful load** (lines ~493-504):
- Clears entity review state (review UI, mappings)
- **Important**: `setSelected(null)` is commented out to preserve API metadata display (Origin, League, Season, Fetched)
- Calls `DELETE /entity-review` to clean up saved mappings

#### 5.7.9 Usage during entity creation

When the load process encounters clubs and stadiums, it now checks multiple layers in order:

**Stadium resolution order** (in `ensureStadium()`):
1. **Persistent alias table** — `SELECT entity_id FROM entity_name_aliases WHERE entity_type='stadium' AND alias_name=$1 AND sport_id=$2` (instant, no user interaction)
2. **User entity-review mapping** — `stadiumMappings[venueName]` from the draft review record
3. **Exact match** — `WHERE unaccent(lower(name)) = unaccent(lower($1))`
4. **Normalized match** — strip all non-alphanumeric characters and compare
5. **Canonical match** — run `canonicalizeName()` on both sides (strips stadium words, noise words, sorts alphabetically); check alias table first, then compare all stadiums in the same sport+city
6. **Flexible substring match** — `LIKE '%' || normalizedName || '%'`
7. **INSERT** new stadium record

On steps 4–6, the resolved `(aliasName → stadiumId)` pair is auto-saved to `entity_name_aliases` so future payloads resolve instantly at step 1.

**Club resolution order** (in `findOrCreateClub()`):
1. **Persistent alias table** — `SELECT entity_id FROM entity_name_aliases WHERE entity_type='club' AND alias_name=$1 AND country_id=$2`
2. **User entity-review mapping** — `clubMappings[clubName]`
3. **Cache** — in-memory `clubCache`
4. **Exact/ILIKE match** — `unaccent(lower(name)) = unaccent(lower($1))` / ILIKE
5. **Normalization match** — `normalizeLookupKey()` on all country clubs
6. **INSERT** new club record

On steps 4–5, if the matched name differs from the incoming name the pair is auto-saved to `entity_name_aliases`.

**League handling**: Applied during `applyFirstRowToApp()` when upserting the league record

#### 5.7.10 Responsive design considerations

The entity review UI follows the project's mobile-first responsive design:

**Breakpoints used**:
- **`sm:` (640px)**: Controls layout (flex-col → flex-row), OR separator visibility, button text wrapping
- **`lg:` (1024px)**: Grid columns (1 → 2), card layout width

**Layout patterns**:
- Header section: `flex-col sm:flex-row gap-2 sm:gap-4`
- Pagination controls: `flex-col sm:flex-row`
- Entity cards grid: `grid-cols-1 lg:grid-cols-2 gap-4`
- Card controls: `flex-col sm:flex-row items-start sm:items-center`
- Buttons: `min-w-0 flex-shrink-0 sm:whitespace-nowrap` to prevent overflow

**Testing verified**: Layout adapts correctly from mobile (320px) through tablet (768px) to desktop (1920px+)

#### 5.7.11 `saveEntityReview()` — persistence to alias table

Previously, user-selected mappings were stored only in `api_transitional_entity_review` (scoped to one transitional row and discarded after load). Now `saveEntityReview()` additionally persists each resolved name into the permanent `entity_name_aliases` table:

```typescript
// Derive sport_id + country_id from the leagueMapping
const leagueInfo = await pool.query(`SELECT sport_id, country_id FROM leagues WHERE id = $1`, [leagueMapping]);
for (const [aliasName, entityId] of Object.entries(normalizedClubMappings)) {
    await pool.query(
        `INSERT INTO entity_name_aliases (entity_type, entity_id, alias_name, canonical_name, sport_id, country_id, source)
         VALUES ('club', $1, $2, $3, $4, $5, 'user')
         ON CONFLICT (...) DO UPDATE SET entity_id = EXCLUDED.entity_id, source = 'user'`,
        [entityId, aliasName, canonicalizeName(aliasName), aliasSportId, aliasCountryId],
    );
}
// same loop for stadiumMappings with entity_type='stadium'
```

Key properties:
- `source = 'user'` marks these as human-verified (auto-resolved aliases use `source = 'auto'`)
- User mappings use `ON CONFLICT DO UPDATE` — re-mapping an entity updates the stored alias
- **These records are never deleted** after load. The `api_transitional_entity_review` record is cleaned up, but `entity_name_aliases` rows persist permanently

#### 5.7.12 Common scenarios and outcomes

| Scenario | League decision | Club/Stadium decisions | Result |
|----------|----------------|----------------------|--------|
| New competition from new country | Create new league | Create all new clubs/stadiums | All entities inserted fresh |
| Same competition, different API origin | Map to existing league | Mix of map to existing + create new | Avoids duplicate league, selectively reuses known clubs |
| Subsequent load (same season) | (skipped) | (skipped) | Entities already resolved, fast-path load |
| Different season, same league | Map to existing league | Map to existing clubs (if same teams) | Reuses league and clubs, new season_clubs bridges created |
| Exact match for all entities | (auto-resolved) | (auto-resolved) | If exact matches found with high confidence, may skip review entirely |
| Re-load after user has resolved names once | checked via alias table | checked via alias table | All previously mapped entities resolved from `entity_name_aliases` — no review shown |

---

## 5.8 Persistent Entity Aliases (Canonical Matching)

Added in migration `0011_create_entity_name_aliases_table.sql`. This table permanently stores name→entity mappings so that entity resolution does not require human review on repeated loads.

### Table: `entity_name_aliases`

```sql
CREATE TABLE entity_name_aliases (
    id           SERIAL PRIMARY KEY,
    entity_type  VARCHAR(20)  NOT NULL,       -- 'stadium' | 'club'
    entity_id    INTEGER      NOT NULL,       -- FK to stadiums.id or clubs.id
    alias_name   VARCHAR(300) NOT NULL,       -- exact incoming name from API payload
    canonical_name VARCHAR(300) NOT NULL,     -- canonicalized form (see below)
    sport_id     INTEGER      NULL,           -- scope: sport (NULL = any)
    country_id   INTEGER      NULL,           -- scope: country (NULL = any)
    source       VARCHAR(50)  DEFAULT 'user', -- 'user' | 'auto'
    created_at   TIMESTAMPTZ  DEFAULT now()
);
-- Unique: one alias per (entity_type, alias_name, sport, country)
CREATE UNIQUE INDEX ON entity_name_aliases (entity_type, alias_name, COALESCE(sport_id,0), COALESCE(country_id,0));
-- Lookup by canonical form
CREATE INDEX ON entity_name_aliases (entity_type, canonical_name, COALESCE(sport_id,0), COALESCE(country_id,0));
```

### `canonicalizeName()` helper (top of `api.service.ts`)

Produces a stable, word-order-independent canonical form for any entity name:

```typescript
const STADIUM_WORDS = new Set(['stadium','estadio','stade','stadio','stadion','arena',
  'ground','field','park','parque','coliseum','centre','center','complex','parc']);
const NOISE_WORDS = new Set(['de','do','da','dos','das','del','della','dello','di',
  'le','la','les','the','of','des','a','o','e','y','and','et','und']);

const canonicalizeName = (raw: string): string => {
    const stripped = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const words = stripped.split(/\s+/);
    const kept = words
        .filter(w => !STADIUM_WORDS.has(w) && !NOISE_WORDS.has(w))
        .map(w => w.replace(/[^a-z0-9]/g, ''))
        .filter(w => w.length > 0);
    kept.sort();
    return kept.join(' ');
};
```

**Examples**:

| Incoming name | Canonical form | Matches DB name |
|--------------|---------------|----------------|
| `Estádio Beira-Rio` | `beira rio` | `Estádio Beira-Rio` |
| `Beira Rio` | `beira rio` | ✅ same canonical |
| `Arena do Grêmio` | `gremio` | `Gremio Arena` |
| `Gremio Arena` | `gremio` | ✅ same canonical |
| `St. James' Park` | `james st` | `St James Park` |
| `St James Park` | `james st` | ✅ same canonical |

### `saveAlias()` helper (inside `applyAllRowsToApp`)

Reusable inner function used by both `ensureStadium` and `findOrCreateClub` to persist auto-resolved aliases:

```typescript
const saveAlias = async (entityType, entityId, aliasName, canonicalName, sportId, countryId, source) => {
    await client.query(
        `INSERT INTO entity_name_aliases (entity_type, entity_id, alias_name, canonical_name, sport_id, country_id, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (entity_type, alias_name, COALESCE(sport_id,0), COALESCE(country_id,0)) DO NOTHING`,
        [entityType, entityId, aliasName, canonicalName, sportId, countryId, source]
    );
};
```

### Alias sources

| `source` value | When written | Overwrite policy |
|--------------|-------------|------------------|
| `'auto'` | Matching via normalized / canonical / flexible steps during `ensureStadium` / `findOrCreateClub` | `ON CONFLICT DO NOTHING` (first wins) |
| `'user'` | User-submitted mappings in `saveEntityReview()` | `ON CONFLICT DO UPDATE SET entity_id = EXCLUDED.entity_id, source = 'user'` (user always wins) |

**Persistence**: Records in this table are **never deleted** after load. The `api_transitional_entity_review` row is removed after a successful load, but `entity_name_aliases` rows are permanent.

### 5.9 REST API Standings Creation (Matches Page)

**Purpose**: When a user manually updates a match to `Finished` status in the admin Matches page (`/admin/matches/`), standings must be created for that round and all future rounds must be recalculated. This is the same logic the ETL uses, but triggered via the REST API instead of the ETL pipeline.

**Flow**:
1. Frontend `handleSaveMatches()` detects `match.status === 'Finished'`
2. Calls `standingsApi.create()` → `POST /v1/standings` with `{ sportId, leagueId, seasonId, roundId, matchDate, groupId, homeClubId, awayClubId, homeScore, awayScore, matchId, matchDivisions }`
3. Backend `StandingsService.create()` handles all logic:

**Idempotency**: Before any calculation, checks `SELECT * FROM standings WHERE match_id = ?`. If standings already exist for this match, returns them immediately without creating duplicates.

**Round-aware previous standing lookup**: Instead of using `ORDER BY id DESC` (which would incorrectly pick a round 38 standing as the base when creating round 20), the service uses:
```sql
SELECT s.* FROM standings s
  JOIN rounds r ON r.id = s.round_id
WHERE s.club_id = ? AND s.league_id = ? AND s.season_id = ?
  AND r.round_number < (SELECT round_number FROM rounds WHERE id = ?)
ORDER BY r.round_number DESC LIMIT 1
```
This correctly finds the standing from the highest round **before** the current one (e.g., round 19 when creating round 20), regardless of database insertion order.

**Cascade recalculation**: After inserting the two new standings rows, `cascadeClubStandings()` runs for both clubs:
1. Finds all existing standings for the club in rounds **after** the current one (`round_number > currentRoundNumber`), ordered ascending
2. For each future standing:
   - Fetches the previous standing (highest round < this future round) — now includes the just-inserted row
   - Fetches the opponent's previous standing
   - Loads `match_divisions` for the future match
   - Recalculates via `StandingsCalculatorService.calculate()`
   - **UPDATEs** the existing future standings row with corrected cumulative totals
3. Processes in ascending round order so each recalculated row becomes the correct base for the next

> **Note**: This cascade logic mirrors the ETL's `cascadeClub()` / `_cascadeClub()` functions (§5.6) but is implemented using Drizzle ORM instead of raw SQL, since it runs inside the `StandingsService` rather than the raw-pool ETL transaction.

**Frontend simplification**: The frontend `updateStandings()` function was simplified to a single `standingsApi.create()` call. The previous implementation had a bug where it checked for existing standings via `getByLeagueIdAndSeasonIdAndRoundIdClubId()`, which uses the display endpoint that fills missing clubs with fallback rows — so it **never** returned empty and the `create` branch was never entered. All intelligence (idempotency, round-aware lookup, cascade) is now in the backend.

---

## 6. Database Tables Involved

### Staging / ETL tables
| Table | Purpose |
|-------|---------|
| `api_transitional` | Raw API response storage plus ETL execution flags. Important columns now include `id, league, season, sport, origin, source_url, payload (JSONB), status, fetched_at, fetch_status, flg_run_in_background, flg_infer_clubs, flg_has_groups, number_of_groups, apply_status, apply_result` |
| `api_transitional_entity_review` | Entity deduplication mappings per transitional row. Columns: `transitional_id (PK), league_mapping, club_mappings (JSONB), stadium_mappings (JSONB)`. Deleted after successful load. |
| `entity_name_aliases` | **Persistent** alias→entity mappings. Columns: `id, entity_type, entity_id, alias_name, canonical_name, sport_id, country_id, source ('user'\|'auto'), created_at`. Never deleted. Migration: `0011_create_entity_name_aliases_table.sql` |
| `api_transitional_round_review` | Persisted draft round overrides per transitional row |
| `api_transitional_audit` | Audit trail of apply operations (dry-run or real) |
| `api_import_log` | Error/diagnostic log for failed imports |

### Application tables (written by Load)
| Table | Purpose |
|-------|---------|
| `countries` | Country reference |
| `leagues` | League definitions with sport and country |
| `seasons` | Season per league (start_year, end_year) plus grouped-season metadata such as `number_of_groups` |
| `groups` | Named season groups / conferences / divisions linked to sport, league, and season |
| `rounds` | Round per league/season (round_number) |
| `clubs` | Club with name, short_name, country |
| `sport_clubs` | Club ↔ Sport bridging |
| `season_clubs` | Club ↔ Season/League/Sport bridging, now also carrying `group_id` when the season is grouped |
| `cities` | City with country |
| `stadiums` | Stadium with city and sport |
| `club_stadiums` | Club ↔ Stadium bridging |
| `matches` | The match itself: sport, league, season, round, home/away clubs, stadium, date, status, scores, `origin_api_id` |
| `match_divisions` | Per-period scores (halves, overtime, penalties) |
| `standings` | Cumulative standings per club/round/match — the league table |

---

## 7. Frontend Pages

### Extract page (`/admin/api/etl/extract/`)
- **Top row**: Origin, Sport, Fetch & Store button
- **Secondary row**: League, Season (Api-Football) or Start Date / End Date (ESPN)
- On success: shows the transitional ID and a link to open the T&L page
- **Operational toggles**: The page now exposes `Has groups`, `Number of groups`, `Run in background`, and `Infer clubs`
- **Origin-aware defaults**:
  - ESPN football defaults to round-based, no groups, background fetch enabled, infer clubs enabled
  - ESPN non-football defaults to date-based, grouped, 2 groups, background fetch disabled, infer clubs disabled
  - Api-Football defaults to divisions enabled, no groups, no background fetch, infer clubs enabled
- **Fetch lifecycle awareness**: For long-running ESPN non-football extractions, the page receives a `background: true` response immediately and the stored row later transitions from `fetch_status = 'fetching'` to `done` or `error`

### Transform & Load page (`/admin/api/etl/transform-load/football/`)
- **Available API Loads table**: Lists all `api_transitional` rows with actions:
  - 📊 Table/JSON View (parse and preview)
  - 💾 Transform & Load (apply to DB)
  - 🗑️ Delete
- **Dry Run checkbox**: Above the table, controls whether T&L runs in dry-run mode
- **View modes**: Table / JSON toggle
- **Entity Review section** (shown when entity conflicts detected):
  - **Stage 1 — League**: Dropdown with suggestions + "Create New League" button
  - **Stage 2 — Clubs & Stadiums**: After league resolved, shows:
    - Responsive grid (1 column mobile, 2 columns lg+ screens)
    - Each entity card with incoming name, count message, optional dropdown, "Create New" button
    - Controls adapt: vertical on mobile (`flex-col`), horizontal on desktop (`sm:flex-row`)
  - Apply button: Disabled until all selections made, dynamic text based on workflow stage
  - Two-stage workflow: League first → then clubs/stadiums filtered by league's country
- **Round Review section** (shown when `needs_round_review`):
  - Round Summary table (collapsible per round)
  - Full match list with editable round assignment inputs
  - Re-parse button to apply manual overrides
- **`isSubsequentLoad` behavior**: When detected, skips round review and entity review entirely and goes straight to loading

### Transform & Load page (`/admin/api/etl/transform-load/basketball/`)

The basketball ETL page now mirrors the football workflow but is tailored to ESPN date-based, grouped payloads:

- Uses the same transitional table and parse/apply endpoints
- Polls `GET /v1/api/transitional/:id/apply-status` when a real apply runs in background mode
- Polls the transitional list while any row is still `fetch_status = 'fetching'` so long ESPN day-by-day downloads refresh automatically in the table
- Shows fetch-state awareness directly in the Status column (`Fetching...`, `done`, `error`-style states)
- Disables the basketball Transform & Load buttons while the upstream fetch is still running, preventing premature apply attempts against the placeholder `{}` payload
- Preserves the selected transitional-row metadata in the UI while the load runs
- Adds a dedicated `Repair division scores from payload` action that calls `POST /v1/api/transitional/:id/repair-divisions`
- Keeps dry-runs synchronous, while real applies are usually backgrounded to avoid request timeouts

### Common public standings pages (`/common/standings/*`)

The final-user standings experience has been generalized into shared frontend components:

- Entry page: `/common/standings/` lists the available sports and links into each sport-specific route
- Route family: `/common/standings/football`, `/common/standings/basketball`, and sibling sport pages
- Shared shell: `frontend/components/common/standings/BaseStandings.tsx`
- Shared controls: `FilterBar.tsx`
- Shared table rendering: `StandingsTable.tsx`
- Shared fixtures list: `GamesList.tsx`

Both the football and basketball pages are thin sport-specific wrappers around `BaseStandings`:

- They fetch the sports catalog via React Query
- They resolve the target sport either by full name (`football`, `basketball`) or reduced name (`fb`, `bb`)
- They fetch leagues for that sport
- They choose the default league (`flgDefault` first, otherwise the first league in the response)
- They pass `sportId`, `leagues`, and `initialLeagueId` into `BaseStandings`

Important difference:

- Football and basketball now both rely on season metadata coming from the backend to decide whether grouped-season UI should be enabled
- The football page no longer forces grouped mode at the wrapper level; this avoids empty tables for normal round-based leagues with no groups

The pages still pass mock arrays as fallback props, but real display behavior is now primarily driven by the live queries inside `BaseStandings`.

### Frontend logic for subsequent loads
1. `loadRow()` receives `isSubsequentLoad: true` from parse response → stores in state
2. `handleToDbTables()` checks `isSubsequentLoad` → if true, skips pre-check parse and entity review, directly calls `apply-all-rows`
3. `handleClearResults()` and `handleSelect()` reset `isSubsequentLoad`

---

## 8. Key Decisions & Edge Cases

### Early-played games (rescheduled matches)
Games that belong to round N but are played before round N's natural date window. The algorithm handles these by:
- Keeping "open incomplete rounds" — rounds that ended with exactly 1 match missing
- When a future event matches the missing team pair → reserve it back into the incomplete round
- When sorting rows before Load, rows are sorted by round number ASC so standings calculate correctly even when the JSON order doesn't match chronological order

### Stray detection
When a team conflict occurs (team already assigned to the current round) and >2 teams are missing:
- Check if any already-assigned event in this round has a date >3 days before the current event
- If found → it's a "stray" (misplaced rescheduled game) → unassign it and mark for review
- The user must manually assign the stray to its correct round

### Local timezone clustering
ESPN timestamps are UTC. Date gap detection uses league-local dates (e.g., `America/Brasilia` for Brasileirão) to avoid splitting same-day matches across two calendar days in UTC.

### Scores for non-finished matches
Scores are saved as `null` (not 0) for matches that aren't finished yet. This distinguishes "not played" from "0-0".

### Duplicate prevention
- `origin_api_id` + `league_id` + `season_id` uniquely identifies a match for upsert
- Standings are guarded with `SELECT COUNT(*) FROM standings WHERE match_id = ?`

### Round review — prune, compact, overlay order
1. Automatic inference runs first
2. Sparse rounds (≤3 auto-assigned matches) are pruned (multi-pass, up to 5)
3. Round numbers are compacted to remove gaps
4. Manual overrides are applied AFTER prune+compact (so they target stable numbers)
5. If overrides create gaps, a final compact pass runs
6. `buildReviewConflict` does NOT re-run prune+compact (would corrupt manual assignments)

---

## 9. Phase 4 — ESPN Partial-Score Enrichment

This phase runs **after** the main transaction has committed. It fetches real per-period scores from the ESPN public API and writes them into the `match_divisions` rows that were created with zeroed-out scores during the Load phase.

### 9.1 Why enrichment is needed

The ESPN scoreboard endpoint (`/scoreboard`) used during Extract does not include per-period (halftime / linescore) data. For sports where `flg_espn_api_partial_scores = false` on the `sports` row, the Load phase creates `match_divisions` rows but intentionally sets `home_score = 0, away_score = 0` as placeholders. Enrichment corrects these to real values by making one additional API call per match to ESPN's `/summary` endpoint.

**Trigger condition**: Only matches where **all three** of the following are true are queued for enrichment:
- `flg_has_divisions = false` on the sport (i.e., ESPN does not include partial scores in the scoreboard payload)
- `origin = 'Api-Espn'` — only ESPN data needs this second pass
- `status = 'Finished'` — only completed matches have meaningful partial scores

### 9.2 How enrichment is triggered

At the very end of `applyAllRowsToApp()`, **after** `COMMIT`, the code checks whether any matches were collected:

```typescript
if (!options.dryRun && matchesForEnrichment.length > 0 && transitionalLeagueCode) {
    // resolve ESPN-compatible sport name (football → soccer, etc.)
    ...
    if (flgRunInBackground) {
        setImmediate(() => {
            this.enrichMatchDivisionsFromEspn(sportN, leagueCode, matches).catch(...);
        });
    } else {
        result.enrichment = await this.enrichMatchDivisionsFromEspn(espnSportName, transitionalLeagueCode, matchesForEnrichment);
    }
}
```

The queue (`matchesForEnrichment: Array<{ matchId: number; originApiId: string }>`) is populated during the per-row loop at two sites:

1. **UPDATE path** — when an existing non-finished match becomes finished:
   ```typescript
   if (!flgHasDivisions && transitionalOrigin === 'Api-Espn' && originApiId && status === 'Finished') {
       await client.query(`UPDATE match_divisions SET home_score = 0, away_score = 0 WHERE match_id = $1`, [matchId]);
       matchesForEnrichment.push({ matchId, originApiId });
   }
   ```

2. **INSERT path** — when a brand-new finished match is inserted:
   ```typescript
   if (!flgHasDivisions && transitionalOrigin === 'Api-Espn' && originApiId && status === 'Finished') {
       await client.query(`UPDATE match_divisions SET home_score = 0, away_score = 0 WHERE match_id = $1`, [matchId]);
       matchesForEnrichment.push({ matchId, originApiId });
   }
   ```

The result object always includes `enrichmentQueued: matchesForEnrichment.length` so the frontend can display how many matches were queued.

### 9.3 ESPN Summary endpoint — response structure

**URL**:
```
https://site.api.espn.com/apis/site/v2/sports/{sportName}/{leagueCode}/summary?event={eventId}
```

Example for Premier League:
```
https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=665869
```

**Response shape relevant to enrichment**:
```jsonc
{
  "header": {
    "competitions": [
      {
        "competitors": [
          {
            "homeAway": "home",
            "linescores": [
              { "displayValue": "1" },  // period 1 score
              { "displayValue": "2" }   // period 2 score
            ]
          },
          {
            "homeAway": "away",
            "linescores": [
              { "displayValue": "0" },
              { "displayValue": "1" }
            ]
          }
        ]
      }
    ]
  }
}
```

Key points:
- Linescores are **inline** in the response — no secondary `$ref` fetches needed
- Each linescore object uses `displayValue` (a string like `"1"`) as the score field — not `value`
- The competitors array has exactly two items, identified by `homeAway: "home"` or `"away"`
- This is different from the older ESPN Core API (`sports.core.api.espn.com`), which used a paginated `{items: []}` structure and required secondary HTTP calls for each `$ref`

### 9.4 `fetchEspnEventLinescores` — private helper

```typescript
private async fetchEspnEventLinescores(
    sportName: string,
    leagueCode: string,
    eventId: string,
): Promise<{ homeScores: number[]; awayScores: number[] } | null>
```

**Algorithm**:
1. Constructs the `/summary?event={eventId}` URL
2. Fetches it; returns `null` on HTTP error
3. Extracts `json.header.competitions[0].competitors` (defaults to `[]` if missing)
4. For each competitor:
   - Reads `comp.homeAway` to determine home vs. away
   - Reads `comp.linescores` — if not an array, treats as empty
   - Maps each linescore to `Number(ls.displayValue ?? ls.value) || 0`
5. Returns `{ homeScores, awayScores }` if at least one array is non-empty, otherwise `null`
6. Any exception is caught, logged as a warning, and `null` is returned

**Why it returns `null`** instead of throwing: The enrichment is best-effort. A `null` from this method causes `enrichMatchDivisionsFromEspn` to increment `skipped` and move on.

### 9.5 `enrichMatchDivisionsFromEspn` — orchestrator

```typescript
async enrichMatchDivisionsFromEspn(
    sportName: string,
    leagueCode: string,
    matchesForEnrichment: Array<{ matchId: number; originApiId: string }>,
    rateMs = 200,
): Promise<{ enriched: number; skipped: number; errors: number }>
```

**Key behaviors**:

| Behavior | Detail |
|---------|--------|
| **Own connection pool** | Opens `new Pool({ connectionString: process.env.DATABASE_URL })` outside any transaction — safe to run after COMMIT or as a background task |
| **Idempotent** | Before fetching ESPN, checks `SUM(home_score + away_score)` across all `match_divisions` for the match. If > 0, increments `skipped` and moves on — divisions are already enriched |
| **Rate limiting** | Sleeps `rateMs` milliseconds (default 200 ms) between each match to avoid overwhelming the ESPN API |
| **Division mapping** | Iterates `div = 1..maxDiv` and issues `UPDATE match_divisions SET home_score = $1, away_score = $2 WHERE match_id = $3 AND division_number = $4` for each period |
| **Pool cleanup** | `pool.end()` is called in the `finally` block regardless of outcome |

**Return shape**:
```typescript
{ enriched: number, skipped: number, errors: number }
```
- `enriched`: matches where divisions were successfully written
- `skipped`: matches with already-populated divisions OR where ESPN returned no data
- `errors`: individual match errors caught and logged

### 9.6 Background vs. inline execution

Execution mode is controlled by the `flg_run_in_background` flag stored on the `api_transitional` row (set during the Extract step in the UI):

| Mode | Mechanism | HTTP response |
|------|-----------|--------------|
| **Background** (`flg_run_in_background = true`) | `setImmediate(() => enrichMatchDivisionsFromEspn(...).catch(...))` — fire-and-forget, logged on completion | Returns immediately; `result.enrichment` is not present |
| **Inline** (`flg_run_in_background = false`) | `await enrichMatchDivisionsFromEspn(...)` — synchronous within the request | Returns only after all ESPN calls finish; `result.enrichment = { enriched, skipped, errors }` is included |

In both modes, `result.enrichmentQueued` always reflects how many matches were queued before the decision was made.

**Background mode log output** (Winston, stdout):
```
ESPN enrichment: 38 matches queued (background=true)
ESPN enrichment complete: enriched=34, skipped=2, errors=2
```

### 9.7 Guards and safety conditions

Three independent guards prevent enrichment from running at the wrong time, plus a fourth implicit gate at the upsert level:

1. **Already-finished gate** (upsert level, §5.4): Before any enrichment logic is reached, if `existing.status === 'Finished'` the row loop calls `continue` and moves to the next match. This is the primary reason that matches already enriched in a previous payload are never re-queued — their `match_divisions` are left completely untouched and the enrichment call is never made.

2. **Dry-run guard**: `if (!options.dryRun && ...)` — enrichment is completely skipped when the T&L page is running in dry-run mode. No internet traffic is generated and no divisions are modified.

3. **Finished-status guard**: `&& status === 'Finished'` on both push sites — only matches that already have a final score are queued. `Scheduled` / `InProgress` matches have no meaningful partial scores.

4. **Empty-queue guard**: `&& matchesForEnrichment.length > 0` before triggering — if nothing was queued (e.g., all matches were already enriched, or no ESPN origin matches were finished), the enrichment block is skipped entirely.

**Practical consequence for subsequent payloads**: When processing a second payload for the same league/season, only matches that transitioned from non-finished → finished *in that payload* (or brand-new already-finished matches) are queued. Games fully loaded in the first payload are never re-fetched from ESPN and their partial scores are preserved.

### 9.8 Return value and logging

`applyAllRowsToApp` always returns `enrichmentQueued` in the result:

```typescript
{
  applied: number,
  createdClubs: number,
  createdRounds: number,
  createdDivisions: number,
  createdStandings: number,
  skippedUnchanged: number,
  updatedMatches: number,
  clubsIncluded: string[],
  dryRun: boolean,
  isSubsequentLoad: boolean,
  enrichmentQueued: number,
  enrichment?: { enriched: number, skipped: number, errors: number }  // inline mode only
}
```

---

## 10. Recent Additions Since 2026-03-31

This section captures the implementations added after the previous documentation baseline. It focuses on the delta so the earlier sections remain valid and this document stays readable.

### 10.1 New staging flags and fetch lifecycle

`api_transitional` has become the central execution-state record for ETL jobs, not just a raw payload bucket.

New capabilities:

- `fetch_status` tracks long ESPN day-by-day collections independently of the final load status
- `flg_infer_clubs` allows the load path to decide whether it should try to infer clubs from grouped/date-based payloads
- `flg_has_groups` and `number_of_groups` let the frontend declare grouped seasons before the load starts
- `apply_status` and `apply_result` are used by background apply jobs so the frontend can poll for completion

This means the ETL process now has two separate asynchronous lifecycles:

1. **Fetch lifecycle**: `fetching` → `done` / `error`
2. **Apply lifecycle**: `running` → `done` / `error`

Those two lifecycles solve different timeout problems. Fetch status is needed for long upstream ESPN season downloads; apply status is needed for long database writes and standings generation.

### 10.2 ESPN non-football parse and division repair

The ESPN parse path now supports payloads where per-period scores are already present in each event, especially for basketball.

#### Embedded linescores during parse

`parseTransitionalEspn...` now extracts competitor `linescores` and writes them into the normalized flat row as:

- `divisions.home.1`, `divisions.home.2`, ...
- `divisions.away.1`, `divisions.away.2`, ...

`createMatchDivisions()` checks for those fields first. If they exist, it uses them directly and returns `{ hasLinescores: true }`. This is now the preferred path because it avoids per-match ESPN summary requests when the scoreboard payload already contains period splits.

#### `repairDivisionsFromPayload(id, sportId)`

The backend now exposes `POST /v1/api/transitional/:id/repair-divisions`.

Purpose:

- Re-parse an already-loaded transitional row
- Find rows that contain embedded linescores
- Locate the already-imported `matches` row via `origin_api_id`
- Delete and recreate `match_divisions` using the parsed per-period data

Important constraint: this repair step intentionally does **not** modify matches, standings, clubs, or seasons. It is a surgical fix for division rows only.

This was added to correct earlier basketball imports where total scores had been stored in each division instead of quarter-by-quarter values.

### 10.3 Grouped seasons and group-aware load

Grouped seasons are now fully supported end-to-end in the ETL path.

#### Season bootstrap

When `applyFirstRowToApp()` creates a new season and `flg_has_groups = true`, it performs additional initialization for ESPN grouped competitions.

Current implemented special case:

- NBA via ESPN standings endpoint

Workflow:

1. Create the `seasons` row
2. Detect grouped-season mode from `api_transitional`
3. Fetch ESPN standings for the season
4. Create `groups` rows for each section returned by ESPN (for example, conferences)
5. Resolve or create clubs found in those sections
6. Insert or update `season_clubs.group_id` so the season already knows each club's group before match processing starts
7. Update `seasons.number_of_groups` with the actual count returned by ESPN

#### Group-aware per-row load

During `applyAllRowsToApp()`:

- Existing `season_clubs` rows with `group_id` are preloaded into both a `clubId -> groupId` map and a normalized `clubName -> groupId` map
- `ensureSeasonClub()` uses those maps to assign the correct `group_id` when a club is first encountered in the parsed rows
- If a `season_clubs` row already exists without a group and a group can now be inferred, that row is updated in place

This is what allows later standings rows to carry `group_id` consistently, even when clubs are created or discovered incrementally during the load.

#### Subsequent-load detection for date-based seasons

The ETL no longer relies only on rounds to detect subsequent loads. For date-based competitions such as NBA, the load checks whether matches already exist for the league/season. If they do, the row is treated as a subsequent load even though there may be no `rounds` rows at all.

### 10.4 Background apply jobs and polling

Real apply runs are now backgrounded at the controller level:

- `POST /v1/api/transitional/:id/apply-all-rows`
  - Dry run: synchronous
  - Real run: call `startApplyJob(id)`, return immediately, then execute `applyAllRowsToApp(...)` inside `setImmediate(...)`
- `GET /v1/api/transitional/:id/apply-status`
  - Returns the current `apply_status` and any serialized `apply_result`

This architecture prevents HTTP timeouts when applying hundreds of rows, recalculating standings, and optionally enriching division scores.

The frontend pattern is now:

1. Start the apply
2. If the response includes `background: true`, enter polling mode
3. Poll `/apply-status` every few seconds
4. Stop when status becomes `done` or `error`
5. Show the stored result in the same “Last Operation Result” panel used by synchronous runs

### 10.5 Admin frontend additions

The admin ETL frontend has expanded from a football-only workflow into a more generic operational console.

#### Extract page additions

- Sport-aware schedule defaults (`Round` vs `Date`)
- Toggle for grouped seasons and numeric group count input
- Toggle for background execution
- Toggle for club inference
- Origin-aware defaults so ESPN football and ESPN basketball do not start from the same assumptions

#### Basketball transform/load page additions

- Shares the preview/apply behavior used by football
- Supports background apply polling
- Exposes `repair-divisions` from the action column
- Keeps transitional metadata visible after processing instead of clearing the selected row aggressively

The result is that basketball ETL is now operationally manageable from the UI without relying on manual SQL or one-off scripts.

### 10.6 Public standings pages and fallback logic

The biggest final-user change since the last documentation update is the move from simple round-table rendering to a shared standings experience that understands both round-based and date-based competitions.

#### Backend date fallback: latest row on or before selected day

`StandingsService.findByLeagueIdAndSeasonIdAndMatchDate(...)` no longer behaves like an exact-date lookup.

Current behavior:

1. Parse the selected date
2. Fetch every standings row with `match_date <= selected day end`
3. Keep only the most recent row per club
4. Read the full club list from `season_clubs`
5. For clubs that still have no earlier standing row, synthesize a zeroed row
6. Preserve `group_id` from `season_clubs` in those synthetic rows
7. Return the merged set sorted by a shared comparator

This guarantees that a date-based standings screen always shows the full league table, even if some teams did not play on the selected day or had not yet played at all.

#### Shared sorting rules

The service now uses a dedicated comparator for fallback-filled standings rows:

1. Points descending
2. Wins descending
3. Goal difference descending
4. Goals for descending
5. Club ID ascending as a stable final tie-breaker

That keeps real rows and synthetic fallback rows ordered consistently.

#### Frontend grouped-season rendering

`BaseStandings.tsx` now detects grouped seasons from season metadata (`numberOfGroups` / `number_of_groups`) and fetches the season's groups from `/v1/groups?seasonId=...`.

When the user selects `All groups`:

- **Default mode**: render one standings table per group
- **Optional mode**: if the user enables `Combine groups`, merge all rows into a single combined table

The `Combine groups` checkbox lives in `FilterBar.tsx` and only appears when:

- the season has groups, and
- the selected group is `all`

This preserves the user-requested default behavior: grouped competitions open with separated standings tables, not a forced merged table.

#### Shared public page behavior

`BaseStandings.tsx` now also handles:

- season default selection per league
- date-based default day selection for active and finished seasons
- round-number to round-id translation for round-based APIs
- group-aware filtering for both standings and matches
- historical match loading used by `StandingsTable` for last-5 / last-10 summaries

Additional corrections now in place:

- `typeOfSchedule = 1` is treated as date-based consistently across `BaseStandings.tsx` and `FilterBar.tsx`
- round/date queries do not fire until `roundOrDay` has a real value
- last-5 / last-10 always use the club's full historical season match set; group filtering is only applied to table rows, not to the historical match feed used for form calculation
- when `All groups` is selected without `Combine groups`, each table keeps its own rows but the group label is rendered inside the first header cell as `TEAM (Group Name)` instead of as a separate title row above the table

#### Shared filter-bar behavior

`FilterBar.tsx` is the public standings control surface. It is responsible for:

- top-row league selection
- season selection sorted descending by season start year
- round input for round-based competitions, including typed numeric input and previous/next buttons
- date picker for date-based competitions, including previous/next day navigation and calendar opening
- view-type toggle between `All`, `Home`, and `Away`
- group selection for grouped seasons
- conditional `Combine groups` checkbox when the selected view is `All groups`

Recent UI refinements:

- round and date navigation now use neutral SVG chevrons instead of text glyph arrows
- the date control no longer renders a duplicate custom calendar button; it relies on the native date-input picker icon only

This component is not only visual. It also contains schedule-type-sensitive initialization logic:

- date-based leagues default to an ISO date value
- round-based leagues fetch the current round for the selected league/season and initialize the control from that result
- grouped seasons trigger a season-groups fetch and reset the selected group to `all`

#### Football public page behavior

`/common/standings/football` is now a real backend-connected public page, not a static mockup.

Current behavior:

1. Query the sports catalog
2. Resolve the Football sport by `name === 'football'` or `reducedName === 'fb'`
3. Query leagues for that sport
4. Pick the default football league
5. Render `BaseStandings` with `title="Standings — Football"`, the resolved `sportId`, and the live league list

Because football leagues are predominantly round-based in this codebase, the football page benefits especially from the shared round logic:

- current round auto-selection for active seasons
- last round auto-selection for finished seasons
- round-number to round-id translation before calling `/v1/standings` and `/v1/matches`
- grouped-table rendering when the season exposes groups

Important correction:

- the football page now passes `hasGroups={false}` at the wrapper level and lets season metadata decide whether groups exist; this restored the normal standings table for leagues such as Premier League that are round-based and non-grouped

#### Basketball public page behavior

`/common/standings/basketball` follows the same high-level pattern, but it primarily exercises the date-based branch of the shared standings shell.

Current behavior:

1. Query the sports catalog
2. Resolve the Basketball sport by `name === 'basketball'` or `reducedName === 'bb'`
3. Query leagues for that sport
4. Pick the default basketball league
5. Render `BaseStandings` with `title="Standings — Basketball"`, the resolved `sportId`, and the live league list

The basketball page then depends on the shared date-based standings logic documented above, including latest-standing fallback by selected day and grouped-table separation when the chosen season is grouped.

It also now benefits from the same public-shell fixes as football:

- consistent date-based schedule detection via `typeOfSchedule = 1`
- stable date navigation controls
- correct last-5 / last-10 computation in separated conference tables

### 10.7 April 2026 correction pass

Several regressions introduced while extending basketball support were corrected in both the public standings frontend and the ETL backend.

#### Public standings frontend corrections

- `BaseStandings.tsx` and `FilterBar.tsx` now agree that schedule code `1` means date-based competition
- football no longer forces grouped rendering from the page wrapper, so non-grouped football leagues render the normal standings table again
- separated-group standings no longer render an extra conference title row above each table; the label moves into the first column header as `TEAM (Eastern Conference)` / `TEAM (Western Conference)`
- form columns (`LAST 5`, `LAST 10`) now use the full historical match set for each club, including cross-group games, instead of incorrectly trimming history to the currently-rendered group only
- date/round navigation arrows were restyled with cleaner chevrons, and the duplicate calendar icon was removed from the date control

#### ETL backend corrections

- ESPN parsers now emit `fixture.status.completed`, and load-time finished detection uses that boolean (plus `FT`) instead of assuming every `state = 'post'` game is finished. This prevents postponed football matches from being loaded as false `0-0` finals
- ESPN cross-year seasons now derive `league.season` from the season start date / calendar start date rather than the display year. This fixes date-based subsequent loads such as NBA 2025/2026, where the payload labels the season as `2026` but the DB season key is `start_year = 2025`
- `detectEntitiesForReview()` now skips country/league entity-review prompts for date-based ESPN payloads when the league and season already exist, so NBA update loads do not re-enter first-load review flow

Net effect:

- football subsequent loads ignore postponed matches correctly
- NBA update payloads resolve the existing season correctly
- date-based subsequent loads proceed directly into match updates instead of reopening first-load entity review


### 10.8 Recent work (2026-04-05 → 2026-04-07)

This subsection documents the fixes and refinements performed during the two-day prompt-driven session that started on 2026-04-05. Treat this as the canonical changelog for the small, targeted changes that affect standing-zones, the admin UI, and the public standings rendering.

- **Frontend — `BaseStandings` (public standings)**:
  - Unwrap the paginated `standing-zones` response and request a full page (`page=1&limit=1000`) so the UI receives all zones for a league/season.
  - Pass the selected `seasonId` when fetching zones so season-aware filters can be applied.
  - Apply deterministic override ordering when building the position→color maps: non-priority zones are applied first and `flg_priority` zones are applied last so a priority zone reliably overrides overlapping ranges.
  - Enforce the start/end year envelope client-side as an additional safety net (only zones that fully englobe the selected season's `startYear`/`endYear` apply when `seasonId` is null on the zone). This mirrors the backend rule and prevents accidental color application for partially-overlapping year ranges.

  ### 10.9 April 2026 basketball standings table spec implementation

  The basketball public standings page now uses the existing shared standings table implementation, but with a basketball-specific rendering branch so football behavior remains unchanged.

  Files changed:

  - `frontend/app/common/standings/basketball/page.tsx`
  - `frontend/components/common/standings/BaseStandings.tsx`
  - `frontend/components/common/standings/StandingsTable.tsx`

  Key behavior implemented from `documentation/Standings-Description-by-Sport.xlsx`:

  - The basketball page passes `sportKey="basketball"` into `BaseStandings`, which forwards it to `StandingsTable`
  - `StandingsTable` keeps the existing football layout for all other sports and uses a dedicated basketball column layout only when `sportKey === "basketball"`
  - The basketball table now renders columns in this strict order:
    - `Team`
    - `Pl`
    - `W`
    - `L`
    - `%`
    - `GB`
    - `HOME`
    - `AWAY`
    - `OT`
    - `LAST 5`
    - `LAST 10`
    - `STRK`
  - This applies to both combined standings tables and separated group/conference tables because both render paths already funnel through the shared `StandingsTable`

  Basketball-specific field behavior:

  - `%` is shown with 3 decimal places in NBA-style format (for example `.681`), using the existing percentage value when present; if the raw value is stored as `68.1` / `68`, it is normalized by dividing by `100`
  - `GB` is calculated on the frontend as `first_place_wins - current_team_wins`
  - `HOME` is rendered as `home_wins-home_losses`
  - `AWAY` is rendered as `away_wins-away_losses`
  - `OT` is rendered as `overtime_wins-overtime_losses`
  - `LAST 10` is rendered in basketball form as `W-L` when there are no draws; if a dataset ever contains draws, it falls back to `W-D-L`
  - `STRK` is computed from the most recent consecutive results when no explicit streak value exists, scanning backward from the current day / selected day cutoff without breaking the already-correct selected-day behavior

  General-information rules preserved carefully:

  - The selected day behavior was not changed; standings still use values up to the chosen day only
  - Basketball ordering is now frontend-specific and follows `%` then `GB`, as requested by the workbook, without changing football sorting
  - Football pages and football standings columns were left untouched
  - The implementation is adaptable: only the basketball render branch was specialized, so future league-specific basketball table variations can be introduced without rewriting the football/shared flow entirely

  Important interpretation note:

  - The workbook is internally ambiguous between `LAST 10` and `STRK` descriptions
  - Implementation follows the NBA semantics described in the same workbook and ESPN sample payloads:
    - `LAST 10` remains the last-ten record
    - `STRK` displays the current consecutive-result streak such as `3W` or `2L`

- **Frontend — Admin UI (`frontend/app/admin/standing-zones/page.tsx`)**:
  - Added columns and form inputs for `start_year`, `end_year`, and `flg_priority` so admins can set envelope years and priority when creating/updating zones.
  - Include the new fields in create/update payloads so the backend receives the values from the modal form.

- **Frontend — API client (`frontend/lib/api/entities.ts`)**:
  - Ensure `standingZonesApi.getFiltered` returns a consistent shape (paginated envelope or wrapped array) and supports `sportId`, `leagueId`, and `seasonId` query params.

- **Backend — `StandingZonesService` (`backend/src/standing-zones/standing-zones.service.ts`)**:
  - Implemented the season-year envelope filter when `seasonId` is provided. A standing zone applies when at least one of the following is true:
    - `standing_zones.season_id = <seasonId>` (explicit binding)
    - `standing_zones.season_id IS NULL` AND `(standing_zones.start_year IS NULL OR standing_zones.start_year <= season.start_year)` AND `(standing_zones.end_year IS NULL OR standing_zones.end_year >= season.end_year)` — i.e., the zone's [start_year, end_year] fully englobe the season.
  - Adjusted SQL construction so a `season_id = NULL` zone is not treated as universally valid; it must satisfy the envelope condition (this resolves cases such as `zone: 2025/null` incorrectly matching `season: 2024/2025`).
  - Added ordering by `flg_priority` (non-priority first, priority last) to keep returned rows deterministic for frontend application logic.

- **Backend — DTOs & Controller**:
  - Reviewed `CreateStandingZoneDto` / `UpdateStandingZoneDto` to ensure `start_year`, `end_year`, and `flg_priority` are accepted by the controller and validated by class-validator. Confirmed `standing-zone.dto.ts` includes these fields.

- **Bug investigation & fix summary**:
  - Symptom: Admin changes to `start_year`/`end_year`/`flg_priority` were not reliably reflected in public standings; priority colors applied incorrectly in some seasons.
  - Root causes found and addressed:
    1. Frontend was fetching a paginated subset and sometimes received an ordering that caused non-priority zones to override priority ones. Fixed by fetching full set and applying deterministic ordering client-side.
    2. Backend filter logic allowed `season_id IS NULL` zones to be treated as universally applicable even when their year envelope did not englobe the selected season. Fixed by tightening the year-envelope SQL condition.
    3. DTO/controller acceptance needed review — `standing-zone` DTOs were checked and confirmed to accept the new fields; update path uses `set(dto as any)` so provided fields are persisted.

- **Verification**:
  - Performed HTTP GET checks against `/v1/standing-zones?sportId=...&leagueId=...&seasonId=...` to inspect payload shape and confirm `start_year`, `end_year`, and `flg_priority` are returned in the envelope.
  - Manually tested the public standings UI for the English Premier League `2024/2025` season and verified that a zone with `start_year = 2025` and `end_year = null` no longer applies (correctly excluded), while `null/null`, `2021/null`, `null/2026`, and exact `2024/2025` zones still apply.

- **Notes & caveats**:
  - The backend TypeScript check and dev server restart are recommended after these changes to ensure the running API reflects the updated filter logic (some local tsc runs were attempted during the work; run `cd backend && npx tsc --noEmit -p tsconfig.json` and restart the NestJS process to be safe).
  - The frontend uses React Query caching; after backend changes, perform a hard refresh or invalidate the `['standing-zones', sportId, league, season]` cache to avoid stale responses.

- **Next steps (suggested)**:
  - Run backend typecheck and restart the backend dev server to load the updated SQL logic.
  - Re-test the admin update -> GET -> UI flow for several combinations of `start_year`/`end_year` (open-ended bounds null) to ensure all edge cases behave as expected.
  - Add a small automated test (integration or e2e) that asserts the year-envelope behavior for `standing_zones` to prevent regressions.

### 10.9 Season-phase filtering for Api-Football payloads (2026-04-09)

The `seasonPhase` filter (`All`, `Regular Season`, `Postseason`) was originally implemented only for ESPN payloads, which use `event.season.slug` to distinguish regular-season from postseason events. Api-Football payloads use a different mechanism — the `league.round` string:

| `league.round` value | Classification |
|---|---|
| `"Regular Season - 1"` … `"Regular Season - 34"` | Regular season |
| `"Relegation Round"` | Postseason |
| `"Conference League Play-offs - Semi-finals"` | Postseason |
| `"Conference League Play-offs - Final"` | Postseason |
| Any string **not** starting with `"Regular Season"` | Postseason |

**New private method**: `filterApiFootballFixturesBySeasonPhase(fixtures, seasonPhase)` in `api.service.ts`. It reuses `normalizeSeasonPhaseFilter()` and checks whether the flattened `league.round` key starts with `"regular season"` (case-insensitive). When `seasonPhase = 'regular-season'`, only those rows are kept. When `seasonPhase = 'postseason'`, only non-regular-season rows are kept. `'all'` returns everything unchanged.

**Integration points**:

1. **`parseTransitional()` — Api-Football branch**: After flattening the raw payload into `flatRows`, the new filter is applied before returning.
2. **`applyAllRowsToApp()` — subsequent-load fast path**: The Api-Football branch now passes `options.seasonPhase` through to `parseTransitional()` (previously it was omitted, so subsequent loads always processed all fixtures regardless of the UI selection).

**Frontend**: The football T&L page (`/admin/api/etl/transform-load/football/`) already sends `seasonPhase` in both the parse query string and the apply request body, so no frontend changes were needed.

### 10.10 ESPN first-load guard with pre-existing season rows (2026-04-09)

An additional bug was fixed in the ESPN round-based import flow for leagues such as `ned.1`.

**Symptom**:

- A first payload for a new season could reach the round-review workflow successfully
- After the user entered manual round assignments and clicked to continue, the backend could stop with a duplicate-season style message instead of proceeding with the actual load

**Root cause**:

`parseTransitional()` previously treated the existence of a `seasons` row by itself as enough evidence that the import should be aborted (`season_already_exists`) for round-based ESPN competitions.

That assumption is too strong. A `seasons` row may already exist because:

- the season was pre-created administratively, or
- earlier setup work created league/season metadata before any rounds or matches were actually imported

In that state, the import is still a **first load** and must continue through round review, entity review, `applyFirstRowToApp()`, and the real per-row load.

**Corrected behavior**:

- `parseTransitional()` now aborts round-based ESPN imports only when the target season already has imported rounds
- If a season row exists but rounds are still absent, the flow continues as a first load and still reaches round review / entity review / real load
- **Date-based ESPN seasons**: treat as a subsequent load only when the target league/season already has imported `matches`
- **Round-based ESPN seasons**: abort as duplicate only when the target league/season already has imported `rounds`
- If the season exists but has **no rounds** (round-based) or **no matches** (date-based), the parser now continues as a normal first-load flow

### 10.11 ESPN NBA subsequent-load fixes and fetch-state guard (2026-04-09)

Two related bugs were fixed in the ESPN basketball/date-based import flow, especially visible on NBA season updates.

**Symptom**:

- A day-by-day NBA extraction could report that hundreds of events were fetched successfully
- Clicking Transform & Load too early could return `{ reason: 'no_events_array', applied: 0 }`
- Even after the payload existed, subsequent-load auto-detection could still fail to recognize the already-imported NBA league/season

**Root cause 1 — apply/parse could run before the background fetch finished**:

For ESPN non-football seasons, `fetchAndStore()` inserts an `api_transitional` placeholder row immediately with:

- `payload = '{}'`
- `fetch_status = 'fetching'`

The real day-by-day fetch then runs in the background and later patches the row with the merged payload. Before this fix, `parseTransitional()` and `applyAllRowsToApp()` did not reject work during the `fetching` window, so the parser could read the placeholder payload and correctly conclude that `payload.events` was empty, producing `no_events_array`.

**Corrected behavior**:

- `parseTransitional()` now returns `fetch_not_complete` when `fetch_status !== 'done'`
- `applyAllRowsToApp()` now returns the same guard result instead of trying to parse the placeholder payload
- The basketball admin page now surfaces fetch progress in the rows table, auto-refreshes while rows are still fetching, and disables T&L actions until the fetch completes

**Root cause 2 — ESPN league lookup used the wrong identifier during subsequent-load detection**:

The fast-path lookup for ESPN subsequent loads previously queried `leagues.espn_id` using `row.league`, which is the ESPN URL code such as `nba`, `eng.1`, or `esp.1`.

That does not match how the league is actually stored during first load. `applyFirstRowToApp()` persists `leagues.espn_id` from `payload.leagues[0].id`, which for NBA is the numeric ESPN league id (`46`), not the URL slug (`nba`).

**Corrected behavior**:

- Both `parseTransitional()` and `applyAllRowsToApp()` now prefer `payload.leagues[0].id` for the `espn_id` lookup
- The previous league-name match remains as a fallback, so the lookup is now consistent with how ESPN leagues are inserted on first load
- This restores reliable subsequent-load detection for date-based leagues such as NBA, where the system should skip heavyweight round inference and go straight to the lightweight event extraction path

**Season-phase safety note**:

`filterEspnEventsBySeasonPhase()` now keeps events whose `event.season.slug` is missing instead of dropping them. This does not change normal regular-season/postseason filtering for payloads that already provide a slug (such as NBA regular-season data); it only prevents slug-less day-by-day events from being discarded unnecessarily.

This keeps the reparse-after-manual-round-review path working correctly for first payloads of a season.

---

## 11. Pending / Future Work

The following items are known areas that still need implementation or refinement:

- **Multi-origin `origin_api_id`**: Currently the column is a plain text field. In the future, additional origins may be added, potentially requiring a reference table for origins.
- **Other sports T&L pages**: Basketball now has a dedicated T&L page, but volleyball, handball, ice-hockey, and futsal may still need sport-specific ETL validation and UI refinement.
- **Volleyball standings**: The `calculateVolleyball` method is marked as TODO — the points-per-set logic is partially implemented but needs validation.
- **Integration testing**: No automated test covers the full ETL pipeline end-to-end; verification has been manual.
- **Error recovery**: If a load fails partway through, the transaction rolls back completely. There's no partial-apply or resume capability.
- **Performance**: The per-row processing loop makes many individual DB queries (club lookup, city lookup, etc.). For very large payloads this could be optimized with batch operations.
- **Alias table UI**: There is no admin page yet to view or edit `entity_name_aliases` records. Currently the only way to correct a wrong auto-resolved alias is via a direct DB update.
- **Stadium/Club canonical matching + persistent aliases (IMPLEMENTED)**: `canonicalizeName()` helper strips venue/noise words, removes diacritics/punctuation, and sorts words alphabetically so that word-order variants and prefix differences resolve to the same canonical form. The `entity_name_aliases` table persists all resolved mappings permanently so user decisions are never lost when a new payload is fetched. `ensureStadium()` now checks aliases first (step 0), runs canonical matching (step 4), and auto-saves aliases on every match hit. `findOrCreateClub()` also checks aliases first. `detectEntitiesForReview()` skips entities that already have an alias. `saveEntityReview()` persists user mappings (`source='user'`) in addition to the existing draft review record. Migration: `0011_create_entity_name_aliases_table.sql`.

- **ESPN league-specific timezone config (IMPLEMENTED)**: The `LEAGUE_TIMEZONE` is now configurable per-league instead of being hardcoded to `America/Brasilia`. League-specific timezone values are stored and used during parsing and date computations so that local-day clustering and date-based logic (e.g., grouping matches that occur on the same local calendar day) respect the league's timezone and DST rules.

- **Admin timezone correction UI (NEW)**: An admin page was added to allow manual corrections of match datetimes for a selected League (required) and optionally Season, one or multiple Rounds, or a single Match. The page supports three adjustment modes:
  - `country`: apply the league's configured timezone conversion (DST-aware) to stored UTC datetimes.
  - `manual`: add or subtract whole-hour offsets to match datetimes (e.g., +1, -2 hours).
  - `set`: set an exact time (HH:MM) and optionally an exact date (YYYY-MM-DD) for matches; when `set` is used the server writes the exact UTC instant corresponding to the provided date/time (avoiding server-local timezone shifts).
  The admin flow updates only the `matches.date` field (it does NOT touch `standings`) and supports batch updates across non-sequential round selections.
- **Enrichment standings update**: After ESPN enrichment writes real partial scores into `match_divisions`, the standings rows already in the DB were calculated with `home_score = 0, away_score = 0` for those divisions. If the standings calculator relies on division data (e.g., overtime wins from `match_divisions`), those standings rows may be slightly incorrect. A post-enrichment standings recalculation step is not yet implemented.
- **Enrichment retry on partial failure**: If enrichment fails for a subset of matches (e.g., ESPN rate-limits mid-batch), there is no automatic retry. Re-running the full T&L load would skip already-finished matches (upsert guard), so the only current workaround is to manually trigger enrichment or re-run after clearing the affected division scores.

- **ESPN status mapping — `fixture.status.state` (IMPLEMENTED)**: Both ESPN parsers (`parseTransitionalEspn` and `parseTransitionalEspnLightweight`) now emit `fixture.status.state` from ESPN's `status.type.state` field. The status mapping in both load paths (`applyAllRowsToApp` first-load at ~line 3619 and subsequent-load fast path at ~line 3213) was updated from `statusShort === 'FT'` to `(statusShort === 'FT' || statusState === 'post')`. This correctly handles ESPN matches with non-FT shortDetails like `'ABN'` (abandoned), `'AET'` (after extra time), or clock-time strings like `"90'+6'"` — all of which have `state: 'post'` when the game is over.

- **REST API standings creation with cascade (IMPLEMENTED)**: `StandingsService.create()` was overhauled with three fixes: (1) **Idempotency** — checks if standings for the given `matchId` already exist before creating. (2) **Round-aware previous standing lookup** — uses `round_number` ordering via JOIN with rounds table instead of `ORDER BY id DESC`, which would pick the wrong base when creating a mid-season standing retroactively. (3) **Cascade recalculation** — new `cascadeClubStandings()` private method recalculates all future-round standings for both clubs after insertion, mirroring the ETL's `cascadeClub()` logic. The frontend `updateStandings()` in the Matches page was simplified to just call `standingsApi.create()` directly, removing a broken existence check that used a display endpoint (with fallback fill) which never returned empty. See §5.9.
