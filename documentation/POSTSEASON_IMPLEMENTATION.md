# Championships Documentation Catalog

Last updated: 2026-04-14

## Purpose

This file is contains details of the Postseason implementation for the repository documentation.

### 1. Database
## AI Action: No Action!)
## New columns already created
- C:\Users\milen\Documents\Personal\Championships\backend\drizzle\0021_add_flghaspostseason_to_api_transitional_and_seasons_tables.sql
- C:\Users\milen\Documents\Personal\Championships\backend\drizzle\0022_add_seasonphase_to_matches_table.sqlc

### 2. FRONTEBD
## AI Action: Implement it!

## User Admin:
1 - In Season's page: C:\Users\milen\Documents\Personal\Championships\frontend\app\admin\seasons\page.tsx
. Add the 2 new columns to both Add/Edit a season and to the list table
2 - In matches' page: C:\Users\milen\Documents\Personal\Championships\frontend\app\admin\matches\page.tsx
. Add the 2 new columns to the frontend and to the backend code, but dot not render the columns yet. I will do it myself. For now, just make the 2 columns availabe on the frontend side and being send and read from the backend.

## User Common (final user)
IMPORATNT: if the seasons' column has_postseason is false, both fields described below are invisible and make no sense 
1 - On both basketball and footaball pages:
C:\Users\milen\Documents\Personal\Championships\frontend\app\common\standings\basketball\page.tsx and
C:\Users\milen\Documents\Personal\Championships\frontend\app\common\standings\football\page.tsx
. Beside the Season list (the one who lists the years), add the 2 new columns, like this:
1.a - Season Phase. listing the containing of season_phases seasons' column. The default, should be the contaiing of current_phase season's column.
2.b - In the case the season phase is regular, this second filed should be invisible. If not regular, we should list the containing of current_phase_detail and should have the seasons' current_phase_detail seasons' column.
In the case of Season Phase "Regular", we should keep the page just the way it is right now.
In the case of not Regular, we should implement a new visualization, and should consider that the implementation should be used for all the sports and all the pages to be yet developed.
The new visualization should follow the two images I am adding here (see both images).
From the left to the right, we should follow the sequence
play-ins matches -> round of 64 matches -> round of 32 matches -> round of 16 matches -> quarterfinals matches -> semifinals matches -> final
To define matches phase to plot, we should read the postseasons matches of the season. If we find play-in, we plot it games, if we find the round of 64, we plot them. And so on until the finals. 
The new visualization should replace both standings table and matches table. This two table must be invisible in the case of not regular phase selected.
The containing of each rectangle of matches
Club A + (position on group standing table at the end of the regular season) + number of games won during the current phase of the rectangle (explanation of games won: if club A and club B plyaed 4 games during the phase, and club A won 3 and lost 1, club A should show 3 and B, 1)
Club B + (position on group standing table at the end of the regular season) + number of games won during the current phase of the rectangle
The order of the clubs (which one should be A and B, is defined by the position onf the regular season: club A is the one positioned above the other)
We should make the background color of all the rectangles different of white in the case of the current postseason phase

