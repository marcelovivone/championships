-- Custom SQL migration file, put your code below! --

-- Add flg_infer_clubs column to api_transitional table
-- This column indicates whether to infer clubs from the payload
ALTER TABLE api_transitional
ADD COLUMN IF NOT EXISTS flg_has_groups BOOLEAN DEFAULT false NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN api_transitional.flg_has_groups IS 'Indicates whether the league has groups';