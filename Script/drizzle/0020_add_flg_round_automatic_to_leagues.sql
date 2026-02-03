-- Add flg_round_automatic column to leagues table
ALTER TABLE "leagues" ADD COLUMN "flg_round_automatic" boolean DEFAULT true NOT NULL;
