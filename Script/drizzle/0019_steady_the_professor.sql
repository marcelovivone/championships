CREATE TABLE "sport_clubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sport_id" integer NOT NULL,
	"club_id" integer NOT NULL,
	"flg_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seasons" DROP CONSTRAINT "seasons_club_id_clubs_id_fk";
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "sport_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD COLUMN "sport_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "sport_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "start_year" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "end_year" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sport_clubs" ADD CONSTRAINT "sport_clubs_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sport_clubs" ADD CONSTRAINT "sport_clubs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD CONSTRAINT "season_clubs_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_clubs" ADD CONSTRAINT "season_clubs_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_sport_id_sports_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_clubs" DROP COLUMN "join_date";--> statement-breakpoint
ALTER TABLE "season_clubs" DROP COLUMN "leave_date";--> statement-breakpoint
ALTER TABLE "season_clubs" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "seasons" DROP COLUMN "year";--> statement-breakpoint
ALTER TABLE "seasons" DROP COLUMN "club_id";