-- Migration: Add type_of_schedule to leagues table
-- Description: Add scheduling type (Round or Date) and make number_of_rounds nullable

-- Add type_of_schedule column with default value 'Round'
ALTER TABLE leagues 
ADD COLUMN type_of_schedule VARCHAR(10) NOT NULL DEFAULT 'Round' 
CHECK (type_of_schedule IN ('Round', 'Date'));

-- Make number_of_rounds nullable to support date-based scheduling
ALTER TABLE leagues 
ALTER COLUMN number_of_rounds DROP NOT NULL;

-- Add comment to explain the purpose
COMMENT ON COLUMN leagues.type_of_schedule IS 'Scheduling type: Round (round-based like Premier League) or Date (date-based like NBA/NHL)';
COMMENT ON COLUMN leagues.number_of_rounds IS 'Number of rounds in the season (required for Round type, null for Date type)';
