-- Custom SQL migration file, put your code below! --

-- 1: Add season_phase column to matches table
-- This column indicates the phase of the season (Its values can be: Regular, Play-ins, Playoffs)
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS season_phase season_phase DEFAULT 'Regular'::season_phase NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN matches.season_phase IS 'Indicates the phase of the season to which the match belongs (Its values can be: Regular, Play-ins, Playoffs)';


-- 2: Add season_phase_detail column to matches table
-- This column indicates the detailed phase of the season (Its values can be: Regular, Play-ins, Round of 64, Round of 32, Round of 16, Quarterfinals, Semifinals, Finals)
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS season_phase_detail season_phase_detail DEFAULT 'Regular'::season_phase_detail NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN matches.season_phase_detail IS 'Indicates the detailed phase of the season to which the match belongs (Its values can be: Regular, Play-ins, Round of 64, Round of 32, Round of 16, Quarterfinals, Semifinals, Finals)';