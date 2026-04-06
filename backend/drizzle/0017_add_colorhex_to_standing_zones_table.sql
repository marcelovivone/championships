-- Custom SQL migration file, put your code below!

-- This column indicates the hex color code representing the color of the standing zone
ALTER TABLE standing_zones
ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7) DEFAULT '#FFFFFF' NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN standing_zones.color_hex IS 'Hex color code representing the color of the standing zone';