ALTER TABLE matches
ALTER COLUMN home_club_id DROP NOT NULL;

ALTER TABLE matches
ALTER COLUMN away_club_id DROP NOT NULL;

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS home_club_placeholder VARCHAR(120);

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS away_club_placeholder VARCHAR(120);

COMMENT ON COLUMN matches.home_club_placeholder IS 'Raw unresolved home participant label from the source payload, such as TBD or Magic/Hornets';
COMMENT ON COLUMN matches.away_club_placeholder IS 'Raw unresolved away participant label from the source payload, such as TBD or Suns/Warriors';