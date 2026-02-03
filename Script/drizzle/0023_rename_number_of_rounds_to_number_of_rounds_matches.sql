-- Migration: Rename number_of_rounds to number_of_rounds_matches in leagues table
-- This change accommodates both round-based leagues (Premier League) and date-based leagues (NBA/NHL)
-- The field will store:
--   - Number of rounds for round-based leagues (e.g., 38 for Premier League)
--   - Number of matches for date-based leagues (e.g., 82 for NBA/NHL)

ALTER TABLE leagues 
RENAME COLUMN number_of_rounds TO number_of_rounds_matches;

-- Ensure the column has proper constraints
ALTER TABLE leagues 
ALTER COLUMN number_of_rounds_matches SET NOT NULL;

ALTER TABLE leagues 
ALTER COLUMN number_of_rounds_matches SET DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN leagues.number_of_rounds_matches IS 'Number of rounds (for round-based leagues) or total matches (for date-based leagues). Required field with default value 0.';
