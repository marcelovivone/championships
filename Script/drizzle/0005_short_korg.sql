CREATE TABLE "league_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"label" varchar(100) NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "league_links" ADD CONSTRAINT "league_links_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;