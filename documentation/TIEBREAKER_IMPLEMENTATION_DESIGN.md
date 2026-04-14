# Unified Tiebreaker Implementation Design

Implementation note: the shipped implementation is documented in `documentation/STANDING_ORDER_IMPLEMENTATION_REFERENCE.md`. This file remains the design document that explains the rationale and target behavior.

## Problem Statement

The current `compareStandingRows()` function applies a single, hardcoded sort order (Points → Wins → GD → GF → ClubID) to **all** sports and leagues. In reality:

- **Football** leagues differ: some use H2H-first (La Liga, Serie A), others use GD-first (Premier League, Bundesliga).
- **Basketball** sorts by win percentage (NBA) or wins (EuroLeague), not by points.
- **Ice Hockey** has two point systems: 2-0+OTL (NHL/KHL) vs 3-2-1-0 (SHL/DEL), plus special tiebreakers like regulation wins (NHL).
- **Volleyball** uses ratios (set ratio, point ratio), not differences.
- **Handball/Futsal** resemble football but with their own H2H ordering.

A single database must serve all of these correctly.

---

## Design Principles

1. **Sport-level defaults + per-league overrides** — each sport has a default tiebreaker sequence. Every new league/season inherits it automatically. The admin can override at the league level when needed.
2. **Year-range validity** — rules use `start_year` / `end_year` instead of per-season rows. A rule valid from 2019 with no end year means "from 2019 onwards", avoiding repetition.
3. **Ordered criteria list with gaps** — each rule has a `sort_order` using gaps (100, 200, 300…) so new criteria can be inserted between existing ones without renumbering.
4. **H2H as a first-class concept** — H2H mini-league calculation is shared logic, invoked when the criteria sequence reaches an H2H criterion.
5. **No schema explosion** — avoid creating columns for every niche stat. Use what already exists; add only the few missing counters.
6. **Backward compatible** — leagues without explicit config fall back to the current hardcoded behavior.
7. **Seed data from day one** — all new tables are populated with the known rules for every sport/league inspected so far, so the system works correctly immediately after migration.
8. **Admin UI from day one** — a "Standing Order" menu in the admin panel gives the user full CRUD over tiebreaker rules, point systems, and criteria, so future changes don't require code deployments.

---

## Part 1: Database Changes

### 1.1 New Table: `standing_order_rules`

Stores the **ordered** tiebreaker criteria. Supports three scopes:
- **Sport-level default** (`sport_id` set, `league_id` NULL) — inherited by all leagues of that sport.
- **League-level override** (`sport_id` set, `league_id` set) — overrides the sport default for a specific league.
- **Year-range validity** (`start_year` / `end_year`) — a rule applies from `start_year` until `end_year` (inclusive). `end_year = NULL` means "still in effect". Both years could be null, meaning the rules applys for every season of the sport_id and league_id (if league_id not null).

```sql
CREATE TABLE standing_order_rules (
    id              SERIAL PRIMARY KEY,
    sport_id        INTEGER NOT NULL REFERENCES sports(id),
    league_id       INTEGER REFERENCES leagues(id),         -- NULL = sport-level default
    start_year      INTEGER NOT NULL,                       -- e.g. 2000 (applies from this season onward)
    end_year        INTEGER,                                -- NULL = still in effect
    sort_order      INTEGER NOT NULL,                       -- gapped: 100, 200, 300, ...
    criterion       VARCHAR(40) NOT NULL,                   -- see Criterion Catalog below
    direction       VARCHAR(4) NOT NULL DEFAULT 'DESC',     -- 'DESC' or 'ASC'
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Unique: one criterion per position per sport+league+year-range
CREATE UNIQUE INDEX idx_standing_order_sport_league_year_order
    ON standing_order_rules (sport_id, COALESCE(league_id, 0), start_year, sort_order);
```

**Resolution logic** — when computing standings for a league/season:

1. Look for **league-level** rules where `league_id = X` AND `start_year <= season.startYear` AND (`end_year IS NULL` OR `end_year >= season.startYear`).
2. If none found, fall back to **sport-level** rules where `league_id IS NULL` AND `sport_id = Y` AND same year-range check.
3. If still none, use the **legacy hardcoded** `compareStandingRows()` behavior.

**Why year ranges instead of season_id:**
- A rule like "Premier League from 2019 onward" is one row, not duplicated for every season.
- When rules change (e.g., a new criterion is introduced in 2027), the admin sets `end_year = 2026` on the old rule and creates a new rule with `start_year = 2027`.

**Why gapped sort_order (100, 200, 300…):**
- Inserting a new criterion between positions 200 and 300 uses sort_order 250 — no renumbering needed.
- The admin UI provides a "re-sequence" action that normalizes gaps back to 100, 200, 300… when they get too tight.

**Why sport-level defaults:**
- Most European football leagues share the same base rules. Defining them once at the sport level avoids duplicating identical rows for every league.
- When a new league is created, it automatically inherits the sport's defaults. The admin only needs to add league-level overrides for leagues that differ (e.g., La Liga's H2H-first approach vs the sport default of GD-first).

### 1.2 New Columns on `standings` Table

Only two columns are genuinely missing for cross-sport tiebreakers:

