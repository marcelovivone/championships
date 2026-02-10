-- Custom SQL migration file, put your code below! --
ALTER TABLE stadiums
ADD COLUMN sport_Id INT REFERENCES sports(id) DEFAULT 36 NOT NULL;