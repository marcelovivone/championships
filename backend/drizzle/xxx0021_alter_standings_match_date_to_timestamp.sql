ALTER TABLE standings
ALTER COLUMN match_date TYPE timestamp USING match_date::timestamp;