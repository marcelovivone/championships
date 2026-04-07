-- Add type_of_standing column to standing_zones table

ALTER TABLE standing_zones
ADD COLUMN IF NOT EXISTS start_year integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_year integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS flg_priority boolean DEFAULT FALSE NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN standing_zones.start_year IS 'The start year for the standing zone';
COMMENT ON COLUMN standing_zones.end_year IS 'The end year for the standing zone';
COMMENT ON COLUMN standing_zones.flg_priority IS 'Indicates if the standing zone has priority';