```sql
ALTER TABLE standings ADD COLUMN regulation_wins     INTEGER DEFAULT 0;  -- NHL: wins in regulation time
ALTER TABLE standings ADD COLUMN regulation_ot_wins  INTEGER DEFAULT 0;  -- NHL: wins in regulation + OT (excl. shootout)
```

Everything else already exists:

| Need | Already Available |
|------|-------------------|
| Points | `points` |
| Wins, Draws, Losses | `wins`, `draws`, `losses` |
| Win PCT | Computed: `wins / played` |
| Goal/Point Difference | Computed: `goalsFor - goalsAgainst` |
| Goals/Points For | `goalsFor` |
| Goals/Points Against | `goalsAgainst` |
| Home/Away splits | `homeWins`, `awayWins`, `homeGoalsFor`, `awayGoalsFor`, etc. |
| OT Wins/Losses | `overtimeWins`, `overtimeLosses` |
| Penalty/SO Wins/Losses | `penaltyWins`, `penaltyLosses` |
| Sets Won/Lost | `setsWon`, `setsLost` |
| Games Played | `played` |

### 1.3 No Changes to `matches` or `matchDivisions`

H2H stats are computed at query time from `matches` + `matchDivisions` (for OT/penalty detection). No additional match-level storage is needed.

---

## Part 2: Criterion Catalog

Every criterion the engine can evaluate. Each has a well-defined computation from existing data.

### 2.1 Overall Stats Criteria

| Criterion ID | Description | Source | Direction |
|---|---|---|---|
| `POINTS` | Total standings points | `standings.points` | DESC |
| `WINS` | Total wins | `standings.wins` | DESC |
| `WIN_PCT` | Win percentage (W / GP) | `standings.wins / standings.played` | DESC |
| `GOAL_DIFFERENCE` | GF − GA | `standings.goalsFor - goalsAgainst` | DESC |
| `GOALS_FOR` | Goals/points scored | `standings.goalsFor` | DESC |
| `GOALS_AGAINST` | Goals/points conceded | `standings.goalsAgainst` | ASC |
| `AWAY_GOALS_FOR` | Away goals scored | `standings.awayGoalsFor` | DESC |
| `GAMES_PLAYED` | Fewer games played = better (mid-season) | `standings.played` | ASC |
| `REGULATION_WINS` | Wins in regulation time (hockey) | `standings.regulationWins` | DESC |
| `REGULATION_OT_WINS` | Regulation + OT wins, excl. shootout (hockey) | `standings.regulationOtWins` | DESC |
| `OT_WINS` | Overtime wins | `standings.overtimeWins` | DESC |
| `PENALTY_WINS` | Shootout/penalty wins | `standings.penaltyWins` | DESC |
| `SET_RATIO` | Sets won ÷ sets lost (volleyball) | `standings.setsWon / setsLost` | DESC |
| `POINT_RATIO` | Points scored ÷ points conceded (volleyball) | `standings.goalsFor / goalsAgainst` | DESC |

### 2.2 Head-to-Head Criteria

These are **computed on the fly** from the `matches` table, filtering to only matches between the tied teams.

| Criterion ID | Description | Direction |
|---|---|---|
| `H2H_POINTS` | Points earned in mutual matches | DESC |
| `H2H_WINS` | Wins in mutual matches | DESC |
| `H2H_WIN_PCT` | Win % in mutual matches (basketball) | DESC |
| `H2H_GOAL_DIFFERENCE` | GD in mutual matches | DESC |
| `H2H_GOALS_FOR` | Goals scored in mutual matches | DESC |
| `H2H_AWAY_GOALS` | Away goals in mutual matches | DESC |
| `H2H_POINT_DIFFERENCE` | Point differential in mutual matches (basketball) | DESC |

### 2.3 Structural Criteria (NBA-specific, future)

| Criterion ID | Description | Direction |
|---|---|---|
| `DIVISION_WIN_PCT` | Win % against own division | DESC |
| `CONFERENCE_WIN_PCT` | Win % against own conference | DESC |
| `NET_POINTS` | Total point differential (basketball) | DESC |

> These require group/division metadata on matches or standings and can be deferred.

### 2.4 Fallback Criteria

| Criterion ID | Description | Direction |
|---|---|---|
| `CLUB_NAME` | Alphabetical by club name | ASC |
| `CLUB_ID` | By club ID (current fallback) | ASC |

---

## Part 3: Configuration Examples

### Football

```
Premier League:   POINTS → GOAL_DIFFERENCE → GOALS_FOR → CLUB_NAME
La Liga:          POINTS → H2H_POINTS → H2H_GOAL_DIFFERENCE → GOAL_DIFFERENCE → GOALS_FOR
Serie A:          POINTS → H2H_POINTS → H2H_GOAL_DIFFERENCE → GOAL_DIFFERENCE → GOALS_FOR
Bundesliga:       POINTS → GOAL_DIFFERENCE → GOALS_FOR → H2H_POINTS → H2H_AWAY_GOALS → AWAY_GOALS_FOR
Ligue 1:          POINTS → GOAL_DIFFERENCE → GOALS_FOR → H2H_POINTS → H2H_GOAL_DIFFERENCE → H2H_GOALS_FOR → H2H_AWAY_GOALS → AWAY_GOALS_FOR
Primeira Liga:    POINTS → H2H_POINTS → H2H_GOAL_DIFFERENCE → GOAL_DIFFERENCE → WINS → GOALS_FOR
Eredivisie:       POINTS → GOAL_DIFFERENCE → GOALS_FOR → H2H_POINTS → H2H_GOAL_DIFFERENCE → H2H_GOALS_FOR → H2H_AWAY_GOALS
Brasileirão:      POINTS → WINS → GOAL_DIFFERENCE → GOALS_FOR → H2H_POINTS
```

