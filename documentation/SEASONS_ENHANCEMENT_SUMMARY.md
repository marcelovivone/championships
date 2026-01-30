# Seasons Table Enhancement - Implementation Summary

## Date
January 25, 2026

## Overview
Enhanced the Seasons table with three new fields and implemented business logic to ensure only one default season exists per league.

## Database Schema Changes

### New Fields Added to `seasons` Table

1. **flgDefault** (boolean, default: false)
   - Indicates if this season is the default season for its league
   - Only one season per league can have `flgDefault = true`

2. **clubId** (integer, nullable)
   - Foreign key reference to `clubs` table
   - Represents the champion club of the season
   - Can be null if no champion has been determined

3. **numberOfGroups** (integer, default: 0)
   - Number of groups in the season
   - Must be 0 or greater
   - Used for tournament/league organization

### Existing Fields Modified

- Removed: `name`, `startDate`, `endDate`, `year`, `updatedAt`
- Changed: `year` split into `startYear` and `endYear` (separate integer fields)
- Added: `status` enum field ('planned', 'active', 'finished')

## Backend Implementation

### Files Modified

1. **backend/src/db/schema.ts**
   - Added three new columns to seasons table
   - Added foreign key constraint for clubId

2. **backend/src/common/dtos/season.dto.ts**
   - Complete rewrite with new fields
   - Added validation decorators:
     - `@IsInt()`, `@Min()`, `@Max()` for year fields
     - `@IsBoolean()` for flgDefault
     - `@IsOptional()`, `@IsInt()` for clubId
     - `@IsOptional()`, `@IsInt()`, `@Min(0)` for numberOfGroups
     - `@IsEnum()` for status field

3. **backend/src/seasons/seasons.service.ts**
   - Implemented `findDefaultSeasonByLeague()` method
   - Enhanced `create()` method with default flag conflict detection
   - Enhanced `update()` method with default flag conflict detection
   - Added `changeDefaultSeason()` method for manual default switching
   - Added validation for club existence when clubId is provided
   - Throws `ConflictException` when trying to set a season as default when another default exists

### Business Logic

The service implements the following validation rules:

1. **On Create:**
   - Validates league exists
   - Validates club exists (if clubId provided)
   - Checks for existing default season in the same league
   - Throws ConflictException with existing season details if conflict found

2. **On Update:**
   - Validates club exists (if clubId being updated)
   - Checks for existing default season when trying to change flgDefault to true
   - Throws ConflictException with existing season details if conflict found

3. **Conflict Response:**
   ```json
   {
     "statusCode": 409,
     "message": "Another season is already set as default for this league",
     "existingDefaultSeason": {
       "id": 5,
       "startYear": 2023,
       "endYear": 2024
     },
     "leagueName": "NHL"
   }
   ```

## Frontend Implementation

### Files Modified

1. **frontend/lib/api/types.ts**
   - Updated `Season` interface with new fields
   - Created `CreateSeasonDto` interface
   - Created `UpdateSeasonDto` interface

2. **frontend/app/admin/seasons/page.tsx**
   - Complete rewrite of the seasons admin page
   - Added form fields for all new attributes
   - Implemented confirmation dialog for default season changes

### User Interface Features

1. **Season List Table:**
   - Display season as "StartYear/EndYear" format
   - Status badge with color coding (planned/active/finished)
   - Default flag indicator (yellow badge for "Yes")
   - Number of groups column
   - Sortable columns

2. **Season Form:**
   - League dropdown (required)
   - Start Year input (required, 1900-2100)
   - End Year input (required, 1900-2100)
   - Status dropdown (planned/active/finished)
   - Default checkbox
   - Champion Club dropdown (optional)
   - Number of Groups input (min: 0)

3. **Confirmation Dialog:**
   - Triggered when user tries to set a season as default and another default exists
   - Shows existing default season name and league
   - Two options:
     - "Yes, change default" - Proceeds with the change
     - "No, keep current default" - Saves the season with flgDefault = false
   - Dialog text: "The {existingSeasonName} is currently the default season for the league {leagueName}. Do you want to change it?"

### Error Handling

- Frontend catches 409 Conflict responses from backend
- Displays confirmation dialog with existing season details
- Allows user to decide whether to proceed or cancel
- Re-submits form with adjusted flgDefault value based on user choice

## Migration

**Migration File:** Not generated (schema changes applied directly via drizzle-kit push)

**Applied:** ✅ January 25, 2026

The migration adds:
- `flg_default` boolean column (default: false)
- `club_id` integer column (nullable, FK to clubs)
- `number_of_groups` integer column (default: 0)

## Testing Recommendations

1. **Create Season:**
   - ✅ Create season with flgDefault = false
   - ✅ Create season with flgDefault = true (first default for league)
   - ✅ Try to create second default season for same league (should trigger conflict)
   - ✅ Create season with valid clubId
   - ✅ Try to create season with invalid clubId (should fail)
   - ✅ Create season with numberOfGroups = 0
   - ✅ Try to create season with numberOfGroups < 0 (should fail validation)

2. **Update Season:**
   - ✅ Update season fields (startYear, endYear, status, etc.)
   - ✅ Change flgDefault from false to true when no other default exists
   - ✅ Try to change flgDefault to true when another default exists (should trigger conflict)
   - ✅ Update clubId to valid club
   - ✅ Clear clubId (set to null)
   - ✅ Update numberOfGroups

3. **Frontend Confirmation Dialog:**
   - ✅ Test "Yes, change default" option
   - ✅ Test "No, keep current default" option
   - ✅ Verify dialog shows correct season names and league

## API Endpoints

No new endpoints added. Existing endpoints updated:

- `POST /seasons` - Create season (with conflict detection)
- `PUT /seasons/:id` - Update season (with conflict detection)
- `GET /seasons` - List seasons (returns new fields)
- `GET /seasons/:id` - Get season details (returns new fields)

## Database State

After migration:
- All existing seasons have `flgDefault = false`
- All existing seasons have `clubId = null`
- All existing seasons have `numberOfGroups = 0`

Administrators can manually update seasons to set appropriate defaults.

## Notes

- Only ONE season per league can have `flgDefault = true` at any time
- The backend enforces this constraint via business logic (not database constraint)
- The confirmation dialog provides a user-friendly way to handle conflicts
- clubId is optional and can be set after the season finishes
- numberOfGroups is useful for tournament-style seasons with group stages
- Status field helps track season lifecycle (planned → active → finished)

## Files Changed

### Backend (3 files)
- `backend/src/db/schema.ts`
- `backend/src/common/dtos/season.dto.ts`
- `backend/src/seasons/seasons.service.ts`

### Frontend (2 files)
- `frontend/lib/api/types.ts`
- `frontend/app/admin/seasons/page.tsx`

### Total: 5 files modified
