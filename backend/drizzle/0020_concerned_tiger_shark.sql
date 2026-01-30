ALTER TABLE "leagues" ADD COLUMN "flg_round_automatic" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "flg_current" boolean DEFAULT false NOT NULL;