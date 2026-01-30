# Type of Schedule Implementation

## Overview
Added the `type_of_schedule` attribute to the `leagues` table to support different types of sports scheduling:
- **Round**: For round-based leagues (e.g., Premier League, La Liga)
- **Date**: For date-based leagues (e.g., NBA, NHL, OHL)

## Changes Made

### 1. Database Migration
**File**: `backend/drizzle/0022_add_type_of_schedule_to_leagues.sql`
- Added `type_of_schedule` column (VARCHAR(10), NOT NULL, DEFAULT 'Round')
- Added CHECK constraint to ensure only 'Round' or 'Date' values
- Made `number_of_rounds` nullable (was NOT NULL)

### 2. Backend Schema
**File**: `backend/src/db/schema.ts`
- Added `typeOfSchedule` field to leagues table definition
- Updated `numberOfRounds` to be nullable

### 3. Backend DTOs
**File**: `backend/src/common/dtos/league.dto.ts`
- Added `typeOfSchedule` field to `CreateLeagueDto` with enum validation
- Made `numberOfRounds` optional (required only when typeOfSchedule = 'Round')

### 4. Frontend Types
**Files**: 
- `frontend/lib/api/types.ts` (League interface)
- `frontend/lib/api/types.ts` (CreateLeagueDto interface)

Changes:
- Added `typeOfSchedule: 'Round' | 'Date'` field
- Made `numberOfRounds` optional

### 5. Frontend Leagues Form
**File**: `frontend/app/admin/leagues/page.tsx`

Changes:
- Added Type of Schedule dropdown (Line 3, column 1)
- Made Rounds field conditional:
  - Required when Type of Schedule = 'Round'
  - Disabled and set to 0/undefined when Type of Schedule = 'Date'
- Added validation logic in `onSubmit`:
  - If Round: numberOfRounds required and > 0
  - If Date: numberOfRounds must be 0 or empty
- Updated table columns to display Type of Schedule
- Updated all reset/handleEdit functions to include typeOfSchedule

### 6. Data Table Display
Added new column to leagues table:
- **Schedule**: Shows 'Round' or 'Date'
- **Rounds**: Shows number of rounds or '-' if not applicable

## Usage

### Creating a Round-Based League (Premier League)
1. Set Type of Schedule to "Round"
2. Enter Number of Rounds (e.g., 38)
3. Rounds field is enabled and required

### Creating a Date-Based League (NBA/NHL)
1. Set Type of Schedule to "Date"
2. Rounds field is disabled and automatically set to N/A
3. Matches are scheduled by date ranges instead of rounds

## Validation Rules

1. **Type of Schedule = Round**:
   - `numberOfRounds` must be provided and greater than 0
   - Backend validates this is required

2. **Type of Schedule = Date**:
   - `numberOfRounds` must be 0 or null/undefined
   - Frontend disables the field
   - Backend accepts null/undefined

## Migration Applied
✅ Migration successfully applied to database using `npm run migration:push`

## Testing Checklist

- [ ] Create new Round-based league (Premier League style)
- [ ] Create new Date-based league (NBA/NHL style)
- [ ] Edit existing league and change type of schedule
- [ ] Verify validation when Type = Round but Rounds = 0
- [ ] Verify validation when Type = Date but Rounds > 0
- [ ] Verify table displays Schedule column correctly
- [ ] Verify existing leagues show default value "Round"

## Related Files
- Migration: `backend/drizzle/0022_add_type_of_schedule_to_leagues.sql`
- Schema: `backend/src/db/schema.ts` (lines 114-125)
- DTO: `backend/src/common/dtos/league.dto.ts` (lines 38-46)
- Types: `frontend/lib/api/types.ts` (League interface, CreateLeagueDto)
- Form: `frontend/app/admin/leagues/page.tsx`

## Next Steps
1. Test the implementation with real data
2. Update seed data to include Type of Schedule for existing leagues
3. Implement conditional logic in Rounds and Matches based on league type
4. Add date-based scheduling UI for Date-type leagues
