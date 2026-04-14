# Football League Tiebreaker Rules Reference

## Overview

This document catalogs the tiebreaker criteria for the 8 major football leagues supported by the Championships application. Each league applies its own ordered sequence of criteria when two or more teams are tied on points.

**Legend:**
- **H2H** = Head-to-Head (only matches between the tied teams)
- **GD** = Goal Difference
- **GF** = Goals For (scored)
- **GA** = Goals Against (conceded)

---

## 1. Premier League (England)

| # | Criterion |
|---|-----------|
| 1 | Points |
| 2 | Goal difference (overall) |
| 3 | Goals scored (overall) |
| 4 | *If still tied AND deciding champion, relegation, or UEFA qualification:* |
| 4.1 | H2H points |
| 4.2 | H2H away goals |
| 4.3 | Play-off |

**Note:** H2H is only used for title, relegation, or European qualification decisions. For mid-table ties, the ranking after step 3 is final (alphabetical or club ID as fallback).

---

## 2. La Liga (Spain)

| # | Criterion |
|---|-----------|
| 1 | Points |
| 2 | H2H points (mini-league if 3+ teams) |
| 3 | H2H goal difference |
| 4 | Goal difference (overall) |
| 5 | Goals scored (overall) |
| 6 | Fair-play points (fewest cards) |

**Note:** H2H criteria (steps 2-3) only apply once all matches between the tied teams have been played in the season.

---

## 3. Serie A (Italy)

| # | Criterion |
|---|-----------|
| 1 | Points |
| 2 | H2H points (mini-league if 3+ teams) |
| 3 | H2H goal difference |
| 4 | Goal difference (overall) |
| 5 | Goals scored (overall) |
| 6 | Draw / Play-off (for title or third relegation spot) |

**Note:** H2H criteria apply only after all mutual matches have been played. If deciding the champion or the third relegated team, a play-off may be used.

---

## 4. Bundesliga (Germany)

| # | Criterion |
|---|-----------|
| 1 | Points |
| 2 | Goal difference (overall) |
| 3 | Goals scored (overall) |
| 4 | H2H points |
| 5 | H2H away goals |
| 6 | Away goals scored (overall) |
| 7 | Play-off |

**Note:** H2H criteria (steps 4-6) only apply after all H2H matches have been played in the season.

---

## 5. Ligue 1 (France)

| # | Criterion |
|---|-----------|
| 1 | Points |
| 2 | Goal difference (overall) |
| 3 | Goals scored (overall) |
| 4 | H2H points |
| 5 | H2H goal difference |
| 6 | H2H goals scored |
| 7 | H2H away goals scored |
| 8 | Away goals scored (overall) |
| 9 | Fair-play points |

**Note:** H2H (steps 4-7) used only after all matches between tied teams have been played.

---

## 6. Primeira Liga (Portugal)

| # | Criterion |
|---|-----------|
| 1 | Points |
| 2 | H2H points |
| 3 | H2H goal difference |
| 4 | Goal difference (overall) |
| 5 | Matches won (overall) |
| 6 | Goals scored (overall) |
| 7 | Play-off |

---

## 7. Eredivisie (Netherlands)

| # | Criterion |
|---|-----------|
| 1 | Points |
| 2 | Goal difference (overall) |
| 3 | Goals scored (overall) |
| 4 | H2H points |
| 5 | H2H goal difference |
| 6 | H2H goals scored |
| 7 | H2H away goals scored |
| 8 | Play-off or draw |

---

## 8. Campeonato Brasileiro Série A (Brazil)

| # | Criterion |
|---|-----------|
| 1 | Points |
| 2 | Wins |
| 3 | Goal difference (overall) |
| 4 | Goals scored (overall) |
| 5 | H2H points (only 2-team ties) |
| 6 | Fewest red cards |
| 7 | Fewest yellow cards |
| 8 | Drawing of lots |

**Note:** H2H (step 5) applies only for 2-team ties, not for 3+ teams. Card-based criteria (steps 6-7) are not currently tracked in the system.

---

## Grouped Comparison: Tiebreaker Patterns

Looking across all 8 leagues, there are two main families:

### Family A: "Overall first, then H2H" (GD → GF → H2H)
- **Premier League**: Pts → GD → GF → (H2H only for decisive positions)
- **Bundesliga**: Pts → GD → GF → H2H pts → H2H away goals → Away GF
- **Ligue 1**: Pts → GD → GF → H2H pts → H2H GD → H2H GF → H2H away GF → Away GF
- **Eredivisie**: Pts → GD → GF → H2H pts → H2H GD → H2H GF → H2H away GF
- **Brasileirão**: Pts → Wins → GD → GF → H2H pts

