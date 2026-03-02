-- Custom SQL migration file, put your code below! --
ALTER TABLE standings
ADD COLUMN sport_Id INT REFERENCES sports(id) DEFAULT 36 NOT NULL;