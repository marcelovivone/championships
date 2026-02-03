CREATE TABLE "season_clubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"club_id" integer NOT NULL,
	"join_date" timestamp NOT NULL,
	"leave_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "season_clubs" ADD CONSTRAINT "season_clubs_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD CONSTRAINT "season_clubs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;