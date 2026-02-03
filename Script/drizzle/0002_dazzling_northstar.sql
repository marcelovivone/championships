ALTER TABLE "countries" DROP CONSTRAINT "countries_code_unique";--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "flag_url" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "flag_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "code" DROP NOT NULL;