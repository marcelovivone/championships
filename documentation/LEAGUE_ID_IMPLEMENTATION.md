# League ID Implementation in Season Clubs

## Overview
Added `league_id` attribute to the `season_clubs` table to create a proper relationship between season clubs and leagues. This improves data integrity and provides better cascading filtering in the UI.

## Changes Made

### 1. Database Migration
**File:** `backend/drizzle/0021_add_league_id_to_season_clubs.sql`
- Created migration to add `league_id` column to `season_clubs` table
- Added NOT NULL constraint
- Added foreign key constraint to `leagues` table
- Migration executed successfully using `npm run migration:push`

### 2. Backend Schema
**File:** `backend/src/db/schema.ts`
- Added `leagueId` field to `seasonClubs` table definition
- Positioned after `sportId`, before `seasonId`
- Type: `integer('league_id').references(() => leagues.id).notNull()`

### 3. Backend DTOs

#### CreateSeasonClubDto
**File:** `backend/src/season-clubs/dto/create-season-club.dto.ts`
- Added `leagueId` field with validation
- Field order: sportId, leagueId, seasonId, clubId, groupId (optional)

#### UpdateSeasonClubDto
**File:** `backend/src/season-clubs/dto/update-season-club.dto.ts`
- Completely rewritten to include all updatable fields
- All fields are optional with `@IsOptional()` decorator
- Fields: sportId, leagueId, seasonId, clubId, groupId

#### SeasonClubResponseDto
**File:** `backend/src/season-clubs/dto/season-club-response.dto.ts`
- Added `leagueId` field
- Added `league` nested object with:
  - id
  - originalName
  - secondaryName

### 4. Backend Service
**File:** `backend/src/season-clubs/season-clubs.service.ts`

#### findAll() Method
- Added `leagueId` to SELECT query
- Added `league` object with id, originalName, secondaryName
- Added LEFT JOIN with `leagues` table

#### findBySeason() Method
- Same updates as findAll()
- Filters results by seasonId

#### create() Method
- Added league existence validation
- Added `leagueId` to INSERT statement
- Updated duplicate check to include leagueId
- Updated error message to mention league

#### update() Method
- Added league existence validation for updates
- Added `leagueId` to SET clause
- All fields can now be updated (not just groupId)

### 5. Frontend Types
**File:** `frontend/lib/api/types.ts`

#### SeasonClub Interface
- Added `leagueId: number` field
- Added `league?: League` nested object

#### CreateSeasonClubDto Interface
- Added `leagueId: number` field between sportId and seasonId

### 6. Frontend Season Clubs Page
**File:** `frontend/app/admin/season-clubs/page.tsx`

#### Imports
- Added `leaguesApi` import from entities

#### Data Fetching
- Added query to fetch all leagues
- Stored in `allLeagues` array

#### Form State Management
- Added `selectedLeagueId` to watch form changes
- Updated `filteredLeagues` - filters leagues by selected sport
- Updated `filteredSeasons` - filters seasons by sport AND league

#### Table Columns
- Added "League" column between "Sport" and "Season"
- Displays league's secondaryName or originalName
- Sortable by leagueId
- Width: 180px

#### Form
- Added League dropdown as 2nd field (after Sport)
- League dropdown:
  - Disabled until sport is selected
  - Filters leagues by selected sport
  - Shows secondaryName or originalName
  - Required field with validation
- Season dropdown:
  - Now disabled until league is selected (changed from sport)
  - Filters seasons by both sport AND league

#### Form Handlers
- `handleEdit()`: Added leagueId to reset values
- `onSubmit()`: Added leagueId to payload

## Cascade Filtering Logic

The form now implements proper cascade filtering:

1. **Sport Selection**
   - User selects a sport
   - League dropdown becomes enabled
   - League dropdown shows only leagues for selected sport
   - Season and Club dropdowns remain disabled

2. **League Selection**
   - User selects a league (filtered by sport)
   - Season dropdown becomes enabled
   - Season dropdown shows only seasons for selected sport AND league

3. **Season Selection**
   - Group dropdown becomes enabled (if season has groups)

4. **Club Selection**
   - Club dropdown is filtered by sport (via sport_clubs)
   - Shows only clubs associated with the selected sport

## Data Flow

```
Sport → League → Season → Club + Group
  ↓       ↓        ↓        ↓      ↓
 All → Filter → Filter → Filter  Filter
        by        by       by      by
      sportId  leagueId  sportId  seasonId
```

## Testing

Both backend and frontend are running successfully:
- Backend: http://localhost:3000
- Frontend: http://localhost:3001
- Swagger docs: http://localhost:3000/api

To test the implementation:
1. Navigate to http://localhost:3001/admin/season-clubs
2. Click "Add Season Club"
3. Select a Sport (e.g., Basketball)
4. League dropdown should populate with leagues for that sport (e.g., NBA)
5. Select a League
6. Season dropdown should populate with seasons for that sport and league
7. Select Season and Club
8. Click Create

## Database State

The migration was successfully applied. The `season_clubs` table now has:
- `league_id` column (integer, NOT NULL)
- Foreign key constraint to `leagues.id`

All existing season_clubs records will need to have their `league_id` populated before they can be displayed correctly.

## Next Steps

1. **Data Migration**: Update existing `season_clubs` records to populate `league_id` based on their season's league
2. **Seed Data Update**: Update seed.ts to include `leagueId` when creating season_clubs associations
3. **Testing**: Verify all CRUD operations work correctly with the new field
4. **Documentation**: Update API documentation with new field requirements

## Files Modified

### Backend
1. `drizzle/0021_add_league_id_to_season_clubs.sql` (NEW)
2. `src/db/schema.ts`
3. `src/season-clubs/dto/create-season-club.dto.ts`
4. `src/season-clubs/dto/update-season-club.dto.ts`
5. `src/season-clubs/dto/season-club-response.dto.ts`
6. `src/season-clubs/season-clubs.service.ts`

### Frontend
7. `lib/api/types.ts`
8. `app/admin/season-clubs/page.tsx`

## Total Changes
- 1 new migration file
- 7 files modified
- ~200 lines of code added/modified
