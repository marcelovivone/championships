-- Custom SQL migration file, put your code below! --
-- Date: 2026-04-11

-- 1. Add point_system column to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS point_system VARCHAR(20) NOT NULL DEFAULT 'FOOTBALL_3_1_0';

-- 2. Add regulation_wins and regulation_ot_wins to standings
ALTER TABLE standings ADD COLUMN IF NOT EXISTS regulation_wins INTEGER DEFAULT 0;
ALTER TABLE standings ADD COLUMN IF NOT EXISTS regulation_ot_wins INTEGER DEFAULT 0;

-- 3. Create standing_order_rules table
CREATE TABLE IF NOT EXISTS standing_order_rules (
    id              SERIAL PRIMARY KEY,
    sport_id        INTEGER NOT NULL REFERENCES sports(id),
    league_id       INTEGER REFERENCES leagues(id),
    start_year      INTEGER,
    end_year        INTEGER,
    sort_order      INTEGER NOT NULL,
    criterion       VARCHAR(40) NOT NULL,
    direction       VARCHAR(4) NOT NULL DEFAULT 'DESC',
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Unique index: one criterion per position per sport+league+start_year
CREATE UNIQUE INDEX IF NOT EXISTS idx_standing_order_sport_league_year_order
    ON standing_order_rules (sport_id, COALESCE(league_id, 0), COALESCE(start_year, 0), sort_order);