### Basketball

```
NBA:              WIN_PCT → H2H_WIN_PCT → NET_POINTS → CLUB_NAME
EuroLeague:       WINS → H2H_WINS → H2H_POINT_DIFFERENCE → GOAL_DIFFERENCE → GOALS_FOR
ACB (Spain):      WINS → H2H_WINS → H2H_POINT_DIFFERENCE → GOAL_DIFFERENCE → GOALS_FOR
FIBA (generic):   WINS → H2H_WINS → H2H_POINT_DIFFERENCE → GOAL_DIFFERENCE → GOALS_FOR
```

### Ice Hockey

```
NHL:              POINTS → GAMES_PLAYED(ASC) → REGULATION_WINS → REGULATION_OT_WINS → WINS → H2H_POINTS → GOAL_DIFFERENCE → GOALS_FOR
KHL:              POINTS → REGULATION_WINS → OT_WINS → PENALTY_WINS → GOAL_DIFFERENCE → GOALS_FOR
SHL:              POINTS → GOAL_DIFFERENCE → GOALS_FOR
DEL:              POINTS → H2H_POINTS → H2H_GOAL_DIFFERENCE → H2H_GOALS_FOR
```

### Volleyball

```
SuperLega/Superliga: POINTS → WINS → SET_RATIO → POINT_RATIO → H2H_POINTS
```

### Handball

```
EHF/Bundesliga:   POINTS → H2H_POINTS → H2H_GOAL_DIFFERENCE → H2H_GOALS_FOR → GOAL_DIFFERENCE → GOALS_FOR
```

### Futsal

```
LNFS/Liga Nacional: POINTS → H2H_POINTS → H2H_GOAL_DIFFERENCE → H2H_GOALS_FOR → GOAL_DIFFERENCE → GOALS_FOR
```

---

## Part 4: Engine Architecture

### 4.1 Overview

```
┌─────────────────────────────────────────────────────────┐
│                    API Request                          │
│          GET /standings/:leagueId/:seasonId             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              StandingsService                            │
│   1. Fetch standing rows from DB                         │
│   2. Load tiebreaker config for this league (+season)    │
│   3. Delegate to TiebreakerEngine.sort(rows, config)     │
│   4. Return sorted rows with assigned positions          │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              TiebreakerEngine                            │
│                                                          │
│   sort(rows, criteria[]):                                │
│     1. Group rows by first criterion value               │
│     2. For groups of size > 1 (ties):                    │
│        a. If next criterion is H2H_*:                    │
│           → invoke H2HCalculator for tied club IDs       │
│           → sort using H2H stats                         │
│        b. If next criterion is overall stat:              │
│           → compare using standings column               │
│        c. If next criterion is a ratio:                   │
│           → compute ratio, compare                       │
│     3. Recurse until all ties resolved or criteria        │
│        exhausted                                         │
│     4. Assign positions (shared position for true ties)   │
└──────────────────────┬───────────────────────────────────┘
                       │ (when H2H criterion reached)
                       ▼
┌──────────────────────────────────────────────────────────┐
│              H2HCalculator                               │
│                                                          │
│   calculate(clubIds[], seasonId, maxRoundId/date):       │
│     1. Query matches WHERE homeClubId IN (clubIds)       │
│        AND awayClubId IN (clubIds)                       │
│        AND seasonId = X AND status = 'Finished'          │
│        AND (roundId <= maxRound OR date <= maxDate)      │
│     2. Build mini-standings from those matches            │
│     3. Return { clubId → { h2hPts, h2hGD, h2hGF,        │
│                             h2hAwayGoals, h2hWinPct } }  │
└──────────────────────────────────────────────────────────┘
```

### 4.2 TiebreakerEngine — Pseudocode

```typescript
class TiebreakerEngine {

  sort(
    rows: StandingRow[],
    criteria: TiebreakerCriterion[],
    seasonId: number,
    maxRoundId: number | null,
    maxDate: Date | null,
  ): StandingRow[] {

    if (rows.length <= 1 || criteria.length === 0) return rows;

    const [first, ...rest] = criteria;

    // Group rows by the first criterion value
    const groups = this.groupByValue(rows, first);

    const sorted: StandingRow[] = [];

    for (const group of groups) {
      if (group.length === 1) {
        sorted.push(group[0]);
      } else {
        // Still tied — recurse with remaining criteria
        sorted.push(...this.sort(group, rest, seasonId, maxRoundId, maxDate));
      }
    }

    return sorted;
  }

  private groupByValue(
    rows: StandingRow[],
    criterion: TiebreakerCriterion,
  ): StandingRow[][] {

    if (criterion.isH2H()) {
      // Compute H2H stats for these teams, then group
      const clubIds = rows.map(r => r.clubId);
      const h2h = this.h2hCalculator.calculate(clubIds, ...);
      return this.groupByStat(rows, row => h2h[row.clubId][criterion.h2hField], criterion.direction);
    }

    if (criterion.isRatio()) {
      return this.groupByStat(rows, row => this.computeRatio(row, criterion), criterion.direction);
    }

    // Overall stat
    return this.groupByStat(rows, row => this.getStatValue(row, criterion), criterion.direction);
  }

  private groupByStat(
    rows: StandingRow[],
    getValue: (row: StandingRow) => number,
    direction: 'ASC' | 'DESC',
  ): StandingRow[][] {
    // Sort rows by value, then split into groups of equal value
    const sorted = [...rows].sort((a, b) => {
      const diff = getValue(a) - getValue(b);
      return direction === 'DESC' ? -diff : diff;
    });

    const groups: StandingRow[][] = [];
    let current = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      if (getValue(sorted[i]) === getValue(current[0])) {
        current.push(sorted[i]);
      } else {
        groups.push(current);
        current = [sorted[i]];
      }
    }
    groups.push(current);
    return groups;
  }
}
```

