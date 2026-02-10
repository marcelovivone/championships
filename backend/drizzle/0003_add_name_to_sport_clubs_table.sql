-- Custom SQL migration file, put your code below! --
ALTER TABLE sport_clubs
ADD COLUMN name VARCHAR(100) DEFAULT '' NOT NULL;