-- Custom SQL migration file, put your code below! --

-- Add flg_infer_clubs column to api_transitional table
-- This column indicates whether to infer clubs from the payload
ALTER TABLE api_transitional
ADD COLUMN IF NOT EXISTS flg_infer_clubs BOOLEAN DEFAULT true NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN api_transitional.flg_infer_clubs IS 'Indicates whether to infer clubs from the payload';
