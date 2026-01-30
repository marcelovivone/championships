ALTER TABLE "groups" ADD COLUMN "sport_id" integer NOT NULL;
ALTER TABLE "groups" ADD COLUMN "league_id" integer NOT NULL;
DO $$ BEGIN
 ALTER TABLE "groups" ADD CONSTRAINT "groups_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "groups" ADD CONSTRAINT "groups_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "matches" DROP COLUMN IF EXISTS "league_division_id";
ALTER TABLE "standings" DROP COLUMN IF EXISTS "league_division_id";
DROP TABLE IF EXISTS "league_divisions";

ALTER TABLE "rounds" DROP COLUMN IF EXISTS "phaseId";
ALTER TABLE "matches" DROP COLUMN IF EXISTS "phaseId";
ALTER TABLE "standings" DROP COLUMN IF EXISTS "phaseId";
DROP TABLE IF EXISTS "phases";

DROP TABLE IF EXISTS "group_clubs";
