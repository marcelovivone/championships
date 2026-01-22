# API Quick Reference Guide

## Base URL
```
http://localhost:3000
```

---

## 🏆 Matches API

### Get Matches
```bash
# Get all matches
GET /matches

# Get matches by phase
GET /matches?phaseId=1

# Get matches by group
GET /matches?groupId=5

# Get matches by round
GET /matches?roundId=3

# Get single match
GET /matches/123
```

### Manage Matches
```bash
# Create match
POST /matches
Body: {
  "groupId": 1,
  "homeClubId": 10,
  "awayClubId": 15,
  "roundId": 2,
  "scheduledDate": "2026-02-15T19:00:00Z"
}

# Update match
PUT /matches/123
Body: {
  "status": "ongoing",
  "scheduledDate": "2026-02-15T20:00:00Z"
}

# Update match score
PUT /matches/123/score
Body: {
  "homeScore": 2,
  "awayScore": 1,
  "homeScoreOvertime": null,
  "awayScoreOvertime": null,
  "homeScorePenalties": null,
  "awayScorePenalties": null
}

# Delete match
DELETE /matches/123
```

---

## 🏅 Leagues API

### Get Leagues
```bash
# Get all leagues
GET /leagues

# Get leagues by sport
GET /leagues?sportId=1

# Get single league
GET /leagues/5
```

### Manage Leagues
```bash
# Create league
POST /leagues
Body: {
  "name": "Serie A",
  "country": "Italy",
  "sportId": 1
}

# Update league
PUT /leagues/5
Body: {
  "name": "Serie A 2026",
  "country": "Italy"
}

# Delete league
DELETE /leagues/5
```

### League Partnerships
```bash
# Add league link (partnership/franchise)
POST /leagues/1/links/2
Body: {
  "linkType": "franchise"
}

# Remove league link
DELETE /leagues/1/links/2
```

---

## 📅 Phases API

### Get Phases
```bash
# Get all phases
GET /phases

# Get phases by season
GET /phases?seasonId=1

# Get single phase
GET /phases/3
```

### Manage Phases
```bash
# Create phase
POST /phases
Body: {
  "seasonId": 1,
  "name": "Group Stage",
  "order": 1
}

# Update phase
PUT /phases/3
Body: {
  "name": "Knockout Stage",
  "order": 2
}

# Delete phase
DELETE /phases/3
```

---

## 👥 Groups API

### Get Groups
```bash
# Get all groups
GET /groups

# Get groups by phase
GET /groups?phaseId=1

# Get groups by round
GET /groups?roundId=2

# Get single group
GET /groups/7
```

### Manage Groups
```bash
# Create group
POST /groups
Body: {
  "phaseId": 1,
  "name": "Group A",
  "roundId": 2
}

# Update group
PUT /groups/7
Body: {
  "name": "Group A Final",
  "phaseId": 1
}

# Delete group
DELETE /groups/7
```

---

## 🎯 Match Divisions API

### Get Divisions
```bash
# Get all divisions
GET /match-divisions

# Get divisions by match
GET /match-divisions?matchId=123

# Get single division
GET /match-divisions/45
```

### Manage Divisions
```bash
# Create division (period/quarter/set)
POST /match-divisions
Body: {
  "matchId": 123,
  "divisionNumber": 1,
  "homeScore": 2,
  "awayScore": 1
}

# Update division
PUT /match-divisions/45
Body: {
  "homeScore": 3,
  "awayScore": 1
}

# Delete division
DELETE /match-divisions/45
```

---

## 📋 Match Events API

### Get Events
```bash
# Get all events
GET /match-events

# Get events by match
GET /match-events?matchId=123

# Get single event
GET /match-events/789
```

### Manage Events
```bash
# Create event (goal/card/substitution)
POST /match-events
Body: {
  "matchId": 123,
  "clubId": 10,
  "divisionId": 45,
  "type": "goal",
  "minute": 45,
  "playerInfo": "John Doe",
  "description": "Penalty kick goal"
}

# Update event
PUT /match-events/789
Body: {
  "minute": 46,
  "description": "Updated description"
}

# Delete event
DELETE /match-events/789
```

---

## 🏆 Standings API

### Get Standings
```bash
# Get all standings
GET /standings

# Get standings by league
GET /standings?leagueId=1

# Get standings by league and round
GET /standings?leagueId=1&roundId=3

# Get single standing
GET /standings/101
```

