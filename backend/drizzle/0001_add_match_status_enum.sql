CREATE TYPE match_status AS ENUM (
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled'
);

ALTER TABLE matches
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE match_status
    USING status::match_status,
  ALTER COLUMN status SET DEFAULT 'scheduled';