### 4.3 H2HCalculator — Pseudocode

```typescript
class H2HCalculator {

  async calculate(
    clubIds: number[],
    seasonId: number,
    maxRoundId: number | null,
    maxDate: Date | null,
  ): Promise<Record<number, H2HStats>> {

    // 1. Fetch mutual matches
    const mutualMatches = await this.db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.seasonId, seasonId),
          eq(matches.status, 'Finished'),
          inArray(matches.homeClubId, clubIds),
          inArray(matches.awayClubId, clubIds),
          maxRoundId ? lte(matches.roundId, maxRoundId) : undefined,
          maxDate ? lte(matches.date, maxDate) : undefined,
        ),
      );

    // 2. Build mini-standings
    const stats: Record<number, H2HStats> = {};
    for (const clubId of clubIds) {
      stats[clubId] = { points: 0, wins: 0, played: 0, gf: 0, ga: 0, awayGf: 0 };
    }

    for (const match of mutualMatches) {
      const { homeClubId, awayClubId, homeScore, awayScore } = match;

      // Only count matches where BOTH teams are in the tied group
      if (!clubIds.includes(homeClubId) || !clubIds.includes(awayClubId)) continue;

      stats[homeClubId].played++;
      stats[awayClubId].played++;
      stats[homeClubId].gf += homeScore;
      stats[homeClubId].ga += awayScore;
      stats[awayClubId].gf += awayScore;
      stats[awayClubId].ga += homeScore;
      stats[awayClubId].awayGf += awayScore;

      if (homeScore > awayScore) {
        stats[homeClubId].wins++;
        stats[homeClubId].points += 3; // Use league's point system
        stats[awayClubId].points += 0;
      } else if (awayScore > homeScore) {
        stats[awayClubId].wins++;
        stats[awayClubId].points += 3;
        stats[homeClubId].points += 0;
      } else {
        stats[homeClubId].points += 1;
        stats[awayClubId].points += 1;
      }
    }

    return stats;
  }
}
```

**Important — H2H point system must match the league's point system:**

| Sport | H2H Win | H2H Draw | H2H Loss |
|---|---|---|---|
| Football/Handball/Futsal | 3 | 1 | 0 |
| Basketball | 1 (win counts) | — | 0 |
| Ice Hockey (2-0+OTL) | 2 | — + 1 OTL | 0 |
| Ice Hockey (3-2-1-0) | 3 or 2 | 1 or 0 | — |

The H2HCalculator must receive the sport/league context to apply the correct point allocation for mini-standings.

### 4.4 Criterion Resolver — Mapping IDs to Values

```typescript
function getStatValue(row: StandingRow, criterion: string): number {
  switch (criterion) {
    case 'POINTS':             return row.points;
    case 'WINS':               return row.wins;
    case 'WIN_PCT':            return row.played > 0 ? row.wins / row.played : 0;
    case 'GOAL_DIFFERENCE':    return row.goalsFor - row.goalsAgainst;
    case 'GOALS_FOR':          return row.goalsFor;
    case 'GOALS_AGAINST':      return row.goalsAgainst;
    case 'AWAY_GOALS_FOR':     return row.awayGoalsFor;
    case 'GAMES_PLAYED':       return row.played;
    case 'REGULATION_WINS':    return row.regulationWins;
    case 'REGULATION_OT_WINS': return row.regulationOtWins;
    case 'OT_WINS':            return row.overtimeWins;
    case 'PENALTY_WINS':       return row.penaltyWins;
    case 'SET_RATIO':          return row.setsLost > 0 ? row.setsWon / row.setsLost : row.setsWon;
    case 'POINT_RATIO':        return row.goalsAgainst > 0 ? row.goalsFor / row.goalsAgainst : row.goalsFor;
    case 'NET_POINTS':         return row.goalsFor - row.goalsAgainst;    // same as GD for basketball
    case 'CLUB_NAME':          return 0; // handled by string comparison
    case 'CLUB_ID':            return row.clubId;
    default:                   return 0;
  }
}
```

---

## Part 5: Service Layer Changes

### 5.1 New Files

| File | Purpose |
|---|---|
| `src/standings/tiebreaker.engine.ts` | `TiebreakerEngine` class with `sort()` method |
| `src/standings/h2h-calculator.ts` | `H2HCalculator` with `calculate()` method |
| `src/standing-order-rules/standing-order-rules.module.ts` | NestJS module for the new table |
| `src/standing-order-rules/standing-order-rules.service.ts` | CRUD + resolution logic for `standing_order_rules` |
| `src/standing-order-rules/standing-order-rules.controller.ts` | Admin API to manage rules |