### Manage Standings
```bash
# Create standing entry
POST /standings
Body: {
  "phaseId": 1,
  "groupId": 5,
  "clubId": 10,
  "roundId": 2,
  "points": 3,
  "played": 1,
  "wins": 1,
  "draws": 0,
  "losses": 0,
  "goalsFor": 2,
  "goalsAgainst": 1,
  "goalDifference": 1
}

# Update standing
PUT /standings/101
Body: {
  "points": 6,
  "played": 2,
  "wins": 2,
  "goalsFor": 5,
  "goalsAgainst": 1,
  "goalDifference": 4
}

# Delete standing
DELETE /standings/101
```

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 204 | No Content - Delete successful |
| 400 | Bad Request - Invalid data or validation error |
| 404 | Not Found - Resource doesn't exist |

---

## Error Responses

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Match with ID 999 not found",
  "error": "Not Found"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Cannot delete match. Match divisions are recorded.",
  "error": "Bad Request"
}
```

---

## Query Parameter Examples

### Match Filtering
```bash
# Most specific filter wins
GET /matches?phaseId=1&groupId=5  # Returns group 5 matches
GET /matches?phaseId=1&roundId=2  # Returns round 2 matches
```

### Standing Filtering
```bash
# League-specific standings
GET /standings?leagueId=1

# League and round specific
GET /standings?leagueId=1&roundId=3
```

### League Filtering
```bash
# Sport-specific leagues
GET /leagues?sportId=1
```

---

## Common Request Patterns

### Create Resource
```bash
POST /resource
Content-Type: application/json
Body: { required fields }

Response: 201 Created
Location: /resource/123
Body: { created object }
```

### Update Resource
```bash
PUT /resource/123
Content-Type: application/json
Body: { fields to update }

Response: 200 OK
Body: { updated object }
```

### Delete Resource
```bash
DELETE /resource/123

Response: 204 No Content
Body: (empty)
```

### List Resources
```bash
GET /resource
GET /resource?filterId=value

Response: 200 OK
Body: [ array of objects ]
```

---

## Example Workflows

### Complete Match Workflow
```bash
# 1. Create match
POST /matches
Body: { groupId: 1, homeClubId: 10, awayClubId: 15, scheduledDate: "..." }
Response: 201 Created, id: 123

# 2. Create divisions (periods/sets/quarters)
POST /match-divisions
Body: { matchId: 123, divisionNumber: 1, homeScore: 0, awayScore: 0 }

# 3. Create events during match
POST /match-events
Body: { matchId: 123, clubId: 10, type: "goal", minute: 15, playerInfo: "..." }

# 4. Update divisions with scores
PUT /match-divisions/45
Body: { homeScore: 1, awayScore: 0 }

# 5. Finalize match with total score
PUT /matches/123/score
Body: { homeScore: 2, awayScore: 1 }

# 6. Check standings updated
GET /standings?leagueId=1
```

### League Management Workflow
```bash
# 1. Create league
POST /leagues
Body: { name: "Serie A", country: "Italy", sportId: 1 }
Response: 201 Created, id: 5

# 2. Link to partner league
POST /leagues/5/links/6
Body: { linkType: "franchise" }

# 3. View linked leagues
GET /leagues/5

# 4. Remove link if needed
DELETE /leagues/5/links/6
```

### Phase Management Workflow
```bash
# 1. Create phase
POST /phases
Body: { seasonId: 1, name: "Group Stage", order: 1 }
Response: 201 Created, id: 3

# 2. Create groups for phase
POST /groups
Body: { phaseId: 3, name: "Group A", roundId: 2 }

# 3. Get all groups in phase
GET /groups?phaseId=3

# 4. Create matches for groups
POST /matches
Body: { groupId: 7, homeClubId: 10, awayClubId: 15 }

# 5. Get matches for phase
GET /matches?phaseId=3
```

---

## Tips & Best Practices

1. **Always provide required fields** - API validates all inputs
2. **Use query parameters for filtering** - More efficient than fetching all
3. **Handle cascading deletions** - Some resources can't be deleted if children exist
4. **Check response codes** - 400/404 indicate errors with details
5. **Use POST for creation** - Always use correct HTTP method
6. **Verify foreign keys exist** - API validates all relationships
7. **Round scores must be positive** - API validates numeric ranges
8. **Update using PUT** - Partial updates replace the entire resource

---

## Rate Limiting

Currently no rate limiting. To be added in Phase 4.

---

## Authentication

Currently no authentication required. To be added in Phase 4.

---

## CORS

CORS configuration available. Add to AppModule as needed.

---

## Pagination

Not yet implemented. To be added in Phase 4.

---

For more details, see API documentation or contact the development team.
