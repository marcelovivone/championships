-- Custom SQL migration file, put your code below! --
-- Migration: Seed standing_order_rules with sport-level defaults and league-level overrides
-- Date: 2026-04-11
-- This populates the tiebreaker rules for all known sports and leagues.
-- Sport IDs: Basketball=34, Ice Hockey=35, Football=36, Handball=37, Futsal=38, Volleyball=39

-- ============================================================================
-- SPORT-LEVEL DEFAULTS (league_id IS NULL)
-- ============================================================================

-- Football (sport_id = 36) — GD-first family (most European leagues)
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction) VALUES
  (36, NULL, NULL, NULL, 100, 'POINTS', 'DESC'),
  (36, NULL, NULL, NULL, 200, 'GOAL_DIFFERENCE', 'DESC'),
  (36, NULL, NULL, NULL, 300, 'GOALS_FOR', 'DESC'),
  (36, NULL, NULL, NULL, 400, 'CLUB_ID', 'ASC')
ON CONFLICT DO NOTHING;

-- Basketball (sport_id = 34) — FIBA-style default
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction) VALUES
  (34, NULL, NULL, NULL, 100, 'WINS', 'DESC'),
  (34, NULL, NULL, NULL, 200, 'H2H_WINS', 'DESC'),
  (34, NULL, NULL, NULL, 300, 'H2H_POINT_DIFFERENCE', 'DESC'),
  (34, NULL, NULL, NULL, 400, 'GOAL_DIFFERENCE', 'DESC'),
  (34, NULL, NULL, NULL, 500, 'GOALS_FOR', 'DESC')
ON CONFLICT DO NOTHING;

-- Ice Hockey (sport_id = 35) — NHL-style default
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction) VALUES
  (35, NULL, NULL, NULL, 100, 'POINTS', 'DESC'),
  (35, NULL, NULL, NULL, 200, 'GAMES_PLAYED', 'ASC'),
  (35, NULL, NULL, NULL, 300, 'REGULATION_WINS', 'DESC'),
  (35, NULL, NULL, NULL, 400, 'REGULATION_OT_WINS', 'DESC'),
  (35, NULL, NULL, NULL, 500, 'WINS', 'DESC'),
  (35, NULL, NULL, NULL, 600, 'H2H_POINTS', 'DESC'),
  (35, NULL, NULL, NULL, 700, 'GOAL_DIFFERENCE', 'DESC'),
  (35, NULL, NULL, NULL, 800, 'GOALS_FOR', 'DESC')
ON CONFLICT DO NOTHING;

-- Handball (sport_id = 37)
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction) VALUES
  (37, NULL, NULL, NULL, 100, 'POINTS', 'DESC'),
  (37, NULL, NULL, NULL, 200, 'H2H_POINTS', 'DESC'),
  (37, NULL, NULL, NULL, 300, 'H2H_GOAL_DIFFERENCE', 'DESC'),
  (37, NULL, NULL, NULL, 400, 'H2H_GOALS_FOR', 'DESC'),
  (37, NULL, NULL, NULL, 500, 'GOAL_DIFFERENCE', 'DESC'),
  (37, NULL, NULL, NULL, 600, 'GOALS_FOR', 'DESC')
ON CONFLICT DO NOTHING;

-- Futsal (sport_id = 38)
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction) VALUES
  (38, NULL, NULL, NULL, 100, 'POINTS', 'DESC'),
  (38, NULL, NULL, NULL, 200, 'H2H_POINTS', 'DESC'),
  (38, NULL, NULL, NULL, 300, 'H2H_GOAL_DIFFERENCE', 'DESC'),
  (38, NULL, NULL, NULL, 400, 'H2H_GOALS_FOR', 'DESC'),
  (38, NULL, NULL, NULL, 500, 'GOAL_DIFFERENCE', 'DESC'),
  (38, NULL, NULL, NULL, 600, 'GOALS_FOR', 'DESC')
ON CONFLICT DO NOTHING;

