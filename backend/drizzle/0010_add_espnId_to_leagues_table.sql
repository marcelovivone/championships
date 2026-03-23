-- Custom SQL migration file, put your code below! --

-- Add origin column to api_transitional table
-- This column stores the ESPN API identifier (leagues/id in JSON payload)

ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS espn_id VARCHAR(20) DEFAULT '';

-- Comment for documentation
COMMENT ON COLUMN leagues.espn_id IS 'ESPN API identifier (leagues/id in JSON payload)';

