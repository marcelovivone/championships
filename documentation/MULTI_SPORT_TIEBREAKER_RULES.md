# Multi-Sport Tiebreaker Rules Reference

## Overview

This document catalogs tiebreaker rules for **all non-football sports** supported (or planned) in the Championships application. For football tiebreakers, see `FOOTBALL_TIEBREAKER_RULES.md`.

**Sports covered:**
1. Basketball (NBA, EuroLeague, ACB)
2. Ice Hockey (NHL, KHL, SHL, DEL)
3. Volleyball (planned)
4. Handball (planned)
5. Futsal (planned)

---

# BASKETBALL

Basketball standings are primarily sorted by **win percentage (PCT)** or **win-loss record**, not by points. Games behind (GB) is a display metric, not a sorting criterion.

---

## 1. NBA (United States / Canada)

**Primary sort:** Win-Loss Percentage (PCT) within each conference.

| # | Criterion |
|---|-----------|
| 1 | Win-loss percentage (PCT) |
| 2 | H2H record (season series winner) |
| 3 | Division leader wins tie from teams not leading a division |
| 4 | Division win percentage (if both are in the same division) |
| 5 | Conference win percentage |
| 6 | Win percentage vs. playoff-eligible teams in own conference |
| 7 | Win percentage vs. playoff-eligible teams in opposite conference |
| 8 | Net points (point differential) |

**Notes:**
- Tiebreakers only determine seeding; all teams with enough wins make the playoffs/play-in based on record.
- Division winners are guaranteed a top-4 seed only by virtue of their record, not by rule (as of 2015-16 onwards).
- The play-in tournament (seeds 7-10) uses the same tiebreaker system.
- When 3+ teams are tied, if the H2H tiebreaker resolves one team but not the rest, the remaining teams restart at step 1 between themselves.
- NBA Cup group-stage games count toward regular season standings.

**What we can compute:** PCT, H2H record, division record, conference record, net points. Division and conference tagging requires proper group/league metadata.

---

## 2. EuroLeague (Europe)

**Primary sort:** Wins (or Win-Loss record, since all teams play the same number of games; equivalent to win%).

| # | Criterion |
|---|-----------|
| 1 | Number of wins (W) |
| 2 | H2H record (mini-league among tied teams) |
| 3 | H2H point differential (among tied teams) |
| 4 | Overall point differential (PF − PA) |
| 5 | Points scored (PF) |

**Notes:**
- 18 teams play 34 games each (double round-robin).
- Top 6 advance to playoffs; 7th-10th go to play-in; 11th-18th eliminated.
- H2H is only applied among tied teams (not overall H2H).
- If 3+ teams are tied: form a mini-league among only those teams. If the mini-league breaks one team free but not the rest, restart fresh mini-league among the still-tied teams.

**What we can compute:** Wins, PF, PA, point differential, H2H.

---

## 3. Liga ACB (Spain)

**Primary sort:** Win-loss record / winning percentage.

| # | Criterion |
|---|-----------|
| 1 | Number of wins |
| 2 | H2H record (basket-average among tied teams if 3+) |
| 3 | H2H point differential |
| 4 | Overall point differential |
| 5 | Points scored (overall) |
| 6 | Draw of lots |

**Notes:**
- 18-team league with 34-game regular season.
- Top 8 advance to playoffs (best-of-5 quarterfinals, best-of-5 semis, best-of-5 final).
- "Basket-average" = points scored ÷ points against in H2H games (used as ratio, not difference).
- FIBA-affiliated leagues (ACB included) generally follow the FIBA pattern: W → H2H → PD → PF.

---

## General Basketball Pattern (FIBA-based leagues)

Most FIBA-affiliated domestic leagues (NBB Brazil, LNB France, BSL Turkey, Lega Serie A Italy, etc.) follow a very similar pattern:

| # | Criterion |
|---|-----------|
| 1 | Number of wins (or points: 2 for W, 1 for L in some leagues) |
| 2 | H2H record among tied teams |
| 3 | H2H point differential (or basket-average ratio) |
| 4 | Overall point differential |
| 5 | Overall points scored |
| 6 | Draw of lots / coin flip |

