-- Custom SQL migration file, put your code below! --

-- Add number_of_groups column to api_transitional table
-- This column indicates the number of groups in the league
ALTER TABLE api_transitional
ADD COLUMN IF NOT EXISTS number_of_groups INTEGER DEFAULT 0 NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN api_transitional.number_of_groups IS 'Indicates the number of groups in the league';