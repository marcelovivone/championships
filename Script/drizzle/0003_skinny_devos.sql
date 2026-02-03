ALTER TABLE "groups" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "match_divisions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "matches" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "phases" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "season_clubs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "standings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "groups" CASCADE;--> statement-breakpoint
DROP TABLE "match_divisions" CASCADE;--> statement-breakpoint
DROP TABLE "matches" CASCADE;--> statement-breakpoint
DROP TABLE "phases" CASCADE;--> statement-breakpoint
DROP TABLE "season_clubs" CASCADE;--> statement-breakpoint
DROP TABLE "standings" CASCADE;--> statement-breakpoint
ALTER TABLE "clubs" DROP CONSTRAINT "clubs_country_id_countries_id_fk";
--> statement-breakpoint
ALTER TABLE "cities" ALTER COLUMN "name" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "clubs" ALTER COLUMN "city_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "flag_url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stadiums" ALTER COLUMN "capacity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "short_name" varchar(50);--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "stadium_id" integer;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "gender" varchar(10) DEFAULT 'Men' NOT NULL;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_stadium_id_stadiums_id_fk" FOREIGN KEY ("stadium_id") REFERENCES "public"."stadiums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" DROP COLUMN "foundation_year";--> statement-breakpoint
ALTER TABLE "clubs" DROP COLUMN "country_id";--> statement-breakpoint
ALTER TABLE "clubs" DROP COLUMN "shield_url";--> statement-breakpoint
ALTER TABLE "clubs" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_code_unique" UNIQUE("code");