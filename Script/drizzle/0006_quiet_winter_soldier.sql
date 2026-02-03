CREATE TABLE "club_stadiums" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_id" integer NOT NULL,
	"stadium_id" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_divisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"club_id" integer NOT NULL,
	"player_id" integer,
	"minute" integer,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"phase_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leagues" DROP CONSTRAINT "leagues_name_unique";--> statement-breakpoint
ALTER TABLE "clubs" DROP CONSTRAINT "clubs_city_id_cities_id_fk";
--> statement-breakpoint
ALTER TABLE "clubs" DROP CONSTRAINT "clubs_stadium_id_stadiums_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "home_score" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "away_score" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "standings" ALTER COLUMN "group_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "foundation_year" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "country_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "group_clubs" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "original_name" varchar(150) NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "secondary_name" varchar(150);--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "city_id" integer;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "start_year" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "end_year" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "number_of_turns" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "number_of_rounds" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "min_divisions_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "max_divisions_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "divisions_time" integer;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "has_overtime_override" boolean;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "has_penalties_override" boolean;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "has_ascends" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "ascends_quantity" integer;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "has_descends" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "descends_quantity" integer;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "has_sub_leagues" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "number_of_sub_leagues" integer;--> statement-breakpoint
ALTER TABLE "match_divisions" ADD COLUMN "division_type" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "league_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "season_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "round_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "league_division_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "turn" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "has_overtime" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "has_penalties" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "year_constructed" integer;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "type" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "league_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "season_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "round_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "league_division_id" integer;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "overtime_wins" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "overtime_losses" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "penalty_wins" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "penalty_losses" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "sets_won" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "sets_lost" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "divisions_won" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "divisions_lost" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "home_games_played" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "away_games_played" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "home_wins" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "home_losses" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "home_draws" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "away_wins" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "away_losses" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "away_draws" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "standings" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "club_stadiums" ADD CONSTRAINT "club_stadiums_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_stadiums" ADD CONSTRAINT "club_stadiums_stadium_id_stadiums_id_fk" FOREIGN KEY ("stadium_id") REFERENCES "public"."stadiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_divisions" ADD CONSTRAINT "league_divisions_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_league_division_id_league_divisions_id_fk" FOREIGN KEY ("league_division_id") REFERENCES "public"."league_divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_league_division_id_league_divisions_id_fk" FOREIGN KEY ("league_division_id") REFERENCES "public"."league_divisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" DROP COLUMN "city_id";--> statement-breakpoint
ALTER TABLE "clubs" DROP COLUMN "stadium_id";--> statement-breakpoint
ALTER TABLE "leagues" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "leagues" DROP COLUMN "gender";