### 5.2 Modified Files

| File | Change |
|---|---|
| `src/standings/standings.service.ts` | Replace `compareStandingRows()` with `TiebreakerEngine.sort()` call |
| `src/standings/standings-calculator.service.ts` | Populate `regulationWins` and `regulationOtWins` for hockey |
| `src/db/schema.ts` | Add `standingOrderRules` table + `regulationWins`/`regulationOtWins` columns |

### 5.3 Changes to `standings.service.ts`

**Before (current):**
```typescript
// Hard-coded sort for all sports
rows.sort((a, b) => this.compareStandingRows(a, b));
```

**After:**
```typescript
// Load tiebreaker config (league-level → sport-level fallback → legacy)
const criteria = await this.standingOrderRulesService.resolveForLeagueAndSeason(leagueId, seasonId);

if (criteria.length === 0) {
  // Fallback: legacy behavior
  rows.sort((a, b) => this.compareStandingRows(a, b));
} else {
  rows = await this.tiebreakerEngine.sort(rows, criteria, seasonId, roundId, matchDate);
}
```

This ensures **full backward compatibility**: leagues without configured rules keep working exactly as before.

### 5.4 Changes to `standings-calculator.service.ts`

In the ice hockey branch, after determining overtime/penalty outcomes:

```typescript
// NEW: Track regulation wins and regulation+OT wins
if (sport.includes('ice hockey')) {
  const hasOvertime = divisions.some(d =>
    d.divisionType === 'OVERTIME' || d.divisionNumber > 3 || d.id === -10
  );
  const hasShootout = divisions.some(d =>
    d.divisionType === 'PENALTIES' || d.id === -11
  );

  if (homeScore > awayScore) {
    if (!hasOvertime && !hasShootout) {
      homeStats.regulationWins++;      // Regulation win
      homeStats.regulationOtWins++;    // Also counts as ROW
    } else if (hasOvertime && !hasShootout) {
      homeStats.regulationOtWins++;    // OT win counts as ROW
    }
    // Shootout win: neither RW nor ROW
  }
  // Mirror for away team...
}
```

---

## Part 6: H2H Mini-League Edge Cases

### 6.1 Three-or-More-Team Ties

When 3+ teams are tied, H2H is computed as a **mini-league** among all tied teams:

1. Collect all matches where **both** home and away teams are in the tied set.
2. Compute mini-standings (H2H points, H2H GD, H2H GF, etc.).
3. If the mini-league separates one team, that team is placed.
4. The **remaining** still-tied teams **restart the entire tiebreaker sequence from the beginning** with only their mutual matches.

This "restart" behavior is critical and used by: La Liga, Serie A, EuroLeague, NBA.

```typescript
// After applying a criterion to a tied group:
for (const subGroup of resultGroups) {
  if (subGroup.length > 1) {
    // RESTART from criterion[0] for the subGroup, not continue from current
    const resolved = this.sort(subGroup, allCriteria, seasonId, roundId, date);
    sorted.push(...resolved);
  }
}
```

**Implementation note:** The `sort()` method must receive the **full** criteria array, not just the remaining criteria, so that the restart is possible. When an H2H criterion partially resolves a group, the remaining sub-groups should start fresh. A flag parameter `restartOnPartialH2H: boolean` (part of the league config) controls this behavior.

### 6.2 When H2H Is Not Yet Available

H2H should only be applied when **all mutual matches have been played**. Some leagues (La Liga, Serie A) explicitly state that H2H applies only after all H2H games are completed.

```typescript
// Check: have all possible H2H matches been played?
const expectedMatches = clubIds.length * (clubIds.length - 1); // For double round-robin
const actualMatches = mutualMatches.length;

if (actualMatches < expectedMatches) {
  // Skip H2H criterion; move to next criterion in list
  return this.sort(rows, remainingCriteria, ...);
}
```

**Note:** For single round-robin or irregular schedules, the expected count formula needs to adapt. This can be derived from the league's `numberOfRoundsMatches` or a dedicated config.

### 6.3 NBA's H2H Asymmetry

In the NBA, when tied teams have played an **uneven** number of H2H games, the league discards results to equalize. This is rare and complex. **Recommended approach:** defer this edge case; use simple H2H record for NBA initially.

---

## Part 7: Point System Awareness

The tiebreaker engine doesn't compute standings points (that's the calculator's job), but H2H mini-standings **must** use the same point allocation as the league's standings.

### 7.1 Point System Table

Add to the league config or derive from sport:

| `point_system` ID | RegW | OTW | SOW | Draw | OTL | SOL | RegL |
|---|---|---|---|---|---|---|---|
| `FOOTBALL_3_1_0` | 3 | — | — | 1 | — | — | 0 |
| `HOCKEY_2_0_OTL` | 2 | 2 | 2 | — | 1 | 1 | 0 |
| `HOCKEY_3_2_1_0` | 3 | 2 | 2 | — | 1 | 1 | 0 |
| `BASKETBALL_W_L` | 1 | 1 | — | — | 0 | — | 0 |
| `VOLLEYBALL_3_2_1_0` | 3 | — | — | — | — | — | 0 ∗ |
| `HANDBALL_2_1_0` | 2 | — | — | 1 | — | — | 0 |

