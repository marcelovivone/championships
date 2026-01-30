-- Migration to remove number_of_turns column from leagues table as per requirements

-- First, let's check if the number_of_rounds_matches column exists and has data
-- Then remove the deprecated number_of_turns column
ALTER TABLE "leagues" DROP COLUMN IF EXISTS "number_of_turns";