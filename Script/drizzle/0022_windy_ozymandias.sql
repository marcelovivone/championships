CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'finished', 'postponed', 'cancelled');--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"parent_id" integer,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "profile_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile" varchar(20) NOT NULL,
	"menu_item_id" integer NOT NULL,
	"can_access" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sport_clubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sport_id" integer NOT NULL,
	"club_id" integer NOT NULL,
	"flg_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"menu_item_id" integer NOT NULL,
	"can_access" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clubs" ALTER COLUMN "foundation_year" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DEFAULT 'scheduled'::"public"."match_status";--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "status" SET DATA TYPE "public"."match_status" USING "status"::"public"."match_status";--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "city_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "sport_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "season_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "flg_current" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD COLUMN "sport_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD COLUMN "league_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "sport_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "flg_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "number_of_groups" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "min_match_divisions_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "max_match_divisions_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sports" ADD COLUMN "flg_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_permissions" ADD CONSTRAINT "profile_permissions_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sport_clubs" ADD CONSTRAINT "sport_clubs_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sport_clubs" ADD CONSTRAINT "sport_clubs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD CONSTRAINT "season_clubs_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD CONSTRAINT "season_clubs_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD CONSTRAINT "season_clubs_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "turn";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "has_overtime";--> statement-breakpoint
ALTER TABLE "matches" DROP COLUMN "has_penalties";--> statement-breakpoint
ALTER TABLE "season_clubs" DROP COLUMN "join_date";--> statement-breakpoint
ALTER TABLE "season_clubs" DROP COLUMN "leave_date";--> statement-breakpoint
ALTER TABLE "season_clubs" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "sports" DROP COLUMN "divisions_number";