# Season Clubs Page - Transfer List Implementation

## Overview
The Season Clubs page has been completely redesigned to follow the same pattern as Sport Clubs page, using a transfer list interface instead of a simple form. This provides a better user experience when managing multiple clubs for a season.

## Key Features

### 1. Cascade Selection
The page implements a three-level cascade selection:
- **Sport** → **League** → **Season**

Each selection filters the next dropdown:
- Select Sport → Leagues filtered by sport
- Select League → Seasons filtered by league
- Select Season → Shows transfer lists for clubs

### 2. Transfer Lists
Similar to Sport Clubs page, the interface provides:
- **Available Clubs** (left side): Shows clubs that are registered for the selected sport but not yet assigned to the season
- **Assigned Clubs** (right side): Shows clubs already assigned to the selected season
- **Transfer buttons**: Move clubs between the two lists using arrow buttons

### 3. Group Assignment
When clubs are assigned to a season, if the season has groups configured:
- Each assigned club shows a dropdown to select its group
- Groups are optional (can be left as "No group")
- Groups are filtered by the selected season

### 4. Change Tracking
- The system tracks unsaved changes
- "Save Changes" and "Cancel" buttons are only enabled when there are pending changes
- Changing sport/league/season with unsaved changes prompts a confirmation

## User Flow

### Step 1: Select Sport
1. User opens the Season Clubs page
2. Sees message: "Please select a sport to begin"
3. Clicks on Sport dropdown
4. Selects a sport (e.g., Basketball)

### Step 2: Select League
1. League dropdown becomes enabled
2. Shows only leagues for the selected sport (e.g., NBA, FIBA)
3. User selects a league (e.g., NBA)

### Step 3: Select Season
1. Season dropdown becomes enabled
2. Shows only seasons for the selected league (e.g., 2025/2026, 2024/2025)
3. User selects a season (e.g., 2025/2026)

### Step 4: Manage Clubs
1. Transfer lists appear
2. **Available Clubs** shows clubs registered for Basketball but not in NBA 2025/2026
3. **Assigned Clubs** shows clubs already in NBA 2025/2026
4. User can:
   - Click clubs in Available list to select them (turns blue)
   - Click right arrow button to move selected clubs to Assigned
   - Click clubs in Assigned list to select them
   - Click left arrow button to move them back to Available
   - For each assigned club, select a group from the dropdown (if season has groups)

### Step 5: Save Changes
1. After making changes, "Save Changes" button becomes enabled
2. Click "Save Changes" to persist changes to database
3. System deletes all existing season-club associations for this season
4. Creates new associations for all clubs in Assigned list with their group assignments
5. Shows success message

### Step 6: Cancel Changes (Optional)
- Click "Cancel" to discard changes
- System reloads data from server and resets the lists

## Implementation Details

### Component Structure
```typescript
interface ClubWithGroup {
  club: Club;
  groupId?: number;
}
```

### State Management
- `selectedSportId`: Currently selected sport
- `selectedLeagueId`: Currently selected league
- `selectedSeasonId`: Currently selected season
- `availableClubs`: Array of clubs not yet assigned
- `assignedClubs`: Array of ClubWithGroup objects
- `groupAssignments`: Record mapping clubId → groupId
- `hasChanges`: Boolean tracking if user has made changes

### Data Fetching
- Sports: All sports (no filter)
- Leagues: All leagues, filtered by sport in UI
- Seasons: All seasons, filtered by league in UI
- Clubs: All clubs
- Groups: All groups, filtered by season in UI
- Sport-Clubs: Associations for selected sport (to filter available clubs)
- Season-Clubs: Associations for selected season (to populate assigned clubs)

### Save Logic
```typescript
1. Delete all existing season_clubs for this season
2. For each club in assignedClubs:
   - Create season_club with:
     - sportId
     - leagueId
     - seasonId
     - clubId
     - groupId (optional)
3. Invalidate cache and refetch
```

## Visual Design

### Layout
```
┌─────────────────────────────────────────────────────┐
│ Season Clubs Management                              │
│ Assign clubs to seasons with optional group         │
│ assignments                                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [Sport ▼]  [League ▼]  [Season ▼]                  │
│                                                      │
│ ┌──────────────┐  ┌──┐  ┌──────────────┐          │
│ │ Available    │  │→ │  │ Assigned     │          │
│ │ Clubs (10)   │  │← │  │ Clubs (20)   │          │
│ │              │  └──┘  │              │          │
│ │ □ Club A     │        │ ☑ Club X     │          │
│ │ □ Club B     │        │  [Group ▼]   │          │
│ │ ☑ Club C     │        │              │          │
│ │   ...        │        │ □ Club Y     │          │
│ │              │        │  [Group ▼]   │          │
│ └──────────────┘        └──────────────┘          │
│                                                      │
│                     [Cancel] [Save Changes]         │
└─────────────────────────────────────────────────────┘
```

### Color Scheme
- Selected clubs (Available): Blue background (#2563eb)
- Selected clubs (Assigned): Light blue background with blue border
- Hover: Gray background
- Assigned club cards: White background with border

## Differences from Sport Clubs

| Feature | Sport Clubs | Season Clubs |
|---------|------------|--------------|
| Selection | Sport only | Sport → League → Season |
| Filters | None | Cascade filters |
| Group Assignment | No | Yes (optional) |
| Data Source | All clubs | Clubs filtered by sport |

## Benefits

### For Users
1. **Visual Interface**: Easier to see what clubs are available vs assigned
2. **Bulk Operations**: Can select and move multiple clubs at once
3. **Group Management**: Assign groups directly without extra clicks
4. **Clear Feedback**: Unsaved changes are clearly indicated

### For Administrators
1. **Consistency**: Same pattern as Sport Clubs page
2. **Less Errors**: Visual interface prevents duplicate assignments
3. **Faster**: Manage all clubs for a season in one operation

## Technical Requirements

### Backend API
The implementation uses these endpoints:
- `GET /v1/sports` - List all sports
- `GET /v1/leagues` - List all leagues
- `GET /v1/seasons` - List all seasons
- `GET /v1/clubs` - List all clubs
- `GET /v1/groups` - List all groups
- `GET /v1/sport-clubs/sport/:sportId` - Get clubs for a sport
- `GET /v1/season-clubs/season/:seasonId` - Get clubs for a season
- `POST /v1/season-clubs` - Create season-club association
- `DELETE /v1/season-clubs/:id` - Delete season-club association

### Frontend Dependencies
- React Query for data fetching
- React state management for UI state
- Lucide icons for arrows and loading spinner
- Tailwind CSS for styling

## Future Enhancements

1. **Drag and Drop**: Add drag-and-drop support for moving clubs
2. **Search/Filter**: Add search box to filter clubs by name
3. **Bulk Group Assignment**: Select multiple clubs and assign same group
4. **Import/Export**: Import club list from previous season
5. **Validation**: Warn if assigning clubs without group when groups exist
