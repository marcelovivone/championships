-- Custom SQL migration file, put your code below! --
ALTER TABLE standings
ADD COLUMN home_points INT NULL Default 0,
ADD COLUMN away_points INT NULL Default 0,
ADD COLUMN home_goals_for INT NULL Default 0,
ADD COLUMN away_goals_for INT NULL Default 0,
ADD COLUMN home_goals_against INT NULL Default 0,
ADD COLUMN away_goals_against INT NULL Default 0,
DROP COLUMN goal_difference,
DROP COLUMN divisions_won,
DROP COLUMN divisions_lost;