\* Volleyball: 3-0/3-1 win = 3 pts, 3-2 win = 2 pts, 2-3 loss = 1 pt, 0-3/1-3 loss = 0 pts.

### 7.2 Storing the Point System

**Option A (recommended):** A new column on `leagues`:

```sql
ALTER TABLE leagues ADD COLUMN point_system VARCHAR(20) DEFAULT 'FOOTBALL_3_1_0';
```

**Option B:** Derive from `sports.name` (current approach in `standings-calculator.service.ts`). This works unless a sport has multiple point systems (ice hockey does — NHL vs SHL).

**Recommendation:** Option A. It also decouples the point system from the sport identity, which is cleaner for edge cases.

---

## Part 8: Migration Plan

### Phase 1 — Foundation + Seed Data + Admin UI

1. Add `standing_order_rules` table (migration).
2. Add `regulation_wins`, `regulation_ot_wins` columns to `standings` (migration).
3. Add `point_system` column to `leagues` (migration, default `'FOOTBALL_3_1_0'`).
4. **Seed all data** — populate `standing_order_rules` with sport-level defaults and league-level overrides for every known league (see Part 11: Seed Data).
5. Set `point_system` on each existing league.
6. Create `TiebreakerEngine` and `H2HCalculator` classes (unit-tested).
7. Integrate into `standings.service.ts` with fallback (empty config = legacy behavior).
8. Create backend CRUD endpoints for `standing_order_rules` and `point_systems`.
9. Create frontend admin pages under "Standing Order" menu (see Part 12: Frontend Admin Pages).
10. Write a script to backfill `regulation_wins` / `regulation_ot_wins` from existing `matchDivisions` data for ice hockey seasons.
11. Update `standings-calculator.service.ts` to populate `regulation_wins`/`regulation_ot_wins` on every match calculation for hockey.

**At this point**, all standings are correctly sorted per league for all sports. The admin can manage rules via the UI.

### Phase 2 — Advanced (optional)

12. NBA division/conference-aware criteria.
13. Visual indicators on frontend when a tiebreaker resolved a tie (tooltip: "Ranked by H2H").
14. Audit log for rule changes.

---

## Part 9: API Design

### 9.1 Standing Order Rules CRUD

```
GET    /api/standing-order-rules                                    → List all rules (filterable by sportId, leagueId)
GET    /api/standing-order-rules/:id                                → Get a single rule
GET    /api/standing-order-rules/resolve/:leagueId/:seasonStartYear → Resolve effective rules for a league+year
POST   /api/standing-order-rules                                    → Create a new rule
PUT    /api/standing-order-rules/:id                                → Update a rule
DELETE /api/standing-order-rules/:id                                → Delete a rule
POST   /api/standing-order-rules/resequence                         → Re-normalize sort_order gaps (100, 200, 300…)
```

### 9.2 Point Systems (read-only reference or future table)

```
GET    /api/point-systems                                           → List available point system IDs with descriptions
```

### 9.2 Standings Response (unchanged, but enriched)

The standings endpoint response remains the same shape. The only additions:

```json
{
  "standings": [
    {
      "position": 1,
      "clubId": 42,
      "points": 70,
      "wins": 22,
      "regulationWins": 18,
      "regulationOtWins": 20,
      ...
    }
  ],
  "tiebreakerConfig": {
    "criteria": ["POINTS", "GOAL_DIFFERENCE", "GOALS_FOR"],
    "pointSystem": "FOOTBALL_3_1_0"
  }
}
```

The `tiebreakerConfig` field is informational — the frontend can display it but does NOT need to sort.

---

## Part 10: Testing Strategy

### Unit Tests

| Test | What it validates |
|---|---|
| `tiebreaker.engine.spec.ts` | Sort with various criteria orders; 2-team and 3-team ties; H2H restart behavior |
| `h2h-calculator.spec.ts` | Correct H2H stats from mock match data; 3+ team mini-leagues; incomplete H2H |
| `criterion-resolver.spec.ts` | Each criterion ID maps to the right column/computation |

### Integration Tests

| Test | What it validates |
|---|---|
| Premier League scenario | GD-first tiebreaker resolves correctly |
| La Liga scenario | H2H-first with 3-team mini-league |
| NHL scenario | regulation_wins tiebreaker after equal points |
| NBA scenario | WIN_PCT primary sort, not points |
| Volleyball scenario | SET_RATIO ratio comparison |
| Fallback scenario | League with no config uses legacy sort |

### Regression Tests

| Test | What it validates |
|---|---|
| All existing standings endpoints | No change in output for unconfigured leagues |

---

## Summary

| Topic | Decision |
|---|---|
| Table name | `standing_order_rules` |
| Scope levels | Sport-level default (`league_id` NULL) → league-level override |
| Temporal validity | `start_year` / `end_year` (NULL = still in effect) |
| Sort order | Gapped (100, 200, 300…) for easy insertion |
| How to resolve H2H | Query `matches` table on-the-fly, build mini-standings |
| New standings columns | `regulation_wins`, `regulation_ot_wins` only |
| New league columns | `point_system` |
| Engine design | Recursive group-and-split with ordered criteria list |
| Backward compatibility | Empty config = legacy `compareStandingRows()` behavior |
| Seed data | All known rules populated from day one (see Part 11) |
| Admin UI | "Standing Order" menu with CRUD pages (see Part 12) |
| Rollout | Single phase: schema + seed + engine + admin UI together |

