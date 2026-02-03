-- Migration: Make round_id nullable in matches table
-- This change allows Date-based leagues (NBA/NHL) to create matches without rounds

ALTER TABLE matches 
ALTER COLUMN round_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN matches.round_id IS 'Round ID (nullable - only required for Round-based leagues like Premier League, optional for Date-based leagues like NBA/NHL)';