**Key differences from NBA:**
- No conference/division structure in most leagues.
- Some leagues award standings points (2 for win, 1 for loss, 0 for forfeit) instead of using PCT.
- H2H is almost universally the first tiebreaker (unlike NBA where it's also first, but with conference/division modifiers).

---

# ICE HOCKEY

Ice hockey standings use a **points system**: 2 pts for any win (regulation, overtime, or shootout), 1 pt for an OT/SO loss, 0 pts for a regulation loss. Tiebreakers vary significantly by league.

---

## 4. NHL (United States / Canada)

**Primary sort:** Points (P = 2×W + OTL).

| # | Criterion |
|---|-----------|
| 1 | Points (P) |
| 2 | Fewer games played (GP) — *during regular season only, when teams have played different number of games* |
| 3 | Regulation wins (RW) — wins decided in regulation time only |
| 4 | Regulation + overtime wins (ROW) — excludes shootout wins |
| 5 | Total wins (W) — includes shootout wins |
| 6 | H2H points (in head-to-head matchups); if uneven # of games, the first game at the home of the team with extra home game is discarded |
| 7 | Goal differential (GD) |
| 8 | Goals scored (GF) |

**Notes:**
- Top 3 from each division + 2 wild cards per conference make playoffs (16 teams total from 32).
- Division winners are guaranteed top-3 seed.
- The "regulation wins" tiebreaker (step 3) was introduced to reward teams that win without needing overtime/shootout.
- ROW at step 4 further separates teams by including OT wins but still excluding shootout wins.
- Shootout wins only matter at step 5.
- The "fewer GP" criterion is only relevant during the season when teams may have played different numbers of games.

**What we can compute:** Points, GP, W, RW, ROW, OTL, GF, GA, GD, H2H. We need `regulation_wins` and `regulation_overtime_wins` as distinct counters (not currently tracked — would need match result + whether OT/SO occurred).

---

## 5. KHL (Russia / international)

**Primary sort:** Points (P = 2×W + OTL).

| # | Criterion |
|---|-----------|
| 1 | Points (P) |
| 2 | Regulation wins (W in regulation time) |
| 3 | Overtime wins (W in OT) |
| 4 | Shootout wins (W in shootouts) |
| 5 | Goal differential (GD) |
| 6 | Goals scored (GF) |
| 7 | Drawing of lots |

**Notes:**
- 23 teams, 68 games each. Two conferences (Western/Eastern), four divisions.
- Top 8 per conference qualify for Gagarin Cup playoffs.
- Cross-conference re-seeding after conference quarterfinals.
- Point system identical to NHL: 2 pts for win (any type), 1 pt for OT/SO loss, 0 for reg loss.
- Tiebreaker order is slightly different from NHL: KHL explicitly separates regulation, OT, and SO wins as individual tiebreakers (steps 2-4).

---

## 6. SHL (Sweden)

**Primary sort:** Points. Uses a **3-2-1-0 system**:
- 3 pts for regulation win
- 2 pts for OT/SO win
- 1 pt for OT/SO loss
- 0 pts for regulation loss

| # | Criterion |
|---|-----------|
| 1 | Points (P) |
| 2 | Goal differential (GD) |
| 3 | Goals scored (GF) |

**Notes:**
- 14 teams, 52 games each (4× against each opponent).
- Top 6 → quarterfinals; 7th-10th → play-in round (best-of-3); 13th-14th → relegation play-out (best-of-7).
- The 3-2-1-0 points system already rewards regulation wins more heavily, reducing the need for complex tiebreakers.
- Playoff pairings are re-seeded after each round.

**What we can compute:** Points (need to differentiate regulation vs OT wins for correct point allocation), GD, GF.

---

## 7. DEL (Germany)

**Primary sort:** Points. Uses the **3-2-1-0 system** (same as SHL).

| # | Criterion |
|---|-----------|
| 1 | Points (P) |
| 2 | H2H points (in head-to-head matchups) |
| 3 | H2H goal differential |
| 4 | H2H goals scored |

**Notes:**
- 14 teams, 52 games each.
- Top 6 → playoffs; 7th-10th → pre-playoffs (best-of-3); last place → relegated to DEL2.
- Same 3-2-1-0 points system as SHL.
- Uses H2H as tiebreaker (unlike SHL which goes straight to GD).

---

## General Ice Hockey Tiebreaker Summary

| League | Pts System | TB1 | TB2 | TB3 | TB4 |
|--------|-----------|-----|-----|-----|-----|
| NHL | 2-0 (+1 OTL) | Fewer GP → RW | ROW | W | H2H points |
| KHL | 2-0 (+1 OTL) | Reg W | OT W | SO W | GD |
| SHL | 3-2-1-0 | GD | GF | — | — |
| DEL | 3-2-1-0 | H2H pts | H2H GD | H2H GF | — |

---

# VOLLEYBALL (Planned)

Volleyball standings typically use a **points system** based on set results:
- 3-0 or 3-1 win: 3 pts for winner, 0 pts for loser
- 3-2 win: 2 pts for winner, 1 pt for loser

---

## General Volleyball Tiebreaker Pattern (FIVB / CEV)

| # | Criterion |
|---|-----------|
| 1 | Points (P) |
| 2 | Number of matches won |
| 3 | Set ratio (sets won ÷ sets lost) |
| 4 | Point ratio (points scored ÷ points conceded, across all sets) |
| 5 | H2H result (if only 2 teams tied) |

**Notes:**
- Most domestic leagues (Italian SuperLega, Brazilian Superliga, French Ligue A, Turkish Efeler Ligi, Polish PlusLiga) follow this pattern.
- The set ratio and point ratio are **ratios** (division), not differences.
- If 3+ teams tied, H2H becomes a mini-league.

**Data requirements:** We would need set scores per match (e.g., 3-1) and individual set point scores (e.g., 25-21, 25-18, 23-25, 25-20) to calculate set ratio and point ratio.

---

# HANDBALL (Planned)

Handball uses a **football-like points system**: 2 pts for win, 1 pt for draw, 0 pts for loss.

---

## General Handball Tiebreaker Pattern (EHF / IHF)

| # | Criterion |
|---|-----------|
| 1 | Points (P) |
| 2 | H2H points (among tied teams) |
| 3 | H2H goal differential |
| 4 | H2H goals scored (away goals may count more in some leagues) |
| 5 | Overall goal differential |
| 6 | Overall goals scored |
| 7 | Draw of lots / fair play |

**Notes:**
- Draws are common in handball (unlike basketball).
- Most European handball leagues (German Bundesliga, French Starligue, Spanish Liga Asobal, EHF Champions League) follow this H2H-first pattern.
- Some leagues (e.g., German Bundesliga) go straight to GD without H2H.
- We would need standard match scores; no special sub-scores required.

---

# FUTSAL (Planned)

Futsal uses the same points system as football: 3 pts for win, 1 pt for draw, 0 pts for loss.

---

## General Futsal Tiebreaker Pattern (FIFA / UEFA)

| # | Criterion |
|---|-----------|
| 1 | Points (P) |
| 2 | H2H points (among tied teams) |
| 3 | H2H goal difference |
| 4 | H2H goals scored |
| 5 | Overall goal difference |
| 6 | Overall goals scored |
| 7 | Fair play (fewest cards) |
| 8 | Draw of lots |

**Notes:**
- Essentially identical to football tiebreakers. Most domestic futsal leagues follow the football pattern of their country.
- Spanish LNFS, Brazilian Liga Nacional, Portuguese Liga Placard, Italian Serie A Futsal — all follow the above.

---

# Implementation Reference

## Sport-Specific Considerations

| Sport | Primary Sort | Points System | Needs H2H | Needs Sub-Scores | Special Counters |
|-------|------------|--------------|-----------|-------------------|-----------------|
| Basketball (NBA) | PCT (W/GP) | None (W-L record) | Yes | No | OT W/L |
| Basketball (FIBA) | Wins or Pts | 2W-1L-0Forfeit | Yes | No | OT W/L |
| Ice Hockey (NHL) | Points | 2W + 1OTL | Yes | No | RW, ROW, SOW |
| Ice Hockey (3-2-1) | Points | 3RW-2OTW-1OTL | Maybe | No | Reg W, OT W |
| Volleyball | Points | 3(3:0/3:1W)-2(3:2W)-1(2:3L) | Yes | Yes (set/point ratios) | Sets W/L, set points |
| Handball | Points | 2W-1D-0L | Yes | No | — |
| Futsal | Points | 3W-1D-0L | Yes | No | — |

## Key Architectural Notes

1. **Tiebreaker configuration should be per-league**, not per-sport. Even within the same sport, leagues differ.
2. **H2H mini-league logic** is needed across almost all sports. The existing football H2H implementation can be extended.
3. **Basketball doesn't use "points"** in the football sense — sort by PCT or wins. The standings calculator already has a basketball branch.
4. **Ice hockey has two points systems** in use:
   - NHL/KHL: 2-0 with +1 for OT losses
   - SHL/DEL/many European: 3-2-1-0 (rewards regulation wins more)
5. **Volleyball requires set-level data** for tiebreakers — this is a data model consideration for future implementation.
6. **Futsal tiebreakers are identical to football** — can reuse the football tiebreaker engine.

## Suggested `league_tiebreaker_rules` Examples

```typescript
// NBA
{ sort_by: 'PCT', tiebreakers: ['H2H', 'DIVISION_PCT', 'CONFERENCE_PCT', 'NET_POINTS'] }

// EuroLeague
{ sort_by: 'WINS', tiebreakers: ['H2H_MINI_LEAGUE', 'H2H_POINT_DIFF', 'POINT_DIFF', 'POINTS_SCORED'] }

// NHL
{ sort_by: 'POINTS', tiebreakers: ['FEWER_GP', 'REG_WINS', 'REG_OT_WINS', 'TOTAL_WINS', 'H2H_POINTS', 'GOAL_DIFF', 'GOALS_SCORED'] }

// SHL
{ sort_by: 'POINTS', tiebreakers: ['GOAL_DIFF', 'GOALS_SCORED'] }

// DEL
{ sort_by: 'POINTS', tiebreakers: ['H2H_POINTS', 'H2H_GOAL_DIFF', 'H2H_GOALS_SCORED'] }
```
