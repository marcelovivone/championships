-- Add sport_id and league_id columns to groups table
ALTER TABLE "groups" ADD COLUMN "sport_id" integer;
ALTER TABLE "groups" ADD COLUMN "league_id" integer;

-- Update the columns to be NOT NULL and populate with appropriate values
UPDATE "groups" 
SET sport_id = seasons.sport_id, league_id = seasons.league_id
FROM seasons 
WHERE groups.season_id = seasons.id;

-- Set the columns to NOT NULL
ALTER TABLE "groups" ALTER COLUMN "sport_id" SET NOT NULL;
ALTER TABLE "groups" ALTER COLUMN "league_id" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "groups" ADD CONSTRAINT "groups_sport_id_sports_id_fk" 
  FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
  
ALTER TABLE "groups" ADD CONSTRAINT "groups_league_id_leagues_id_fk" 
  FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE CASCADE ON UPDATE NO ACTION;