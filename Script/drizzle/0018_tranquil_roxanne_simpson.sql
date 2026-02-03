ALTER TABLE "seasons" ADD COLUMN "flg_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "club_id" integer;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "number_of_groups" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;