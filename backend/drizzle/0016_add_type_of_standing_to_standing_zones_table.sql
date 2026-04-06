-- Custom SQL migration file, put your code below! --

-- Add type_of_standing column to standing_zones table
-- This column indicates the type of standing to what the zone should be applied (Its values can be: All, Combined, Group) of groups in the league
-- Ensure the enum type exists (Postgres)
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_of_standing') THEN
		CREATE TYPE type_of_standing AS ENUM ('All', 'Combined', 'Group');
	END IF;
END$$;

ALTER TABLE standing_zones
ADD COLUMN IF NOT EXISTS type_of_standing type_of_standing DEFAULT 'Combined'::type_of_standing NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN standing_zones.type_of_standing IS 'Indicates the type of standing to what the zone should be applied (Its values can be: All, Combined, Group) of groups in the league';