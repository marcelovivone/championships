-- Custom SQL migration file, put your code below! --

-- Add origin column to api_transitional table
-- This column stores the source API identifier (e.g., 'Api-Football', 'Api-Espn')

ALTER TABLE api_transitional 
ADD COLUMN IF NOT EXISTS origin VARCHAR(50) DEFAULT '';

-- Comment for documentation
COMMENT ON COLUMN api_transitional.origin IS 'Source API identifier: Api-Football, Api-Espn, etc.';

