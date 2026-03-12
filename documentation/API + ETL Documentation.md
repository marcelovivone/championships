API + ETL Documentation

API

Origin: https://dashboard.api-football.com/
Objective: To get fixtures and games from the API

Processing: 
- Access the aPI
During the first test we will be using the following GET request:
  - Command: curl --request GET \
	--url 'https://v3.football.api-sports.io/fixtures?season=2025&league=39' \
	--header 'x-apisports-key': 'XxXxXxXxXxXxXxXxXxXxXxXx'
  - My key authorization code is: ce5c84ed23a5d4c7e3ff63c7e12da7cc. So you have to use inside the header 'x-apisports-key': 'ce5c84ed23a5d4c7e3ff63c7e12da7cc' 
  - Return: This request will get all the games of the Premier League, season 2024/2025 in JSON format
- Script
  - The curl command above converted to Node.js is:
    var request = require("request");

    var options = {
    method: 'GET',
    url: 'https://v3.football.api-sports.io/fixtures/rounds',
    qs: {season: '2019', league: '61'},
    headers: {
        'x-apisports-key': 'XxXxXxXxXxXxXxXxXxXxXxXx'
    }
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        console.log(body);
    });
    - Adapt the curl or the example above to our environment
    - Frontend:
      - Prepare a new menu item API or Import League, Import Fixtures and Games, whatever. We can change the menu item in the future
      - The first version can be with only a button to run the GET Request, if you prefer.
      - The next version will have a lot of filters (sports, leagues, season, type of data to be read (if fixture and games, if league, if rounds and so on))
    - Backend:
      - Prepare the backend to execute the GET request and save the data read to an API table
      - The script must considered that the table can not exists, so, if the table does not existe, it should be created on the fly
      - The structure of the table must reflect the structure of the JSON read
- After the first execution I will analyse the table and decide how to implement the transfer of the data from the API table to the definitive tables use by the admin and user users.

ETL (API_TRANSITIONAL TO FRONTEND TABLE)
Steps
- Frontend menu:
  - MENU
    - Change the current API processing page to a new API submenu item called Processing
    - Crete a new submenu API item called ETL
  - Page
    - Use a table list ordered by date of api processing (descending)
    - Allow the user to select the row to process the ETL
  - Processing
    - Break the json payload into row and columns that make sense
    - First phase: 
      - Show the data processed on the screen so I can anaylise the data
      - Allow the user to export the table to an CSV or Excel file (using a button) 
    - Second phase: Will be defined after I analyse the broken json on the screen 

FINAL (FRONTEND TABLE TO DB TABLES)
- Frontend page:
  - Availabe API Loads table
    - Change the title of the sixth column to Process
    - Change the format of the button process to a real shape button and chage the text to To Frontend Table
    - Add a seventh column with title Process and Process button inside the first table with text To DB Tables (this button should trigger the process I will describe soon, in the next topic of the document)
    - Add a eighth column with a Delete button to delete the row from the database api_transitional table
    - Improve the design of this table. Make it like the other list tables of the admin user.

- Fronend page:
The process below can be triggered in to aways:
  1 - Using the second button of the first table (the one refering to process to db tables)
  2 - Add a new button on the right side of the view type button, on the top of the grid table (result of the transformation from json to a plan grid table, triggered by the first button of the top table, the one which process the json to a frontend table) .
  - Add a button on the right side of the new button, on the top of the table, to clean and hide the results table

We are working with the API frontend (C:\Users\milen\Documents\Personal\Championships\frontend\app\admin\api\etl\football) and backend (C:\Users\milen\Documents\Personal\Championships\backend\src\api) context. We are now about to implement the last phase of the ELT process, the one in which we read a json file loaded into the api_transitional database table and transform it into  data to fit our software database.
The function to star the process alreagy existis in the C:\Users\milen\Documents\Personal\Championships\frontend\app\admin\api\etl\football\page.tsx and is called: handleToDbTables.

The Json saved to the API_transtional DB table will be the origin of the two aways to trigger the process.
Elements of the JSON file to be used during the process, considering only the content of the structure response: []
- First row
  - league.name
  - league.season
  - league.country
  - league.flag
- All rounds
  - league.round
  - goals.away
  - goasl.home
  - score.halftime.away
  - score.halftime.home
  - teams.away.name
  - teams.home.name
  - fixture.date
  - fixture.venue.city
  - fixture.venue.name
  - fixture.status.long or fixture.status.short
  - fixture.timestamp

