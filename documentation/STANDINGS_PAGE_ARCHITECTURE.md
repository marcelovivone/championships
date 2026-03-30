# Standings Page — Architecture & Implementation Guide

> **Purpose**: This document describes the complete architecture of the Football Standings page (`/common/standings/football`), including every component, their props, state, data flow, and key implementation decisions. It is intended as a **blueprint for creating equivalent pages for other sports** (Basketball, Handball, Futsal, Ice Hockey, Volleyball).
>
> **Written**: 2026-03-30  
> **Covers**: `frontend/app/common/standings/football/page.tsx`, `BaseStandings.tsx`, `FilterBar.tsx`, `StandingsTable.tsx`, `GamesList.tsx`

---

## Table of Contents

1. [URL Structure & Entry Points](#1-url-structure--entry-points)
2. [Component Tree](#2-component-tree)
3. [Sport Page (`football/page.tsx`)](#3-sport-page-footballpagetsx)
4. [BaseStandings — Orchestrator Component](#4-basestandings--orchestrator-component)
   - 4.1 [Props](#41-props)
   - 4.2 [State](#42-state)
   - 4.3 [React Query calls](#43-react-query-calls)
   - 4.4 [Schedule type detection (`scheduleIsDate`)](#44-schedule-type-detection-scheduleisdate)
   - 4.5 [Round / season auto-selection](#45-round--season-auto-selection)
   - 4.6 [Club name resolution (`clubsMap`)](#46-club-name-resolution-clubsmap)
   - 4.7 [Historical matches for Last-5/Last-10](#47-historical-matches-for-last-5last-10)
   - 4.8 [Render layout](#48-render-layout)
5. [FilterBar Component](#5-filterbar-component)
   - 5.1 [Props](#51-props)
   - 5.2 [TopRow — League / Season / Round or Date](#52-toprow--league--season--round-or-date)
   - 5.3 [BottomRow — ViewType + Groups](#53-bottomrow--viewtype--groups)
   - 5.4 [Groups loading](#54-groups-loading)
6. [StandingsTable Component](#6-standingstable-component)
   - 6.1 [Props](#61-props)
   - 6.2 [Row sorting](#62-row-sorting)
   - 6.3 [Columns](#63-columns)
   - 6.4 [ViewType switching (Home / Away)](#64-viewtype-switching-home--away)
   - 6.5 [Last-5 and Last-10 computation](#65-last-5-and-last-10-computation)
7. [GamesList Component](#7-gameslist-component)
   - 7.1 [Props](#71-props)
   - 7.2 [Date/Time display](#72-datetime-display)
   - 7.3 [Timezone conversion (`storedLocalToUserTimezone`)](#73-timezone-conversion-storedlocaltousertimezone)
   - 7.4 [COUNTRY_TIMEZONES map](#74-country_timezones-map)
   - 7.5 [Match card layout](#75-match-card-layout)
8. [API Endpoints Used](#8-api-endpoints-used)
9. [Data Shapes](#9-data-shapes)
   - 9.1 [League object](#91-league-object)
   - 9.2 [Season object](#92-season-object)
   - 9.3 [Round object](#93-round-object)
   - 9.4 [Match object](#94-match-object)
   - 9.5 [Standings row object](#95-standings-row-object)
10. [Date Storage Convention](#10-date-storage-convention)
11. [Key Design Decisions](#11-key-design-decisions)
12. [Creating a Page for a New Sport](#12-creating-a-page-for-a-new-sport)
    - 12.1 [Steps](#121-steps)
    - 12.2 [Sport-specific differences to watch for](#122-sport-specific-differences-to-watch-for)

---

## 1. URL Structure & Entry Points

```
/common/standings/                       → StandingsIndex — sport selector grid
/common/standings/football/              → FootballStandingsPage
/common/standings/basketball/            → (pending)
/common/standings/futsal/                → (pending)
/common/standings/handball/              → (pending)
/common/standings/ice-hockey/            → (pending)
/common/standings/volleyball/            → (pending)
```

**Files**:
```
frontend/app/common/standings/page.tsx                  ← index (sport selector)
frontend/app/common/standings/football/page.tsx          ← football entry
frontend/components/common/standings/BaseStandings.tsx   ← shared orchestrator
frontend/components/common/standings/FilterBar.tsx       ← controls
frontend/components/common/standings/StandingsTable.tsx  ← league table
frontend/components/common/standings/GamesList.tsx       ← scores & fixtures
frontend/components/common/standings/mockData.ts         ← fallback mock data
```

---

## 2. Component Tree

```
FootballStandingsPage (Next.js page, client component)
└── BaseStandings (orchestrator, React Query queries, all state)
    ├── FilterBar [top bar]    (League, Season, Round/Date selectors)
    ├── StandingsTable         (league table with Last-5 / Last-10)
    ├── FilterBar [inline]     (ViewType, Group selector — inside STANDING header area)
    └── GamesList              (scores & fixtures panel)
```

---

## 3. Sport Page (`football/page.tsx`)

**File**: `frontend/app/common/standings/football/page.tsx`

This is the Next.js page component. Its sole job is:
1. Resolve the Football `sportId` from the sports API
2. Fetch all leagues for that sport
3. Pass `sportId`, `leagues`, and `initialLeagueId` into `BaseStandings`

```tsx
// 1. Fetch all sports → find Football
const { data: sportsData } = useQuery({ queryKey: ['sports'], queryFn: () => sportsApi.getAll({ page: 1, limit: 200 }) });
const football = sports.find(s => s.name?.toLowerCase() === 'football' || s.reducedName?.toLowerCase() === 'fb');
const sportId = football?.id ?? null;

// 2. Fetch all leagues for Football
const { data: leaguesData } = useQuery({
  queryKey: ['leagues', sportId],
  queryFn: () => leaguesApi.getBySport(sportId),
  enabled: Boolean(sportId),
});

// 3. Render
return (
  <BaseStandings
    title="Standings — Football"
    hasGroups
    standings={mockStandings}    // fallback data; real data fetched inside BaseStandings
    games={mockGames}             // fallback data
    leagues={leagues}
    initialLeagueId={defaultLeague?.id}
    sportId={sportId}
  />
);
```

**For a new sport**, this file needs to be copied and two strings changed:
- The sport name / `reducedName` used in `sports.find()`
- The `title` prop

---

## 4. BaseStandings — Orchestrator Component

**File**: `frontend/components/common/standings/BaseStandings.tsx`

This is the heavy component. It owns all state, fires all React Query calls, and renders the two-column layout.

### 4.1 Props

| Prop | Type | Purpose |
|------|------|---------|
| `title` | `string` | H1 heading |
| `hasGroups` | `boolean` | Whether to show the Groups dropdown in FilterBar |
| `standings` | `any[]` | Fallback mock standings (shown only if React Query hasn't returned data) |
| `games` | `any[]` | Fallback mock games |
| `leagues` | `any[]` | Full leagues list (with `country`, `typeOfSchedule`, etc.) from sport page |
| `initialLeagueId` | `number \| string` | The default league to pre-select |
| `sportId` | `number \| null` | Passed through to match API calls |

### 4.2 State

| State variable | Type | Purpose |
|---------------|------|---------|
| `season` | `string` | Selected season ID |
| `league` | `string` | Selected league ID |
| `roundOrDay` | `number \| string` | Current round number OR ISO date string (date-based leagues) |
| `debouncedRoundOrDay` | `number \| string` | Debounced (300ms) copy of `roundOrDay` — controls query firing |
| `displayRoundForStandings` | `number \| string` | Last round/day that had standings rows — shown in header |
| `viewType` | `'all' \| 'home' \| 'away'` | Controls home/away split in StandingsTable |
| `group` | `string` | Selected group ID (`'all'` = no filter) |
| `showUserTimezone` | `boolean` | Whether GamesList shows times in user's local timezone |
| `clubsMap` | `Record<string, string>` | Maps clubId → short display name |
| `autoSeasonLeagueRef` | `React.Ref<string>` | Tracks which league we last auto-selected a season for (prevents overwriting user's season choice on refetch) |

### 4.3 React Query calls

| Query key | API URL | Purpose |
|-----------|---------|---------|
| `['seasons', league]` | `GET /v1/seasons?leagueId={league}` (via `seasonsApi.getByLeague`) | Season list for selected league |
| `['rounds', league, season]` | `GET /v1/rounds?leagueId=…&seasonId=…` | All rounds — used to translate round number → round DB id |
| `['standings', league, season, round, group, viewType]` | `GET /v1/standings?…` | Standings rows for the selected round/day |
| `['matches', sportId, league, season, round, group, viewType]` | `GET /v1/matches?…` | Matches in the selected round/day |
| `['matchesAll', sportId, league, season]` | `GET /v1/matches?leagueId=…&seasonId=…` | All matches in the season (for Last-5/Last-10 computation) |

**Important**: Standings and matches both fetch by **round DB id**, not round number. Before making the request, `BaseStandings` translates the displayed `roundOrDay` number to the corresponding `rounds.id` from the rounds query cache. This ensures the correct season's rounds are used even when multiple seasons have the same round numbers.

**Rate-limit protection**: Checks `(globalThis as any).__apiCooldownUntil` before firing queries and returns `[]` if the cooldown is active.

### 4.4 Schedule type detection (`scheduleIsDate`)

Some leagues (e.g. knockout tournaments, date-based competitions) navigate by **date** rather than by **round number**. `BaseStandings` detects this from the selected league's metadata:

```typescript
const rawSchedule = selectedLeague?.typeOfSchedule ?? selectedLeague?.type_of_schedule ?? ...;
const scheduleIsDate = scheduleStr.includes('date') || scheduleStr.includes('day') ||
                       scheduleStr === '1' || scheduleStr === 'date_based';
```

When `scheduleIsDate = true`:
- `roundOrDay` holds an ISO date string (`'2026-04-01'`)
- FilterBar shows a date picker with ◀/▶ arrows and a calendar icon
- Standings query uses `?matchDate=…` instead of `?roundId=…`
- Matches query uses `?date=…` instead of `?roundId=…`

When `scheduleIsDate = false` (round-based, the default for football):
- `roundOrDay` holds a round number (integer)
- FilterBar shows a numeric input with ◀/▶ arrows
- Both queries use `?roundId=…` (translated from round number → DB id)

### 4.5 Round / season auto-selection

**Season selection logic** (runs on league change, guarded by `autoSeasonLeagueRef`):
1. When the `league` value changes, `autoSeasonLeagueRef` is reset
2. When seasons load and `autoSeasonLeagueRef !== league`:
   - Picks `seasons.find(s => s.flgDefault) || seasons[0]`
   - Sets `autoSeasonLeagueRef = league` to prevent future refetches from overwriting
3. This means background React Query refetches of seasons data do NOT reset the user's manually selected season

**Round selection logic** (runs on `league` + `season` change):
1. If season is not active (status !== 'active'), default to round 1
2. If season is active, fetch rounds fresh
3. Look for a round with `flgCurrent = true` → use that round number
4. If none found, default to round 1

### 4.6 Club name resolution (`clubsMap`)

The standings API returns rows with `clubId` but often without a display name. `BaseStandings` maintains a `clubsMap: Record<string, string>` (clubId → short name) that is populated from two sources:

1. **From matches**: When `matchesQuery.data` arrives, extract `homeClub` and `awayClub` from each match object
2. **From individual club API calls**: If standings rows reference a `clubId` not yet in the map, fetch `GET /v1/clubs/{id}` for each missing ID (batched via `Promise.all`)

`StandingsTable` receives `clubsMap` as a prop and uses it to look up the display name for each standings row.

**Field priority for display name**: `short_name ?? shortName ?? displayName ?? name ?? originalName ?? ...`

### 4.7 Historical matches for Last-5/Last-10

`StandingsTable` computes the Last-5 and Last-10 statistics from real match data. `BaseStandings` determines which set of matches to pass as "historical":

**For round-based leagues**:
- Uses `roundsQuery.data` to build a set of `eligibleRoundIds` where `roundNumber <= currentRoundNumber`
- Filters `allMatchesQuery.data` to only rounds ≤ current → passes as `historicalMatches`
- This correctly handles **postponed matches** (a round 10 game replayed in round 12's time slot still belongs to round 10 and is included when viewing round 12)

**For date-based leagues**:
- Passes `cutoffDate = String(roundOrDay)` and the full `allMatchesQuery.data`
- `StandingsTable` applies `date <= cutoffDate` filtering internally

### 4.8 Render layout

```
<div>
  <h1>{title}</h1>
  <FilterBar showTop=true showBottom=false />        ← top bar (League, Season, Round/Date)

  <div className="flex flex-col lg:flex-row gap-6">

    {/* Left column: 2/3 width on large screens */}
    <div className="lg:basis-2/3">
      STANDING header + "Round: N" label
      <FilterBar showTop=false showBottom=true compact=true />   ← ViewType + Groups (inline)
      <StandingsTable ... />
    </div>

    {/* Right column: 1/3 width on large screens */}
    <div className="lg:basis-1/3">
      SCORES & FIXTURES header + Local Timezone toggle + "Round: N" label
      <GamesList ... />
    </div>

  </div>
</div>
```

**Responsive breakpoint**: Single column on mobile/tablet (`flex-col`), side-by-side on `lg:` (1024px+).

---

## 5. FilterBar Component

**File**: `frontend/components/common/standings/FilterBar.tsx`

A single component that renders in two modes controlled by `showTop`/`showBottom` props. `BaseStandings` renders it twice: once standalone at the top (`showTop=true, showBottom=false`) and once inline inside the STANDING header (`showTop=false, showBottom=true, compact=true`).

### 5.1 Props

| Prop | Type | Purpose |
|------|------|---------|
| `season` / `setSeason` | `string` / setter | Controlled season selector |
| `league` / `setLeague` | `string` / setter | Controlled league selector |
| `roundOrDay` / `setRoundOrDay` | `number\|string` / setter | Controlled round/date |
| `viewType` / `setViewType` | `'all'\|'home'\|'away'` / setter | Controlled view mode |
| `group` / `setGroup` | `string` / setter | Controlled group filter |
| `hasGroups` | `boolean` | Whether to show group dropdown |
| `leagues` | `any[]` | Full leagues list |
| `seasons` | `any[]` | Seasons for selected league |
| `showTop` | `boolean` | Render the top row (League/Season/Round) |
| `showBottom` | `boolean` | Render the bottom row (ViewType/Groups) |
| `compact` | `boolean` | Inline layout mode for bottom row |

### 5.2 TopRow — League / Season / Round or Date

- **League**: `<select>` populated from `leagues` prop. Displays `l.originalName`.
- **Season**: `<select>` sorted **descending** by `startYear` (most recent first). Displays `{startYear}/{endYear}`.
- **Round/Date input**:
  - Date-based (`scheduleIsDate = true`): `<input type="date">` with ◀/▶ day navigation and calendar icon
  - Round-based: `<input type="number">` with ◀/▶ navigation, clamped to `[1, league.numberOfRounds]`
  - Round input change is committed on `Enter`, `Tab`, or blur (via `commitRoundInput()`)

### 5.3 BottomRow — ViewType + Groups

- **ViewType buttons**: Three `<button>` elements — All / Home / Away. Active button is `bg-blue-600 text-white`.
- **All buttons use the same `minWidth`** (computed from the widest button via `useLayoutEffect`) to prevent layout shift when selection changes.
- **Group selector**: Only rendered when `seasonHasGroups = true`. A `<select>` with "All groups" + one option per group.

### 5.4 Groups loading

When league or season changes, `FilterBar` fetches groups:
```
GET /v1/leagues/{leagueId}/seasons/{seasonId}/groups
```
Sets `seasonHasGroups` based on whether the response has ≥1 group. This is separate from the `hasGroups` prop which controls whether the UI is shown at all.

---

## 6. StandingsTable Component

**File**: `frontend/components/common/standings/StandingsTable.tsx`

Renders the league table. Does NOT fetch any data — all data comes from `BaseStandings` via props.

### 6.1 Props

| Prop | Type | Purpose |
|------|------|---------|
| `rows` | `any[]` | Standings rows from API |
| `clubsMap` | `Record<string, string>` | clubId → name fallback map |
| `historicalMatches` | `any[]` | All matches up to current round (for Last-5/Last-10) |
| `cutoffDate` | `string \| undefined` | Date cutoff for Last-5/Last-10 (date-based leagues only) |
| `currentMatches` | `any[]` | Matches in the current selected round (included in Last-5/Last-10) |
| `viewType` | `'all'\|'home'\|'away'` | Stats column mode |
| `isLoading` | `boolean` | Show skeleton |
| `error` | `string \| null` | Show error banner |
| `onRetry` | `() => void` | Retry callback |

### 6.2 Row sorting

Rows are sorted **client-side** in descending order: Points → Wins → Goal Difference → Goals For. This ensures consistent ordering regardless of API return order.

For `viewType = 'home'` or `'away'`, the corresponding home/away stat fields are used for sorting.

### 6.3 Columns

| Col | Header | Tooltip | Notes |
|-----|--------|---------|-------|
| 0 | # | — | Position/rank |
| 1 | TEAM | — | Club name from `clubsMap` → row fields |
| 2 | Pts | Points | Shaded column |
| 3 | Pl | Played | |
| 4 | W | Won | Shaded |
| 5 | D | Drawn | |
| 6 | L | Lost | Shaded |
| 7 | GF | Goals For | |
| 8 | GA | Goals Against | Shaded |
| 9 | GD | Goal Difference | |
| 10 | % | Percentage | `pts / (pl * pointsPerWin) * 100` |
| 11 | LAST 5 | Last 5 results | Colored chips: W=green, D=grey, L=red |
| 12 | LAST 10 | Last 10 results | Three numbers: W-D-L |

**Alternating shade pattern**: Columns 2, 4, 6, 8, 10 (i.e., index 2+ step 2) have `bg-gray-50` header/cell backgrounds.

All column headers use the `Tooltip` component to show the full label on hover.

### 6.4 ViewType switching (Home / Away)

Each stat column reads from view-type-specific fields first, then falls back to the "total" field. Example for Points:
```typescript
pts = viewType === 'home' ? (r.home_points ?? r.homePoints ?? r.points)
    : viewType === 'away' ? (r.away_points ?? r.awayPoints ?? r.points)
    : r.points;
```

The standings row shapes from the API include all home/away splits (see §9.5).

### 6.5 Last-5 and Last-10 computation

These are computed **client-side** from `historicalMatches` + `currentMatches` for each club:

1. Deduplicate combined match list by `id` or composite `homeClubId-awayClubId-date` key
2. Filter to matches involving this `clubId`
3. Filter by `cutoffDate` (date-based) or `eligibleRoundIds` (round-based — already pre-filtered by `BaseStandings`)
4. Keep only matches with a final score (`status = 'Finished'`)
5. Sort by date ascending
6. **Last-10**: Take last 10, count W/D/L
7. **Last-5**: Take last 5, map to `'W'`/`'D'`/`'L'`/`''`, pad to 5 positions from the left with empty slots

---

## 7. GamesList Component

**File**: `frontend/components/common/standings/GamesList.tsx`

Renders the right-column "SCORES & FIXTURES" panel. Stateless — all data comes from `BaseStandings`.

### 7.1 Props

| Prop | Type | Purpose |
|------|------|---------|
| `games` | `Game[]` | Normalized match list |
| `isLoading` | `boolean` | Show skeleton |
| `error` | `string \| null` | Show error |
| `onRetry` | `() => void` | Retry callback |
| `showUserTimezone` | `boolean` | If true, convert times to user's browser timezone |
| `matchCountry` | `string \| undefined` | Country name of the league (e.g. `'Brazil'`) — used to derive IANA timezone |

**`Game` type**:
```typescript
type Game = {
  id: number;
  stadium: string;       // venue name
  dateTime: string;      // ISO string (see §10 for format details)
  home: { name: string; image?: string };
  away: { name: string; image?: string };
  status: string | null; // 'Finished', 'Scheduled', 'InProgress', ...
  score: string | null;  // '2 - 1' or null
};
```

`BaseStandings` transforms raw API match objects into `Game` objects before passing them to `GamesList`.

### 7.2 Date/Time display

`formatDateTime(dateTime)` produces the display string:

**When `showUserTimezone = false`** (default — show match local time):
- Reads `date.getUTCHours()` / `getUTCMinutes()` directly from the stored ISO string
- Returns `dd/mm/yyyy, HH:MM`
- Intentionally uses UTC extraction because dates are stored as **local time with UTC marker** (see §10)

**When `showUserTimezone = true`** (user clicked "Local Timezone" toggle):
- Looks up the match timezone from `COUNTRY_TIMEZONES[matchCountry]`
- If found, calls `storedLocalToUserTimezone(dateTime, matchTimezone)`
- Otherwise falls back to UTC extraction (same as default mode)

### 7.3 Timezone conversion (`storedLocalToUserTimezone`)

Dates in the database are stored as **match local time with a UTC Z marker** — e.g., a Brazilian match at 19:30 local time is stored as `2026-04-01T19:30:00Z` (**not** the true UTC `2026-04-01T22:30:00Z`). See §10 for why.

The naive approach of calling `new Date(dateTime).toLocaleString()` would add the browser's offset on top of the already-offset stored time, producing a wrong result (e.g., Spain user sees 21:30 instead of 00:30 the next day).

The correct approach (implemented in `storedLocalToUserTimezone`):

```typescript
function storedLocalToUserTimezone(dateTime: string, matchTimezone: string): string {
  const storedDate = new Date(dateTime);
  // 1. Find what matchTimezone's clock shows for this stored UTC value
  const tzParts = Intl.DateTimeFormat('en-US', { timeZone: matchTimezone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(storedDate);
  const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const tzMin  = parseInt(tzParts.find(p => p.type === 'minute')?.value ?? '0', 10);
  // 2. The stored UTC hour IS the local clock time we want — compute the correction
  let diffMins = (storedDate.getUTCHours() - tzHour) * 60 + (storedDate.getUTCMinutes() - tzMin);
  if (diffMins < -14 * 60) diffMins += 24 * 60;  // normalise across day boundaries
  if (diffMins >  14 * 60) diffMins -= 24 * 60;
  // 3. Apply correction to get the true UTC instant
  const trueUtcDate = new Date(storedDate.getTime() + diffMins * 60 * 1000);
  // 4. Display in browser's local timezone
  return trueUtcDate.toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}
```

**Example** (Spain user, CEST = UTC+2, Brazilian match at 19:30 BRT = UTC-3 = 22:30 true UTC):
- Stored: `2026-04-01T19:30:00Z`
- `tzHour` = 19, `tzMin` = 30 (what Brazil's clock shows for 19:30Z is 19:30, because the "local time AS UTC" trick means they're equal)
- Wait — this is the key insight: since the stored UTC value IS the match local time, `storedDate.getUTCHours() === tzHour` normally and `diffMins = 0`... unless DST has shifted things.
- Actually: the stored value `19:30Z` when interpreted by Brazil's timezone (UTC-3) gives `16:30`, not `19:30`. So `tzHour = 16`, `storedHour = 19`, `diffMins = (19-16)*60 = +180 min`.
- `trueUtcDate = 19:30 + 3h = 22:30 UTC`
- Displayed in Spain (CEST = UTC+2): `22:30 + 2h = 00:30 next day` ✓

### 7.4 COUNTRY_TIMEZONES map

A `const COUNTRY_TIMEZONES: Record<string, string>` maps country names (as returned by the leagues API) to IANA timezone identifiers:

```typescript
const COUNTRY_TIMEZONES: Record<string, string> = {
  'England': 'Europe/London',
  'Spain': 'Europe/Madrid',
  'Brazil': 'America/Sao_Paulo',
  'Argentina': 'America/Argentina/Buenos_Aires',
  // ... (50+ entries covering all football countries)
};
```

The same map exists in the backend (`api.service.ts` and `admin.service.ts`). If new countries are added to either copy, all three should be kept in sync.

> **Note**: The backend files historically used `'America/Brasilia'` for Brazil; the frontend uses the canonical `'America/Sao_Paulo'`. Both are valid IANA identifiers and produce identical results.

### 7.5 Match card layout

Each match card:
```
┌──────────────────────────────────────────────────────────────┐
│  [Stadium Name]  ·  [dd/mm/yyyy, HH:MM]                      │  ← grey text, centered
│                                                              │
│  [Logo] Home Club Name          [-:-]     Away Club Name [Logo] │
│                                 [Status]                     │
└──────────────────────────────────────────────────────────────┘
```

- **Score**: Shown only when `status === 'Finished'`; hyphen otherwise
- **Status text**: Raw `status` field displayed under the score
- **Club logos**: `<img>` with `object-contain` inside a circular `w-8 h-8` container; fallback to a grey circle with initial letter

---

## 8. API Endpoints Used

| Endpoint | Called by | Purpose |
|----------|-----------|---------|
| `GET /v1/sports` | `page.tsx` (via `sportsApi.getAll`) | Find sport ID by name |
| `GET /v1/leagues?sportId={id}` | `page.tsx` (via `leaguesApi.getBySport`) | All leagues for the sport |
| `GET /v1/seasons?leagueId={id}` | BaseStandings (`seasonsApi.getByLeague`) | Seasons for selected league |
| `GET /v1/rounds?leagueId=…&seasonId=…` | BaseStandings | All rounds for roundId translation |
| `GET /v1/standings?leagueId=…&seasonId=…&roundId=…` | BaseStandings | Standings for current round |
| `GET /v1/standings?leagueId=…&seasonId=…&matchDate=…` | BaseStandings (date-based leagues) | Standings for a date |
| `GET /v1/matches?leagueId=…&seasonId=…&roundId=…` | BaseStandings | Matches in current round |
| `GET /v1/matches?leagueId=…&seasonId=…` | BaseStandings | All matches in season (Last-5/10) |
| `GET /v1/clubs/{id}` | BaseStandings (on demand) | Club name lookup for standings rows |
| `GET /v1/leagues/{id}/seasons/{id}/groups` | FilterBar | Groups for group-stage tournaments |

---

## 9. Data Shapes

### 9.1 League object

```typescript
{
  id: number;
  originalName: string;
  secondaryName?: string;
  typeOfSchedule?: string;          // 'round_based' | 'date_based' | ...
  type_of_schedule?: string;        // snake_case alias
  numberOfRoundsMatches?: number;   // max rounds (for FilterBar clamp)
  flgDefault?: boolean;             // pre-select this league by default
  country: {
    id: number;
    name: string;                   // e.g. 'Brazil' — used for timezone lookup
  };
}
```

### 9.2 Season object

```typescript
{
  id: number;
  startYear: number;
  endYear: number;
  start_year?: number;              // snake_case aliases
  end_year?: number;
  status: 'planned' | 'active' | 'finished';
  flgDefault?: boolean;
  flgActive?: boolean;
}
```

### 9.3 Round object

```typescript
{
  id: number;                       // DB id — used in API queries
  roundNumber: number;              // display number (1-based)
  round?: number;                   // alias
  flgCurrent?: boolean;             // whether this is the "current" round
  flg_current?: boolean;
}
```

### 9.4 Match object (from API)

```typescript
{
  id: number;
  date: string;                     // ISO string — see §10
  status: string;                   // 'Finished' | 'Scheduled' | 'InProgress'
  homeScore: number | null;
  awayScore: number | null;
  roundId: number;
  homeClubId: number;
  awayClubId: number;
  homeClub: {
    id: number;
    name: string;
    short_name?: string;
    shortName?: string;
    imageUrl?: string;
  };
  awayClub: { /* same shape as homeClub */ };
  stadium?: {
    name?: string;
    originalName?: string;
  };
}
```

### 9.5 Standings row object

Key fields (many aliases exist — `getAny()` helper handles them):

```typescript
{
  clubId: number;         // or club_id
  position: number;       // or rank
  points: number;         // total points
  pl: number;             // or played, playedGames
  w: number;              // or wins
  d: number;              // or draws
  l: number;              // or losses
  gf: number;             // or goalsFor
  ga: number;             // or goalsAgainst
  gd: number;             // or goalDifference
  // Home/away splits:
  home_points: number;    // or homePoints
  away_points: number;    // or awayPoints
  home_games_played: number;
  away_games_played: number;
  home_w: number;  home_d: number;  home_l: number;
  away_w: number;  away_d: number;  away_l: number;
  home_gf: number; home_ga: number;
  away_gf: number; away_ga: number;
}
```

---

## 10. Date Storage Convention

**Critical**: Dates in the `matches.date` column are stored as **match local time with a UTC Z marker**.

Example: Brazilian match (BRT = UTC-3) at 19:30 local time:
- **Stored in DB**: `2026-04-01T19:30:00Z`
- **True UTC**: `2026-04-01T22:30:00Z`
- **User in Spain (CEST = UTC+2) should see**: `02/04/2026, 00:30`

This convention was introduced by the admin timezone correction tool. The admin `country` correction mode converts dates TO this format. The frontend must account for it by:

1. **Default display** (match local time): Extract UTC hours/minutes directly (`date.getUTCHours()`)
2. **User timezone display**: Use `storedLocalToUserTimezone()` to correct to true UTC first

Any new page consuming `matches.date` must implement the same convention.

---

## 11. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `autoSeasonLeagueRef` prevents season reset on React Query background refetch | Without this, the user's manually selected season would be overwritten every 5 minutes when React Query silently refetches seasons data |
| Round number → round DB id translation before each query | Multiple seasons can have the same round numbers. Using the raw number would match rounds from the wrong season on league change |
| `displayRoundForStandings` separate from `roundOrDay` | When user navigates to a round with no data, the STANDING header still shows the last valid round instead of jumping to 0 |
| `debounced(roundOrDay, 300ms)` controls query firing | Prevents rapid API calls when user clicks ◀/▶ repeatedly or types in the round input |
| Last-5/Last-10 computed client-side | Server-side computation would require additional API calls or a complex endpoint. Client-side is fast enough given `allMatchesQuery` is cached |
| `historicalMatches` uses round-id set filtering (not date) for round-based leagues | A postponed game played 3 weeks late still has its original round assignment. Date-based filtering would incorrectly exclude it |
| `clubsMap` fallback chain | The API returns different field names depending on the query path. The fallback chain ensures a name is always displayed |

---

## 12. Creating a Page for a New Sport

### 12.1 Steps

1. **Create the page file**:
   ```
   frontend/app/common/standings/{sport}/page.tsx
   ```
   Copy from `football/page.tsx`. Change:
   - `sports.find()` → match on the sport's name or `reducedName` (e.g., `'basketball'`, `'bb'`)
   - `title` prop → `"Standings — Basketball"` etc.

   ```tsx
   const basketball = sports.find(s =>
     s.name?.toLowerCase() === 'basketball' ||
     s.reducedName?.toLowerCase() === 'bb'
   );
   ```

2. **Update the index page**:
   `frontend/app/common/standings/page.tsx` already lists all sports. No change needed — the `sports` array already includes Basketball, Futsal, Handball, Ice Hockey, and Volleyball.

3. **Check `hasGroups` prop**:
   - Football uses `hasGroups={true}` (cup competitions may have groups)
   - Most sports can use the same default

4. **Verify `leaguesApi.getBySport` returns `country.name`** in the response:
   Needed for `matchCountry` prop in `GamesList`. The leagues API does a `LEFT JOIN countries` and returns `country: { id, name }` — this should be the same for all sports.

5. **Check `COUNTRY_TIMEZONES`** in `GamesList.tsx`:
   If the new sport has leagues in countries not already in the map, add them.

6. **No changes needed** to `BaseStandings`, `FilterBar`, `StandingsTable`, or `GamesList` — they are fully sport-agnostic.

### 12.2 Sport-specific differences to watch for

| Concern | Football | Other sports |
|---------|----------|-------------|
| **Points per win** | 3 | Basketball/volleyball may use 2 or other values. `StandingsTable` reads `r.pointsPerWin ?? 3`, so the API response must include this field or the table will default to 3 |
| **Column labels** | GF / GA / GD (Goals For/Against/Difference) | Handball uses Goals, Basketball uses Points, Volleyball uses Sets. Column labels in `StandingsTable` are hardcoded to GF/GA/GD — they may need updating for other sports or the component may need a `statLabels` prop |
| **Score format** | `'2 - 1'` | Basketball: `'98 - 87'`, Volleyball: `'3 - 1'` (sets). `GamesList` displays `g.score` as-is — no changes needed |
| **Match divisions** | 2 halves (or more with overtime) | Basketball: 4 quarters; Ice Hockey: 3 periods; Volleyball: up to 5 sets. This is a backend concern and does not affect the frontend page |
| **`typeOfSchedule`** | Round-based | Volleyball leagues may be date-based. `BaseStandings` already handles both modes |
| **Teams per match** | Always 2 | All supported sports are 1v1 — no changes needed |
| **`hasGroups`** | `true` | Safe to pass `true` for all sports; the group selector only appears if the API returns groups |