---

## Part 11: Seed Data

All rules below are seeded during migration. Sport-level defaults cover the common pattern; league-level overrides are added only where the league diverges.

### 11.1 Sport-Level Defaults

#### Football (sport_id = 3, start_year = 2000)

The most common European football pattern (GD-first family):

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `GOAL_DIFFERENCE` | DESC |
| 300 | `GOALS_FOR` | DESC |
| 400 | `CLUB_NAME` | ASC |

#### Basketball (sport_id = 1, start_year = 2000)

FIBA-style default (most domestic leagues):

| sort_order | criterion | direction |
|---|---|---|
| 100 | `WINS` | DESC |
| 200 | `H2H_WINS` | DESC |
| 300 | `H2H_POINT_DIFFERENCE` | DESC |
| 400 | `GOAL_DIFFERENCE` | DESC |
| 500 | `GOALS_FOR` | DESC |

#### Ice Hockey (sport_id = 2, start_year = 2000)

NHL-style default (2-0+OTL system):

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `GAMES_PLAYED` | ASC |
| 300 | `REGULATION_WINS` | DESC |
| 400 | `REGULATION_OT_WINS` | DESC |
| 500 | `WINS` | DESC |
| 600 | `H2H_POINTS` | DESC |
| 700 | `GOAL_DIFFERENCE` | DESC |
| 800 | `GOALS_FOR` | DESC |

#### Volleyball (sport_id = 6, start_year = 2000)

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `WINS` | DESC |
| 300 | `SET_RATIO` | DESC |
| 400 | `POINT_RATIO` | DESC |
| 500 | `H2H_POINTS` | DESC |

#### Handball (sport_id = 4, start_year = 2000)

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `H2H_POINTS` | DESC |
| 300 | `H2H_GOAL_DIFFERENCE` | DESC |
| 400 | `H2H_GOALS_FOR` | DESC |
| 500 | `GOAL_DIFFERENCE` | DESC |
| 600 | `GOALS_FOR` | DESC |

#### Futsal (sport_id = 5, start_year = 2000)

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `H2H_POINTS` | DESC |
| 300 | `H2H_GOAL_DIFFERENCE` | DESC |
| 400 | `H2H_GOALS_FOR` | DESC |
| 500 | `GOAL_DIFFERENCE` | DESC |
| 600 | `GOALS_FOR` | DESC |

### 11.2 League-Level Overrides (only where different from sport default)

#### Football Overrides

**La Liga** (start_year = 2000) — H2H-first:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `H2H_POINTS` | DESC |
| 300 | `H2H_GOAL_DIFFERENCE` | DESC |
| 400 | `GOAL_DIFFERENCE` | DESC |
| 500 | `GOALS_FOR` | DESC |

**Serie A** (start_year = 2000) — H2H-first:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `H2H_POINTS` | DESC |
| 300 | `H2H_GOAL_DIFFERENCE` | DESC |
| 400 | `GOAL_DIFFERENCE` | DESC |
| 500 | `GOALS_FOR` | DESC |

**Bundesliga** (start_year = 2000) — GD first, then H2H with away goals:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `GOAL_DIFFERENCE` | DESC |
| 300 | `GOALS_FOR` | DESC |
| 400 | `H2H_POINTS` | DESC |
| 500 | `H2H_AWAY_GOALS` | DESC |
| 600 | `AWAY_GOALS_FOR` | DESC |

**Ligue 1** (start_year = 2000) — GD first, then extended H2H:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `GOAL_DIFFERENCE` | DESC |
| 300 | `GOALS_FOR` | DESC |
| 400 | `H2H_POINTS` | DESC |
| 500 | `H2H_GOAL_DIFFERENCE` | DESC |
| 600 | `H2H_GOALS_FOR` | DESC |
| 700 | `H2H_AWAY_GOALS` | DESC |
| 800 | `AWAY_GOALS_FOR` | DESC |

**Primeira Liga** (start_year = 2000) — H2H-first with wins:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `H2H_POINTS` | DESC |
| 300 | `H2H_GOAL_DIFFERENCE` | DESC |
| 400 | `GOAL_DIFFERENCE` | DESC |
| 500 | `WINS` | DESC |
| 600 | `GOALS_FOR` | DESC |

**Eredivisie** (start_year = 2000) — GD first, then extended H2H:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `GOAL_DIFFERENCE` | DESC |
| 300 | `GOALS_FOR` | DESC |
| 400 | `H2H_POINTS` | DESC |
| 500 | `H2H_GOAL_DIFFERENCE` | DESC |
| 600 | `H2H_GOALS_FOR` | DESC |
| 700 | `H2H_AWAY_GOALS` | DESC |

**Brasileirão** (start_year = 2000) — Wins before GD:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `WINS` | DESC |
| 300 | `GOAL_DIFFERENCE` | DESC |
| 400 | `GOALS_FOR` | DESC |
| 500 | `H2H_POINTS` | DESC |

#### Basketball Overrides

**NBA** (start_year = 2000) — Win PCT, no points:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `WIN_PCT` | DESC |
| 200 | `H2H_WIN_PCT` | DESC |
| 300 | `NET_POINTS` | DESC |
| 400 | `CLUB_NAME` | ASC |

#### Ice Hockey Overrides

