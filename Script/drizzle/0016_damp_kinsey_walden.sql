-- Custom SQL migration file, put your code below! --
-- Rename divisions_number to max_match_divisions_number and add min_match_divisions_number

-- Step 1: Add the new min_match_divisions_number column with a default value
ALTER TABLE "sports" ADD COLUMN "min_match_divisions_number" integer NOT NULL DEFAULT 0;

-- Step 2: Rename divisions_number to max_match_divisions_number
ALTER TABLE "sports" RENAME COLUMN "divisions_number" TO "max_match_divisions_number";

-- Step 3: Update min_match_divisions_number to match max_match_divisions_number for existing records
UPDATE "sports" SET "min_match_divisions_number" = "max_match_divisions_number";

-- Step 4: Remove the default constraint from min_match_divisions_number (optional cleanup)
ALTER TABLE "sports" ALTER COLUMN "min_match_divisions_number" DROP DEFAULT;
