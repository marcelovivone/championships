-- Custom SQL migration file, put your code below! --

-- Add flg_espn_api_partial_scores column to sports table

ALTER TABLE sports 
ADD COLUMN IF NOT EXISTS flg_espn_api_partial_scores BOOLEAN DEFAULT FALSE;

-- Comment for documentation
COMMENT ON COLUMN sports.flg_espn_api_partial_scores IS 'Indicates if the first payload (scoreboard) contains the game partial scores: TRUE or FALSE';

-- Add espn_api_id column to matches table and create index for it

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS espn_api_id VARCHAR(50) DEFAULT '';

-- Comment for documentation
COMMENT ON COLUMN matches.espn_api_id IS 'ESPN API identifier for the match';

-- Create index for espn_api_id column
CREATE INDEX IF NOT EXISTS idx_matches_espn_api_id ON matches(espn_api_id);