### Family B: "H2H first, then overall" (H2H → GD → GF)
- **La Liga**: Pts → H2H pts → H2H GD → GD → GF
- **Serie A**: Pts → H2H pts → H2H GD → GD → GF
- **Primeira Liga**: Pts → H2H pts → H2H GD → GD → Wins → GF

---

## Implementation Design

### Tiebreaker Criteria Enum

The following criteria identifiers should be used in the system:

| Criterion ID | Description |
|---|---|
| `POINTS` | Total points |
| `WINS` | Total wins |
| `GOAL_DIFFERENCE` | Goals For − Goals Against (overall) |
| `GOALS_FOR` | Total goals scored (overall) |
| `AWAY_GOALS_FOR` | Total away goals scored (overall) |
| `H2H_POINTS` | H2H points between tied teams |
| `H2H_GOAL_DIFFERENCE` | H2H goal difference |
| `H2H_GOALS_FOR` | H2H goals scored |
| `H2H_AWAY_GOALS` | H2H away goals scored |
| `FAIR_PLAY` | Fair-play discipline (cards) — future |
| `CLUB_ID` | Fallback: club ID ascending |

### League → Ordered Criteria Mapping

```typescript
// Tiebreaker priority per league (after POINTS which is always #1)
const FOOTBALL_TIEBREAKERS: Record<string, string[]> = {
  // Family A: Overall stats first
  'Premier League':         ['GOAL_DIFFERENCE', 'GOALS_FOR'],
  'Bundesliga':             ['GOAL_DIFFERENCE', 'GOALS_FOR', 'H2H_POINTS', 'H2H_AWAY_GOALS', 'AWAY_GOALS_FOR'],
  'Ligue 1':                ['GOAL_DIFFERENCE', 'GOALS_FOR', 'H2H_POINTS', 'H2H_GOAL_DIFFERENCE', 'H2H_GOALS_FOR', 'H2H_AWAY_GOALS', 'AWAY_GOALS_FOR'],
  'Eredivisie':             ['GOAL_DIFFERENCE', 'GOALS_FOR', 'H2H_POINTS', 'H2H_GOAL_DIFFERENCE', 'H2H_GOALS_FOR', 'H2H_AWAY_GOALS'],
  'Campeonato Brasileiro':  ['WINS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'H2H_POINTS'],

  // Family B: H2H first
  'La Liga':                ['H2H_POINTS', 'H2H_GOAL_DIFFERENCE', 'GOAL_DIFFERENCE', 'GOALS_FOR'],
  'Serie A':                ['H2H_POINTS', 'H2H_GOAL_DIFFERENCE', 'GOAL_DIFFERENCE', 'GOALS_FOR'],
  'Primeira Liga':          ['H2H_POINTS', 'H2H_GOAL_DIFFERENCE', 'GOAL_DIFFERENCE', 'WINS', 'GOALS_FOR'],
};
```

### Required Schema Changes

1. **`leagues` table**: Add `tiebreaker_rules` column (JSON array of criterion IDs), or store in a separate `league_tiebreaker_rules` table.
2. **No new columns needed on `standings`**: All stats (GD, GF, home/away splits) already exist.

### Head-to-Head Calculation

H2H stats are computed at query time from the `matches` table:
- Filter matches where both `homeClubId` and `awayClubId` are in the set of tied clubs
- For the given season and up to the current round
- Compute a mini-standings table: H2H points, H2H GD, H2H GF, H2H away goals

### Backend Changes Required

1. **`standings.service.ts`**: Modify `compareStandingRows()` to accept league tiebreaker config and apply criteria in order.
2. **New method**: `calculateH2H(clubIds: number[], seasonId: number, roundId: number)` — queries matches between tied teams and returns H2H stats.
3. **Sort becomes two-pass**: First sort by points, then group tied teams and apply tiebreaker sequence.

### Frontend Changes

- **Option A** (recommended): Backend returns standings pre-sorted with `position` field → frontend just renders in order.
- **Option B**: Backend returns tiebreaker config, frontend does sorting (complex, not recommended for H2H).

---

## Data Availability

| Criterion | Available Now? | Source |
|---|---|---|
| Points | ✅ | `standings.points` |
| Wins | ✅ | `standings.wins` |
| Goal Difference | ✅ | `standings.goalsFor - standings.goalsAgainst` |
| Goals For | ✅ | `standings.goalsFor` |
| Away Goals For | ✅ | `standings.awayGoalsFor` |
| H2H Points | ✅ (computed) | Query `matches` table |
| H2H Goal Difference | ✅ (computed) | Query `matches` table |
| H2H Goals For | ✅ (computed) | Query `matches` table |
| H2H Away Goals | ✅ (computed) | Query `matches` table |
| Fair-play (cards) | ❌ | Not tracked yet |
| Red/Yellow cards | ❌ | Not tracked yet |