-- Volleyball (sport_id = 39)
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction) VALUES
  (39, NULL, NULL, NULL, 100, 'POINTS', 'DESC'),
  (39, NULL, NULL, NULL, 200, 'WINS', 'DESC'),
  (39, NULL, NULL, NULL, 300, 'SET_RATIO', 'DESC'),
  (39, NULL, NULL, NULL, 400, 'POINT_RATIO', 'DESC'),
  (39, NULL, NULL, NULL, 500, 'H2H_POINTS', 'DESC')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- LEAGUE-LEVEL OVERRIDES (only where different from sport default)
-- Note: league_id values must match the actual leagues in the database.
-- These use a sub-select to find league_id by originalName.
-- If the league doesn't exist yet, the INSERT is skipped (no error).
-- ============================================================================

-- La Liga — H2H-first
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 36, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'POINTS', 'DESC'),
  (200, 'H2H_POINTS', 'DESC'),
  (300, 'H2H_GOAL_DIFFERENCE', 'DESC'),
  (400, 'GOAL_DIFFERENCE', 'DESC'),
  (500, 'GOALS_FOR', 'DESC')
) AS v(sort_order, criterion, direction)
WHERE l.original_name ILIKE '%La Liga%' AND l.sport_id = 36
ON CONFLICT DO NOTHING;

-- Serie A — H2H-first
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 36, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'POINTS', 'DESC'),
  (200, 'H2H_POINTS', 'DESC'),
  (300, 'H2H_GOAL_DIFFERENCE', 'DESC'),
  (400, 'GOAL_DIFFERENCE', 'DESC'),
  (500, 'GOALS_FOR', 'DESC')
) AS v(sort_order, criterion, direction)
WHERE l.original_name ILIKE '%Serie A%' AND l.sport_id = 36
ON CONFLICT DO NOTHING;

-- Bundesliga — GD first, then H2H with away goals
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 36, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'POINTS', 'DESC'),
  (200, 'GOAL_DIFFERENCE', 'DESC'),
  (300, 'GOALS_FOR', 'DESC'),
  (400, 'H2H_POINTS', 'DESC'),
  (500, 'H2H_AWAY_GOALS', 'DESC'),
  (600, 'AWAY_GOALS_FOR', 'DESC')
) AS v(sort_order, criterion, direction)
WHERE l.original_name ILIKE '%Bundesliga%' AND l.sport_id = 36
ON CONFLICT DO NOTHING;

-- Ligue 1 — GD first, then extended H2H
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 36, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'POINTS', 'DESC'),
  (200, 'GOAL_DIFFERENCE', 'DESC'),
  (300, 'GOALS_FOR', 'DESC'),
  (400, 'H2H_POINTS', 'DESC'),
  (500, 'H2H_GOAL_DIFFERENCE', 'DESC'),
  (600, 'H2H_GOALS_FOR', 'DESC'),
  (700, 'H2H_AWAY_GOALS', 'DESC'),
  (800, 'AWAY_GOALS_FOR', 'DESC')
) AS v(sort_order, criterion, direction)
WHERE l.original_name ILIKE '%Ligue 1%' AND l.sport_id = 36
ON CONFLICT DO NOTHING;

-- Primeira Liga — H2H-first with wins
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 36, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'POINTS', 'DESC'),
  (200, 'H2H_POINTS', 'DESC'),
  (300, 'H2H_GOAL_DIFFERENCE', 'DESC'),
  (400, 'GOAL_DIFFERENCE', 'DESC'),
  (500, 'WINS', 'DESC'),
  (600, 'GOALS_FOR', 'DESC')
) AS v(sort_order, criterion, direction)
WHERE l.original_name ILIKE '%Primeira Liga%' AND l.sport_id = 36
ON CONFLICT DO NOTHING;

-- Eredivisie — GD first, then extended H2H
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 36, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'POINTS', 'DESC'),
  (200, 'GOAL_DIFFERENCE', 'DESC'),
  (300, 'GOALS_FOR', 'DESC'),
  (400, 'H2H_POINTS', 'DESC'),
  (500, 'H2H_GOAL_DIFFERENCE', 'DESC'),
  (600, 'H2H_GOALS_FOR', 'DESC'),
  (700, 'H2H_AWAY_GOALS', 'DESC')
) AS v(sort_order, criterion, direction)
WHERE l.original_name ILIKE '%Eredivisie%' AND l.sport_id = 36
ON CONFLICT DO NOTHING;

