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
***** THIS IS ALREDY IMPLEMENTED *****
- Frontend page:
  - Availabe API Loads table
    - Change the title of the sixth column to Process
    - Change the format of the button process to a real shape button and chage the text to To Frontend Table
    - Add a seventh column with title Process and Process button inside the first table with text To DB Tables (this button should trigger the process I will describe soon, in the next topic of the document)
    - Add a eighth column with a Delete button to delete the row from the database api_transitional table
    - Improve the design of this table. Make it like the other list tables of the admin user.

***** THIS SHOULD BE IMPLEMENTED NOW *****
- Fronend page:
The process below can be triggered in to aways:
  1 - Using the second button of the first table (the one refering to process to db tables)
  2 - Add a new button on the right side of the view type button, on the top of the grid table (result of the transformation from json to a plan grid table, triggered by the first button of the top table, the one which process the json to a frontend table) .
  - Add a button on the right side of the new button, on the top of the table, to clean and hide the results table

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
The rirst row has specific tests to be performed, as we need to check the tables above the matches and the standings table, from which this two tables have foreign keys.
    - Get the follow contents of the first row and We should check the respective tables to identify if we need to add a row or just get the ids
    - league.country: check if the country exists in table countries. If it exists, get its id. If not, create a new contry and keep the id. We should consider the variances of the countries name. For instance, England coould be United Kindgon, Unitaed States, could be USA, United States of America. We should consider these possibilities. This id will be called in this document as countryId.
        - Creating row on leeagues table (if is a new league):
        - name: league.country
        - continent: if it is possible to get the continent during the process, get it from the web. If not, use Europe and I will fix it after the processing
        - flg_coutry: if it is possible to get the continent during the process, get it from the web. If not, use null and I will fix it after the processing
        - code: use the 3 first letters of the country (if necessary, I will fix it manually after the processing)

    - league.name: 
        - If on the first step we created a new country, just create a new league on table leagues and keep it id
        - Otherwise, try to find in the table leagues the league.name value in columns original_name and secondary_rname, using also the country id got on the first step and comparing it with the country_id and the sport_id=39 to compare with the column sport_id of the table. If the league name exists, get its id. If the league name do not exist, create a new row on the league table and get the id. This id will be called in this document as leagueId.
        - Creating row on leeagues table (if it is needed to insert a new league):
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
        - if the it is new league, there is no need to perform the test of the season existence. Just create a new season and get its id.
        - if the league already exists, check the table seasons using:
            TABLE COLUMN        VALUE
        - sport_id            36
        - league_id           leagueId
        - start_year          league.season
        if the league exists, read its id. If not, create a new season and keep its id. This id will be called in this document as seasonId.
        - Creating row on season table (if it is needed to insert a new season):
            COLUMN NAME                  VALUE
            - sport_id                     36
            - league_id                    leagueId
            - status                       Finished
            - flg_default                  false
            - number_of_groups             0
            - start_year                   league.season
            - end_year                     league.season

***** THIS WILL BE DESCRIBED AND IMPLETED SOON *****
- All rows
TO BE DEFINED.
Now we will be dealing with the games played or to be played and the whole process to save them in our database.
