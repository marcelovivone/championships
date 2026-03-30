# ETL Transform & Load — Complete Implementation Reference

> **Purpose**: This document describes the full, current implementation of the ETL (Extract → Transform → Load) pipeline in the Championships application.  
> It is intended as a **context-restoring prompt** — ask Copilot to read this file at the start of any new session to recover full knowledge of the system.
>
> **Last updated**: 2026-03-30

---

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
10. [Pending / Future Work](#10-pending--future-work)

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

### ESPN URL construction
```
https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20250801-20260531&limit=1000
```
- Date range is built from startDate/endDate, formatted as `YYYYMMDD-YYYYMMDD`
- `limit=1000` ensures all matches in the range are returned

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
| `goals.home` | `homeTeam.score` |
| `goals.away` | `awayTeam.score` |
| `teams.home.name` | `homeTeam.team.displayName` |
| `teams.away.name` | `awayTeam.team.displayName` |
| `fixture.date` | `competition.date` |
| `fixture.venue.city` | `venue.address.city` |
| `fixture.venue.name` | `venue.fullName` |
| `fixture.status.long` | `status.description` |
| `fixture.status.short` | `status.shortDetail` |
| `origin_api_id` | `event.id` (string) |

### 4.3 ESPN parsing — Lightweight (subsequent load)

Called when **rounds already exist** in the DB for this league/season.

**Method**: `parseTransitionalEspnLightweight(row)`

Produces the **exact same flat-row format** as the full parser BUT:
- **Does NOT run round inference** (saves significant processing time and avoids round review)
- Sets `league.round = null` for every row
- The Load step will preserve the existing `round_id` from the database via `COALESCE`

**Detection**: In `parseTransitional()`, before calling the full ESPN parser:
1. Extract league metadata via `extractLeagueMetadata(row)`
2. Look up the league and season in the DB
3. Count rounds: `SELECT COUNT(*) FROM rounds WHERE league_id = ? AND season_id = ?`
4. If count > 0 → it's a subsequent load → use lightweight parser and return `isSubsequentLoad: true`

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
5. **Prepare match data**: Parse date, determine status (`FT` → `Finished`, else `Scheduled`), extract scores (null if not finished)
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

When the load process encounters clubs and stadiums, it checks the saved mappings:

**Club handling** (in `findOrCreateClub()`):
```typescript
if (clubMappings && clubMappings[clubName] !== undefined) {
  if (clubMappings[clubName] === null) {
    // User chose "Create New Club" → proceed with INSERT
  } else {
    // User selected existing club ID → return that ID instead of creating
    return clubMappings[clubName];
  }
}
// Default fallback: fuzzy lookup and create if not found
```

**Stadium handling** (in `ensureStadium()`):
```typescript
if (stadiumMappings && stadiumMappings[stadiumName] !== undefined) {
  if (stadiumMappings[stadiumName] === null) {
    // User chose "Create New Stadium"
  } else {
    // User selected existing stadium ID
    return stadiumMappings[stadiumName];
  }
}
// Default fallback: exact lookup and create if not found
```

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

#### 5.7.11 Common scenarios and outcomes

| Scenario | League decision | Club/Stadium decisions | Result |
|----------|----------------|----------------------|--------|
| New competition from new country | Create new league | Create all new clubs/stadiums | All entities inserted fresh |
| Same competition, different API origin | Map to existing league | Mix of map to existing + create new | Avoids duplicate league, selectively reuses known clubs |
| Subsequent load (same season) | (skipped) | (skipped) | Entities already resolved, fast-path load |
| Different season, same league | Map to existing league | Map to existing clubs (if same teams) | Reuses league and clubs, new season_clubs bridges created |
| Exact match for all entities | (auto-resolved) | (auto-resolved) | If exact matches found with high confidence, may skip review entirely |

---

## 6. Database Tables Involved

### Staging / ETL tables
| Table | Purpose |
|-------|---------|
| `api_transitional` | Raw API response storage. Columns: `id, league, season, sport, origin, source_url, payload (JSONB), status, fetched_at` |
| `api_transitional_entity_review` | Entity deduplication mappings per transitional row. Columns: `transitional_id (PK), league_mapping, club_mappings (JSONB), stadium_mappings (JSONB)` |
| `api_transitional_round_review` | Persisted draft round overrides per transitional row |
| `api_transitional_audit` | Audit trail of apply operations (dry-run or real) |
| `api_import_log` | Error/diagnostic log for failed imports |

### Application tables (written by Load)
| Table | Purpose |
|-------|---------|
| `countries` | Country reference |
| `leagues` | League definitions with sport and country |
| `seasons` | Season per league (start_year, end_year) |
| `rounds` | Round per league/season (round_number) |
| `clubs` | Club with name, short_name, country |
| `sport_clubs` | Club ↔ Sport bridging |
| `season_clubs` | Club ↔ Season/League/Sport bridging |
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

## 10. Pending / Future Work

The following items are known areas that still need implementation or refinement:

- **Multi-origin `origin_api_id`**: Currently the column is a plain text field. In the future, additional origins may be added, potentially requiring a reference table for origins.
- **Other sports T&L pages**: The etl/transform-load folder has pages for basketball, volleyball, handball, ice-hockey, futsal — they share the same general structure but may need sport-specific parsing adjustments.
- **Volleyball standings**: The `calculateVolleyball` method is marked as TODO — the points-per-set logic is partially implemented but needs validation.
- **Integration testing**: No automated test covers the full ETL pipeline end-to-end; verification has been manual.
- **Error recovery**: If a load fails partway through, the transaction rolls back completely. There's no partial-apply or resume capability.
- **Performance**: The per-row processing loop makes many individual DB queries (club lookup, city lookup, etc.). For very large payloads this could be optimized with batch operations.
- **ESPN league-specific timezone config (IMPLEMENTED)**: The `LEAGUE_TIMEZONE` is now configurable per-league instead of being hardcoded to `America/Brasilia`. League-specific timezone values are stored and used during parsing and date computations so that local-day clustering and date-based logic (e.g., grouping matches that occur on the same local calendar day) respect the league's timezone and DST rules.

- **Admin timezone correction UI (NEW)**: An admin page was added to allow manual corrections of match datetimes for a selected League (required) and optionally Season, one or multiple Rounds, or a single Match. The page supports three adjustment modes:
  - `country`: apply the league's configured timezone conversion (DST-aware) to stored UTC datetimes.
  - `manual`: add or subtract whole-hour offsets to match datetimes (e.g., +1, -2 hours).
  - `set`: set an exact time (HH:MM) and optionally an exact date (YYYY-MM-DD) for matches; when `set` is used the server writes the exact UTC instant corresponding to the provided date/time (avoiding server-local timezone shifts).
  The admin flow updates only the `matches.date` field (it does NOT touch `standings`) and supports batch updates across non-sequential round selections.
- **Enrichment standings update**: After ESPN enrichment writes real partial scores into `match_divisions`, the standings rows already in the DB were calculated with `home_score = 0, away_score = 0` for those divisions. If the standings calculator relies on division data (e.g., overtime wins from `match_divisions`), those standings rows may be slightly incorrect. A post-enrichment standings recalculation step is not yet implemented.
- **Enrichment retry on partial failure**: If enrichment fails for a subset of matches (e.g., ESPN rate-limits mid-batch), there is no automatic retry. Re-running the full T&L load would skip already-finished matches (upsert guard), so the only current workaround is to manually trigger enrichment or re-run after clearing the affected division scores.
