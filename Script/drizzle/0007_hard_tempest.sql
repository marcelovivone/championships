ALTER TABLE "rounds" ALTER COLUMN "start_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ALTER COLUMN "end_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "seasons" DROP COLUMN "end_date";