### 3. BACKEND
## AI Action: Implement it!
The changes to be done for postseason, only should be runned if the user select All or Postseason on the Season Phase list on the frontend T&L process. If the user select Regular, we just have to run the part of the code we are running until now.
In the case of All, we should run both current code and the one to be developed now.
Changes to be applied to C:\Users\milen\Documents\Personal\Championships\backend\src\api\api.service.ts and the codes called by it, and also codes used by it, like the controller if needed, the dtos and so on.
1 - applyFirstRowToApp
1.a - IF first payload of the season, add the flg_has_postseason to the creating SQL statement. If not first payload, do nothing with flg_has_preseason on seasons table
1.b - seasons current_phase and current_phase_detail columns:
. If the api_transitional's flg_has_postseason is false, nothing to do.
. If the api_transitional's flg_has_postseason is true:
When reading the payload, we have to check, of each game, the slug 
- NBA payloads: https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20250504
"events": [
    {
      "id": "401766458",
      "uid": "s:40~l:46~e:401766458",
      "date": "2025-04-15T23:30Z",
      "name": "Atlanta Hawks at Orlando Magic",
      "shortName": "ATL @ ORL",
      "season": {
        "year": 2025,
        "type": 5,
        **"slug": "play-in-season"**
      },
Read the value of slug (for each match, inside "events"):
During the T&L process, identify what is the current phase, by memorizing the latest game played (the one who has the status of Finished). If the latest game with status finished belongs to regular slang, it means the season is on regular phase. If play-in is has the latest game played, this is the current phase. And the same for playoffs.
In the case of playoffs, identify (the same way describe above, by the latest game played) what part of the playoffs are being played (round of 64, round of 32, ..., final).
  "events": [
    {
      "id": "401772989",
      "uid": "s:40~l:46~e:401772989",
      "date": "2025-05-22T00:00Z",
      "name": "Indiana Pacers at New York Knicks",
      "shortName": "IND @ NY",
      "season": {
        "year": 2025,
        "type": 3,
        "slug": "post-season"
      },
      "competitions": [
        {
          "id": "401772989",
          "uid": "s:40~l:46~e:401772989~c:401772989",
          "date": "2025-05-22T00:00Z",
          "attendance": 19812,
          "type": {
            "id": "16",
            **"abbreviation": "SEMI"**
          },
          "timeValid": true,
          "neutralSite": false,

To identify the phase detail of playoffs, read the value of abbreviation element. It could be RD16, QTR, SEMI, FINAL.

Update the seasons current_phase and current_phase_detail with the current phase and current phase part identified above.

2 - applyAllRowsToApp
When creating the matches, update the new columns season_phase and current_phase_detail using the slug and abbreviation elements described above.
Create the backend strcuture to attend the new features described for the frontend side, specially to the final user.

- Football payloads (an example of a league/season that has postseason):
slugs: regular-season, europa-conference-playoffs---semifinals, europa-conference-playoffs---final (this is an example using the dutch league, which, for now, is the only league football in our database with postseason)
Dutch example: https://site.api.espn.com/apis/site/v2/sports/soccer/ned.1/scoreboard?dates=20250401-20250630&limit=1000
    "id": "735820",
      "uid": "s:600~l:725~e:735820",
      "date": "2025-05-22T19:00Z",
      "name": "NEC Nijmegen at FC Twente",
      "shortName": "NEC @ TWE",
      "season": {
        "year": 2024,
        "type": 12672,
        **"slug": "europa-conference-playoffs---semifinals"**
      },
      "competitions": [
        {
          "id": "735820",
          "uid": "s:600~l:725~e:735820~c:735820",
          "date": "2025-05-22T19:00Z",

## IMPORTANT:
For sure there are a lot of details not described in this document that should be implemented. In these cases, implement the code and update this document.

## Implemented details

1. Season metadata contract
. `seasons` now exposes `flgHasPostseason`, `currentPhase`, and `currentPhaseDetail` end-to-end in the backend DTOs, services, and frontend shared types.
. The admin seasons page now allows editing these values directly and shows them in the seasons list table.

2. Match metadata contract
. `matches` now exposes `seasonPhase` and `seasonPhaseDetail` end-to-end in the backend DTOs, services, controllers, and frontend shared types.
. The admin matches page now keeps these fields in local row state and sends them on create/update, but does not render new inputs yet.

3. ETL behavior
. Postseason season metadata is inferred from parsed transitional rows and persisted on `seasons` during `applyFirstRowToApp`.
. Postseason match metadata is persisted on `matches` during `applyAllRowsToApp` for both insert and update paths.
. ESPN postseason inference uses `season.slug` plus the competition phase abbreviation when available.
. Api-Football postseason inference is based on the parsed season phase text emitted by the transitional parser.
. Postseason matches must not create `standings` rows, even when they are finished.
. Subsequent loads must still create newly discovered matches (for example, play-ins or playoffs that appear after the regular season was already loaded); the fast path is only for already-known matches.
. Entity review must still run on subsequent loads. Ambiguous ESPN playoff placeholders such as `TBD` or slash-combined labels like `Suns/Warriors` must never be auto-created as clubs.
. Ambiguous postseason participants are stored on the match as unresolved placeholder labels until the source payload replaces them with real clubs. When that happens on a later load, the existing match must be updated in place instead of creating a duplicate.

4. Final-user standings behavior
. The shared standings filter bar now shows season phase controls only when the selected season has postseason enabled.
. When the selected season phase is `Regular`, the standings and fixtures views keep the existing behavior.
. When the selected season phase is not `Regular`, the regular standings and fixtures panels are replaced by a shared postseason bracket component.
. The bracket uses the backend postseason endpoint and regular-season standings ordering to derive each club seed position.
. The bracket highlights the currently selected postseason phase/detail and orders clubs in each series by better regular-season seed.
. If the selected season is finished, the default screen must remain the regular-season view until the user explicitly selects another phase.

5. Backend bracket endpoint
. `GET /v1/matches/postseason-bracket` returns season postseason metadata, the regular-season standings snapshot used for seeding, and ordered postseason phases with matches.
. The regular-season standings snapshot is resolved from the latest regular-season round when available, otherwise from the latest regular-season match date.