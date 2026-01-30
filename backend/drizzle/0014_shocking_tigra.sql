ALTER TABLE "leagues" ADD COLUMN "flg_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leagues" DROP COLUMN "start_year";--> statement-breakpoint
ALTER TABLE "leagues" DROP COLUMN "end_year";