Process description:
  - General rules
    - If the json file has a format incompatible with the description of the process, save a row to the import log table referencing it, show a message to the user and abort the process
    - We should work with a log table to register the errors when it happens
    - If any error happens during the process, we should rollback the whole rows saved to the database. Because of this, the process should be atomic (in older langauges we opened a transacion and commit everything only ate the end of the whole process, if any error happend. I don't know how to to it here. Let me know what will be implemented)

- First row:
The first row has specific tests to be performed, as we need to check the tables above the matches and the standings table, from which this two tables have foreign keys.
    - Get the follow contents of the first row and add a row into the respective database table
    - league.country: 
        - create a new contry and keep the id. We should consider the variances of the countries name. For instance, England coould be United Kindgon, Unitaed States, could be USA, United States of America. We should consider these possibilities. This id will be called in this document as countryId.
        - Table name: countries
            COLUMN NAME                  VALUE
        - name: league.country
        - continent: if it is possible to get the continent during the process, get it from the web. If not, use Europe and I will fix it after the processing
        - flg_coutry: if it is possible to get the continent during the process, get it from the web. If not, use null and I will fix it after the processing
        - code: use the 3 first letters of the country (if necessary, I will fix it manually after the processing)

    - league.name: 
        - Create a new row on the league table and get the id. This id will be called in this document as leagueId.
        - Table name: leagues
            COLUMN NAME                  VALUE
            - sport_id                     36
            - country_id                   countryId
            - image_url                    league.flag
            - orginal_name                 league.name 
            - secondary_name               league.name
            - city_id                      null
            - number_of_rounds_matches     100 (I will manually fill in with the real number of rounds/matches)
            - min_divisions_number         2
            - max_divisions_number         2
            - division_time                45
            - has_overtime_override        null
            - has_penalties_override       null
            - has_ascends                  true
            - ascends_quantity             10 (I will manually fill in with the real number of rounds/matches)
            - has_descends                 true
            - descends_quantity            10 (I will manually fill in with the real number of rounds/matches)
            - has_subleagues               false
            - number_of_sub_leagues        0
            - flg_default                  false
            - flg_round_automatic          true
            - type_of_schedule             Round

    - league.season:
        - Create a new season and keep its id. This id will be called in this document as seasonId.
        - Table name: seasons
            COLUMN NAME                  VALUE
            - sport_id                     36
            - league_id                    leagueId
            - status                       Finished
            - flg_default                  false
            - number_of_groups             0
            - start_year                   league.season
            - end_year                     league.season

- All rows
Now we will be dealing with the games played or to be played and the whole process to save them in our database.
The tables to be updated are roumds. matches, match_divisions and standings.
The json elements to be considered in the phase are:
  - league.round
  - goals.away
  - goals.home
  - score.halftime.away
  - score.halftime.home
  - teams.away.name
  - teams.home.name
  - fixture.date
  - fixture.venue.city
  - fixture.venue.name
  - fixture.status.long or fixture.status.short
  - fixture.timestamp
When reading a row, first thing is identify if the round exists in the database. To do that, we should try to find a row in rouns table using:
    TABLE COLUMN        VALUE
  - league_id           leagueId
  - season_id           seasonId
  - round_id            league.round
    if the round exists, keep its id. If not, create a new season and keep its id. This id will be called in this document as seasonId.

First let's deal with the clubs.
Every row read has a teams.home.name and teams.away.name and we should check if the clubs already exists in the table clubs.
We have to access the clubs table using the short_name column. If we find the club or something similar to the teams.home.name and teams.away.name, we should get its id. If the club does not exist, we have to create it and keep the id. From now on, the  ids will be called homeClubId and awayClubId. To create a new club, we should use:
    - Table name: clubs
    TABLE COLUMN        VALUE
    - name              teams.home.name or teams.away.name, depending we searched by the home or the away club name
    - short_name        teams.home.name or teams.away.name, depending we searched by the home or the away club name
    - image_url         teams.home.logo or teams.away.logo
    - foundation_year   2000
    - country_id        countryId
    - city_id           null
To have a more optimized code, we should have in account that finished the first round, we will have worked with all the clubs participating of the championship. From the second round on, the clubs will be repeated. All the clubs will appear as home club and away club along the rest of the process. Maybe, we could save the clubs in memory, so, from the first row of the second round on, we don't need to access again the tables club. The rows are ordered by round and date.
The first time we read a club, doesn't matter if as homeClubId or awayClubId, whe have to to some extra work.
If we had to include the a new row in table clubs, we have to add the club reference into 4 or 5 other tables. If the club already exists, we have to create a reference for sure in one of the three tables and check if it is needed to be included to the other 4.
If it is a new club, we have to (we have to follow the following order):
- Create a new row in sport_clubs
    - Table name: sport_clubs
    TABLE COLUMN        VALUE
    - sport_id          sportId
    - club_id           homeClubId or awayClubId
    - flag_active       true
    - name              teams.home.name or teams.away.name
- Create a new row in season_clubs
    - Table name: sport_clubs
    TABLE COLUMN        VALUE
    - sport_id          sportId
    - league_id         leaguId
    - season_id         seasonId
    - club_id           homeClubId or awayClubId
    - group_id          null
- Check if fixture.venue.city exists in table city using the count_id = countryId and name like fixture.venue.city. If the city exists, get it id. If not, create a new row and keep its id (in both cases, this id will be called cityId in this document):
    - Table name: ity
    TABLE COLUMN        VALUE
    - name              fixture.venue.city
    - city_id           cityId
- Create a new row in stadiums. In this case, we have to keep the id of the new row, called in this document as stadiumId.
    - Table name: stadiums
    TABLE COLUMN        VALUE
    - sport_id          sportId
    - name              fixture.venue.name
    - city_id           cityId
    - season_id         seasonId
    - club_id           homeClubId or awayClubId
    - capacity          null
    - image_url         null
    - year_constructed  null
    - type              stadium
- Create a new row in club_stadiums
    - Table name: club_stadiums
    TABLE COLUMN        VALUE
    - club_id           homeClubId or awayClubId
    - stadium_id        stadiumId
    - start_date        1902-07-21
    - end_date          null
In the case the club already exists (we have to follow the following order):
- Check if the club is already registered in the the sport_clubs for the current sport using:
    - Table sport_clubs: sport_id = sportId and clubId = homeClubId or awayClubId
    - If it exists, nothing to do. If not, create a new row in the table using the same structure previously defined.
- Create a new row in season_clubs using the same structure defined previously.
- Check if the city exists:
  - Table cities: name = fixture.venue.city
  - If it exists, get its id. If not, create the new city using the structure previously definid. In both cases, the id is called cityId in the document. 
- Check if the statium exists:
  - Table stadiums: name = fixture.venue.name
  - If it exists, get its id. If not, create the new stadium using the structure previously definid. In both cases, the id is called stadiumId in the document. 
- Check if the club_stadiums exists:
  - Table club_stadiums: club_id = homeClubId or awayClubid and stadium_id = stadiumId
  - If it exists, nothing to do. If not, create the new club_stadiums using the structure previously definid. 

Now, dealing with the matches table
Each row read from the json should generate one new row in matches table:
    TABLE COLUMN        VALUE
    - sport_id          36
    - league_id         leagueId
    - season_id         seasonId
    - date              fixture.date
    - status            fixture.status.short === "FT" ? "Finished" : "Scheduled"
    - home_score        goals.home
    - away_score        goals.away
    - group_id          null
    - has_overtime      null
    - has_penalties     null
    - home_club_id      homeClubId *Defined next*
    - away_club_id      awayCludId *Defined next*
*Definition of homeClubId and awayClubId*
Now, the table match_divisions
In the case of the football, which is the sport we are dealing now, we will be saving 2 row in this table. But, I prefer we, at the beginning of the process, to get this information from the sports table, using the sports_id = 36. The column max_match_division_number has the value we should use to determine how many rows to be included. The same should be applied to the has_overtime and has_penalties of matches. I said before to put a null value. But get the corresponding values from the columns has_overtime and has_penalties of sports table.
To create a new row in maatch_dividions use this:
    TABLE COLUMN        VALUE
    Row 1
    match_id            matchId
    division_numer      1
    home_score          score.halftime.home
    away_score          score.halftime.away
    division_type       REGULAR

    Row 2
    match_id            matchId
    division_numer      2
    home_score          goals.home - score.halftime.home
    away_score          goals.away - score.halftime.away
    division_type       REGULAR
Now, the table standings
Likewise the match_division table, every row read from the json will generate two row in standings table. But in the case of this table, one row refers to the homeClubId and the other, to the awayClubId.
Because it is a too long script to be written, we could se the strucuture used in C:\Users\milen\Documents\Personal\Championships\frontend\app\admin\matches\page.tsx to call the standings API who do all the job to save a new standing. In the API, we have the standings-calculator.service.ts file that is called from standings.service.ts. This calculator do all the calculations need to fill in the columns and the services is in charge to POST the data.
The services has the creation function:
async create(createStandingDto: CreateStandingDto) {
From the frontend, we call this function this way:
                       await standingsApi.create({
                            sportId: sportId || 0,
                            leagueId: leagueId,
                            seasonId: seasonId,
                            roundId: roundId ?? null,
                            matchDate: matchDate || null,
                            groupId: groupId ?? null,
                            homeClubId,
                            awayClubId,
                            homeScore: match?.homeScore ?? 0,
                            awayScore: match?.awayScore ?? 0,
                            matchId: matchId,
                            matchDivisions: match?.matchDivisions ?? [],
                        });
I will define now what values we should use in our case:
    - sportId: 36
    - leagueId: leagueId
    - seasonId: seasonId
    - roundId: roundId,
    - matchDate: fixture.date,
    - groupId: null,
    - homeClubId: homeClubId
    - awayClubId: awayClubId
    - homeScore: goals.home
    - awayScore: goals.away
    - matchId: matchId
    - matchDivisions: the matches divisions saved before
In this case, we should use the same types defined in CreateStandingDto for each parameter.