**KHL** (start_year = 2000) — Separates OT and SO wins:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `REGULATION_WINS` | DESC |
| 300 | `OT_WINS` | DESC |
| 400 | `PENALTY_WINS` | DESC |
| 500 | `GOAL_DIFFERENCE` | DESC |
| 600 | `GOALS_FOR` | DESC |

**SHL** (start_year = 2000) — 3-2-1-0 system, simple GD:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `GOAL_DIFFERENCE` | DESC |
| 300 | `GOALS_FOR` | DESC |

**DEL** (start_year = 2000) — 3-2-1-0 system, H2H tiebreaker:

| sort_order | criterion | direction |
|---|---|---|
| 100 | `POINTS` | DESC |
| 200 | `H2H_POINTS` | DESC |
| 300 | `H2H_GOAL_DIFFERENCE` | DESC |
| 400 | `H2H_GOALS_FOR` | DESC |

### 11.3 Point System Seed (on `leagues` table)

| League | `point_system` |
|---|---|
| Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Primeira Liga, Eredivisie, Brasileirão | `FOOTBALL_3_1_0` |
| All futsal leagues | `FOOTBALL_3_1_0` |
| NBA, EuroLeague, ACB, all FIBA basketball | `BASKETBALL_W_L` |
| NHL, KHL | `HOCKEY_2_0_OTL` |
| SHL, DEL | `HOCKEY_3_2_1_0` |
| All volleyball leagues | `VOLLEYBALL_3_2_1_0` |
| All handball leagues | `HANDBALL_2_1_0` |

---

## Part 12: Frontend Admin Pages

### 12.1 New Menu: "Standing Order"

Add a new top-level menu item in the admin sidebar with three sub-pages:

```
Standing Order (icon: ListOrdered)
├── Rules                → /admin/standing-order/rules
├── Point Systems        → /admin/standing-order/point-systems
└── Criteria Reference   → /admin/standing-order/criteria
```

### 12.2 Rules Page (`/admin/standing-order/rules`)

**Purpose:** Full CRUD for `standing_order_rules` table.

**Layout:**
- **Filters bar** (top): Sport dropdown, League dropdown (optional — empty = show sport defaults), Year input.
- **Data table** columns:

| Column | Sortable | Notes |
|---|---|---|
| Sport | ✓ | From FK → sports.name |
| League | ✓ | From FK → leagues.originalName (or "— Sport Default —" when NULL) |
| Start Year | ✓ | |
| End Year | ✓ | NULL displayed as "Present" |
| Sort Order | ✓ | Numeric, gapped |
| Criterion | ✓ | From criterion catalog |
| Direction | | DESC / ASC |
| Actions | | Edit, Delete |

**Add/Edit modal fields:**
- Sport (required dropdown)
- League (optional dropdown — filtered by selected sport; empty = sport-level default)
- Start Year (required number input)
- End Year (optional number input — empty = still in effect)
- Sort Order (required number — suggested next gap: max existing + 100)
- Criterion (required dropdown — populated from the Criterion Catalog, Part 2)
- Direction (required dropdown — DESC / ASC, default DESC)

**Special actions:**
- **"Re-sequence"** button — calls `POST /api/standing-order-rules/resequence` to normalize gaps back to 100, 200, 300… for the currently filtered sport+league+year combination.
- **"Copy from sport default"** button — when viewing a league, copies the sport-default rules as league-specific rules so the admin can then edit individual rows.

### 12.3 Point Systems Page (`/admin/standing-order/point-systems`)

**Purpose:** View and assign the `point_system` column on the `leagues` table.

**Layout:**
- **Data table** columns:

| Column | Sortable | Notes |
|---|---|---|
| League | ✓ | leagues.originalName |
| Sport | ✓ | From FK → sports.name |
| Current Point System | ✓ | leagues.point_system |
| Actions | | Edit |

**Edit modal fields:**
- Point System (dropdown): `FOOTBALL_3_1_0`, `HOCKEY_2_0_OTL`, `HOCKEY_3_2_1_0`, `BASKETBALL_W_L`, `VOLLEYBALL_3_2_1_0`, `HANDBALL_2_1_0`

This page uses the existing leagues CRUD endpoint with a `PATCH` to update only the `point_system` field.

### 12.4 Criteria Reference Page (`/admin/standing-order/criteria`)

**Purpose:** Read-only reference page showing all available criterion IDs, their descriptions, data source, and default direction.

**Layout:**
- Static data table (no CRUD needed — criteria are code-defined):

| Criterion ID | Description | Source | Default Direction |
|---|---|---|---|
| `POINTS` | Total standings points | standings.points | DESC |
| `WINS` | Total wins | standings.wins | DESC |
| … | … | … | … |

This page helps the admin understand what each criterion means when configuring rules.

### 12.5 Sidebar Change

In `components/admin/admin-sidebar.tsx`, add to `menuItems[]`:

```typescript
{
  label: 'Standing Order',
  icon: <ListOrdered size={18} />,
  href: '',
  children: [
    { label: 'Rules',              icon: <SlidersHorizontal size={18} />, href: '/admin/standing-order/rules' },
    { label: 'Point Systems',      icon: <Calculator size={18} />,       href: '/admin/standing-order/point-systems' },
    { label: 'Criteria Reference', icon: <BookOpen size={18} />,         href: '/admin/standing-order/criteria' },
  ],
},
```