-- Brasileirão — Wins before GD
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 36, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'POINTS', 'DESC'),
  (200, 'WINS', 'DESC'),
  (300, 'GOAL_DIFFERENCE', 'DESC'),
  (400, 'GOALS_FOR', 'DESC'),
  (500, 'H2H_POINTS', 'DESC')
) AS v(sort_order, criterion, direction)
WHERE (l.original_name ILIKE '%Brasileir%' OR l.original_name ILIKE '%Serie A%') AND l.sport_id = 36
ON CONFLICT DO NOTHING;

-- NBA — Win PCT, no points
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 34, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'WIN_PCT', 'DESC'),
  (200, 'H2H_WIN_PCT', 'DESC'),
  (300, 'NET_POINTS', 'DESC'),
  (400, 'CLUB_ID', 'ASC')
) AS v(sort_order, criterion, direction)
WHERE l.original_name ILIKE '%NBA%' AND l.sport_id = 34
ON CONFLICT DO NOTHING;

-- KHL — Separates OT and SO wins
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 35, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'POINTS', 'DESC'),
  (200, 'REGULATION_WINS', 'DESC'),
  (300, 'OT_WINS', 'DESC'),
  (400, 'PENALTY_WINS', 'DESC'),
  (500, 'GOAL_DIFFERENCE', 'DESC'),
  (600, 'GOALS_FOR', 'DESC')
) AS v(sort_order, criterion, direction)
WHERE l.original_name ILIKE '%KHL%' AND l.sport_id = 35
ON CONFLICT DO NOTHING;

-- SHL — 3-2-1-0 system, simple GD
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 35, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'POINTS', 'DESC'),
  (200, 'GOAL_DIFFERENCE', 'DESC'),
  (300, 'GOALS_FOR', 'DESC')
) AS v(sort_order, criterion, direction)
WHERE l.original_name ILIKE '%SHL%' AND l.sport_id = 35
ON CONFLICT DO NOTHING;

-- DEL — 3-2-1-0, H2H tiebreaker
INSERT INTO standing_order_rules (sport_id, league_id, start_year, end_year, sort_order, criterion, direction)
SELECT 35, l.id, NULL, NULL, v.sort_order, v.criterion, v.direction
FROM leagues l
CROSS JOIN (VALUES
  (100, 'POINTS', 'DESC'),
  (200, 'H2H_POINTS', 'DESC'),
  (300, 'H2H_GOAL_DIFFERENCE', 'DESC'),
  (400, 'H2H_GOALS_FOR', 'DESC')
) AS v(sort_order, criterion, direction)
WHERE l.original_name ILIKE '%DEL%' AND l.sport_id = 35
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SET POINT SYSTEM ON LEAGUES
-- ============================================================================

-- Basketball leagues
UPDATE leagues SET point_system = 'BASKETBALL_W_L' WHERE sport_id = 34;

-- Ice Hockey leagues (default NHL-style)
UPDATE leagues SET point_system = 'HOCKEY_2_0_OTL' WHERE sport_id = 35;

-- SHL and DEL use 3-2-1-0 system
UPDATE leagues SET point_system = 'HOCKEY_3_2_1_0'
WHERE sport_id = 35 AND (original_name ILIKE '%SHL%' OR original_name ILIKE '%DEL%');

-- Football leagues (already default)
UPDATE leagues SET point_system = 'FOOTBALL_3_1_0' WHERE sport_id = 36;

-- Handball leagues
UPDATE leagues SET point_system = 'HANDBALL_2_1_0' WHERE sport_id = 37;

-- Futsal leagues
UPDATE leagues SET point_system = 'FOOTBALL_3_1_0' WHERE sport_id = 38;

-- Volleyball leagues
UPDATE leagues SET point_system = 'VOLLEYBALL_3_2_1_0' WHERE sport_id = 39;
