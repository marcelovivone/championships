-- Custom SQL migration file, put your code below! --

CREATE TABLE IF NOT EXISTS entity_name_aliases (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL,
  entity_id INTEGER NOT NULL,
  alias_name VARCHAR(300) NOT NULL,
  canonical_name VARCHAR(300) NOT NULL,
  sport_id INTEGER,
  country_id INTEGER,
  source VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_alias_type_name_sport_country
  ON entity_name_aliases (entity_type, alias_name, COALESCE(sport_id, 0), COALESCE(country_id, 0));

CREATE INDEX IF NOT EXISTS idx_entity_aliases_canonical_lookup
  ON entity_name_aliases (entity_type, canonical_name, COALESCE(sport_id, 0), COALESCE(country_id, 0));