-- Custom SQL migration file, put your code below! --

-- 1: Add flg_has_postseason column to seasons table
-- This column indicates whether the season has a postseason
ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS flg_has_postseason BOOLEAN DEFAULT false NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN seasons.flg_has_postseason IS 'Indicates whether the season has a postseason';

-- 2: Add current_phase column to seasons table
-- This column indicates the phase of the season (Its values can be: Regular, Play-ins, Playoffs)
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'season_phase') THEN
		CREATE TYPE season_phase AS ENUM ('Regular', 'Play-ins', 'Playoffs');
	END IF;
END$$;

ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS current_phase season_phase DEFAULT 'Regular'::season_phase NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN seasons.current_phase IS  'Indicates the phase of the season (Its values can be: Regular, Play-ins, Playoffs)';

-- 3: Add current_phase column to seasons table
-- This column indicates the current phase of the season
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'season_phase_detail') THEN
		CREATE TYPE season_phase_detail AS ENUM ('Regular', 'Play-ins', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals');
	END IF;
END$$;

ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS current_phase_detail season_phase_detail DEFAULT 'Regular'::season_phase_detail NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN seasons.current_phase_detail IS 'Indicates the current detailed phase of the season';

-- 4: Add flg_has_postseason column to api_transitional table
-- This column indicates whether the season has a postseason
ALTER TABLE api_transitional
ADD COLUMN IF NOT EXISTS flg_has_postseason BOOLEAN DEFAULT false NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN api_transitional.flg_has_postseason IS 'Indicates whether the season has a postseason';