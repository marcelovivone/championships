-- Add league_id to season_clubs table
ALTER TABLE "season_clubs" ADD COLUMN "league_id" integer NOT NULL;

-- Add foreign key constraint
ALTER TABLE "season_clubs" ADD CONSTRAINT "season_clubs_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE no action ON UPDATE no action;
