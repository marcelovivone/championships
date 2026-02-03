-- Migration for sports table updates as per requirements

-- Add the new columns to the sports table
ALTER TABLE "sports" ADD COLUMN "min_match_divisions_number" integer NOT NULL DEFAULT 1;
ALTER TABLE "sports" ADD COLUMN "max_match_divisions_number" integer NOT NULL DEFAULT 2;
ALTER TABLE "sports" ADD COLUMN "flg_default" boolean DEFAULT false NOT NULL;

-- Update existing records to have proper default values
UPDATE "sports" SET min_match_divisions_number = 1, max_match_divisions_number = divisions_number, flg_default = false;

-- Now remove the old divisions_number column
ALTER TABLE "sports" DROP COLUMN "divisions_number";

-- For existing sports, set one of them as default if none are set
UPDATE "sports" SET flg_default = true WHERE id = (SELECT MIN(id) FROM sports) AND NOT EXISTS(SELECT 1 FROM sports WHERE flg_default = true);