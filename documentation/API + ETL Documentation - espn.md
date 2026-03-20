API + ETL Documentation

API

Origin: https://site.api.espn.com/
Objective: To get fixtures and games from the API

Now wan¡t to develop a new ETL, to get the payloas from a new API.
The address is https://site.api.espn.com/.

I want you to:

EXTRACTION
- Frontend 
  File: frontend\app\admin\api\etl\football\page.tsx 
  - The user can choose from which API to extract the data
  - For now, just add a new field listing two fixed values: Api-Football and Api-Espn with lable Origin
  - Change the frontend code according. Now we have to pass the backend what is the source of the data

- Backend 
  Files: The files of the folder backend\src\api\
  - Now we have to save to the api_transitional database table the origin of the data
  - I will create the new column using drizzle. The column will for now receive a string (Api-Football or Api-Espn)
  - In the future, if needed, I will create a table with the origins and change the code

TRANSFORM & LOAD
- Frontend 
  File: frontend\app\admin\api\etl\football\page.tsx

- Backend
  Files: The files of the folder backend\src\api\
  - Now the backend will receive the type of origin and the transformation and load to be executed should consider the origin
  - The whole code we have so far prepared and working 100% correctrly is for the origin Api-Football. So don't touch anything
  - We are now dealing if the new origin, the Api-Espn
  - If you judge necessary or best practice, you can create new subfolder and/or create new files, as until now we have one
    origin and no need of clarifications we needed. But know, with two sources of data (and in the future could happen that
    we need to add more), maybe it is necessary to create some structure.
  - To prepare the new code you have:
    - Run this api and read its result: https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20210801-20220531&limit=1000
    - Take into account everything described in this file documentation\API + ETL Documentation - api-football - copia.md or investigate this code (which has all the instructions written ih the file and more things): C:\Users\milen\Documents\Personal\Championships\backend\src\api\api.service.ts. The functions to be considered are:
      - parseTransitional: Used to transform the json file into tabular grid table to be shoued to the user on the frontend
        application
      - applyFirstRowToApp and applyAllRowsToApp: these are the functions to transform and load the data from the json file
        into the actual software tables.
    The process must be the same already developed. We should use, check and insert (if needed) the same tables, in the same order. The only thing who changes are the origin, which is a complete differen json file, with a different strucutre,
    elements and so on. You should get the elements used inside the code already done and find the corresponding element in
    the new json to can perform the same things.

    New feature:
    - Save the event id in matches table. I have already created the new column.