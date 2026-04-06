-- Custom SQL migration file, put your code below! --

-- This table will store standing zones for different sports, leagues, and seasons. A standing zone represents a range of positions in the standings that share a common characteristic (e.g., playoff spots, relegation zone, etc.). The start_position and end_position columns define the range of positions that belong to the standing zone, and the name column provides a descriptive name for the zone. 
CREATE TABLE IF NOT EXISTS standing_zones (
    id SERIAL PRIMARY KEY,
    sport_id INT REFERENCES sports(id) NOT NULL,
    league_id INT REFERENCES leagues(id) NOT NULL,
    season_id INT REFERENCES seasons(id) NULL,
    start_position INT NOT NULL,
    end_position INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment for documentation
COMMENT ON COLUMN standing_zones.start_position IS 'Indicates the starting position of the standing zone';
COMMENT ON COLUMN standing_zones.end_position IS 'Indicates the ending position of the standing zone';
COMMENT ON COLUMN standing_zones.name IS 'Indicates the name of the standing zone';