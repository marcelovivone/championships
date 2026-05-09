-- Manual SQL migration for current-season ESPN extraction configuration.
-- IMPORTANT: This file is intended to be executed manually by the operator.

CREATE TABLE IF NOT EXISTS "season_espn_extraction_configs" (
  "id" serial PRIMARY KEY NOT NULL,
  "season_id" integer NOT NULL,
  "external_league_code" varchar(120) NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "same_years" boolean DEFAULT false NOT NULL,
  "has_postseason" boolean DEFAULT false NOT NULL,
  "schedule_type" varchar(10) DEFAULT 'Date' NOT NULL,
  "has_groups" boolean DEFAULT false NOT NULL,
  "number_of_groups" integer DEFAULT 0 NOT NULL,
  "has_divisions" boolean DEFAULT true NOT NULL,
  "run_in_background" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "season_espn_extraction_configs_season_id_seasons_id_fk"
    FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE cascade ON UPDATE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS "season_espn_extraction_configs_season_id_uq"
  ON "season_espn_extraction_configs" USING btree ("season_id");

CREATE INDEX IF NOT EXISTS "season_espn_extraction_configs_external_league_code_idx"
  ON "season_espn_extraction_configs" USING btree ("external_league_code");