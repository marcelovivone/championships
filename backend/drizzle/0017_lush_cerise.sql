ALTER TABLE "group_clubs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "phases" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "group_clubs" CASCADE;--> statement-breakpoint
DROP TABLE "phases" CASCADE;--> statement-breakpoint
ALTER TABLE "groups" DROP CONSTRAINT "groups_phase_id_phases_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" DROP CONSTRAINT "matches_phase_id_phases_id_fk";
--> statement-breakpoint
ALTER TABLE "rounds" DROP CONSTRAINT "rounds_phase_id_phases_id_fk";
--> statement-breakpoint
ALTER TABLE "standings" DROP CONSTRAINT "standings_phase_id_phases_id_fk";
--> statement-breakpoint
ALTER TABLE "groups" ADD COLUMN "season_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "season_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "min_match_divisions_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "max_match_divisions_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "phase_id";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "phase_id";--> statement-breakpoint
ALTER TABLE "rounds" DROP COLUMN "phase_id";--> statement-breakpoint
ALTER TABLE "sports" DROP COLUMN "divisions_number";--> statement-breakpoint
ALTER TABLE "standings" DROP COLUMN "phase_id";