# ETL Transform & Load — Complete Implementation Reference

> **Purpose**: This document describes the full, current implementation of the ETL (Extract → Transform → Load) pipeline in the Championships application.  
> It is intended as a **context-restoring prompt** — ask Copilot to read this file at the start of any new session to recover full knowledge of the system.
>
> **Last updated**: 2026-03-20

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
6. [Database Tables Involved](#6-database-tables-involved)
7. [Frontend Pages](#7-frontend-pages)
8. [Key Decisions & Edge Cases](#8-key-decisions--edge-cases)
9. [Pending / Future Work](#9-pending--future-work)

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
   - **Date gap boundary**: If >1 day gap between consecutive matches (in league-local timezone, e.g., `America/Sao_Paulo`) AND the round isn't full yet, advance to next round and track the current round as "open incomplete"
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

**Behavior differences**:
- **Skip full parse**: Use `parseTransitionalEspnLightweight()` for ESPN (or standard `parseTransitional()` for Api-Football which is already lightweight)
- **Skip `applyFirstRowToApp()`**: Country/League/Season already exist
- **Skip round creation**: Rounds already exist; existing `round_id` is preserved via COALESCE
- The per-row processing loop still runs normally, handling upserts

### 5.3 Per-row processing loop

Rows are **sorted by round number ascending** before processing (critical for correct standings calculation).

For each row:
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

---

## 6. Database Tables Involved

### Staging / ETL tables
| Table | Purpose |
|-------|---------|
| `api_transitional` | Raw API response storage. Columns: `id, league, season, sport, origin, source_url, payload (JSONB), status, fetched_at` |
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
- **Round Review section** (shown when `needs_round_review`):
  - Round Summary table (collapsible per round)
  - Full match list with editable round assignment inputs
  - Re-parse button to apply manual overrides
- **`isSubsequentLoad` behavior**: When detected, skips the round review UI entirely and goes straight to loading

### Frontend logic for subsequent loads
1. `loadRow()` receives `isSubsequentLoad: true` from parse response → stores in state
2. `handleToDbTables()` checks `isSubsequentLoad` → if true, skips the pre-check parse (which would show round review) and directly calls `apply-all-rows`
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
ESPN timestamps are UTC. Date gap detection uses league-local dates (e.g., `America/Sao_Paulo` for Brasileirão) to avoid splitting same-day matches across two calendar days in UTC.

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

## 9. Pending / Future Work

The following items are known areas that still need implementation or refinement:

- **Multi-origin `origin_api_id`**: Currently the column is a plain text field. In the future, additional origins may be added, potentially requiring a reference table for origins.
- **Other sports T&L pages**: The etl/transform-load folder has pages for basketball, volleyball, handball, ice-hockey, futsal — they share the same general structure but may need sport-specific parsing adjustments.
- **Volleyball standings**: The `calculateVolleyball` method is marked as TODO — the points-per-set logic is partially implemented but needs validation.
- **Integration testing**: No automated test covers the full ETL pipeline end-to-end; verification has been manual.
- **Error recovery**: If a load fails partway through, the transaction rolls back completely. There's no partial-apply or resume capability.
- **Performance**: The per-row processing loop makes many individual DB queries (club lookup, city lookup, etc.). For very large payloads this could be optimized with batch operations.
- **ESPN league-specific timezone config**: The `LEAGUE_TIMEZONE` is hardcoded to `America/Sao_Paulo`. For other ESPN league endpoints (e.g., MLS, La Liga) this should become configurable.
