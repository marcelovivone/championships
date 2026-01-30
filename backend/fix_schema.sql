-- Drop tables if they exist
DROP TABLE IF EXISTS group_clubs CASCADE;
DROP TABLE IF EXISTS phases CASCADE;

-- Remove phase_id columns and add season_id where needed

-- Fix groups table
ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_phase_id_phases_id_fk;
ALTER TABLE groups DROP COLUMN IF EXISTS phase_id;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS season_id INTEGER REFERENCES seasons(id);

-- Fix rounds table
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_phase_id_phases_id_fk;
ALTER TABLE rounds DROP COLUMN IF EXISTS phase_id;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS season_id INTEGER REFERENCES seasons(id);

-- Fix matches table
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_phase_id_phases_id_fk;
ALTER TABLE matches DROP COLUMN IF EXISTS phase_id;

-- Fix standings table
ALTER TABLE standings DROP CONSTRAINT IF EXISTS standings_phase_id_phases_id_fk;
ALTER TABLE standings DROP COLUMN IF EXISTS phase_id;
