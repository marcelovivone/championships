# Mobile Onboarding — Expo + Local Backend

**Last updated: 2026-04-30**

Purpose
-------
This document explains the mobile app architecture and developer workflow for the Championships project. The goal is a lightweight Expo app that reuses the existing backend API for development and testing against your local database.

Important scope note: the current web and mobile implementations are still local-only. They run against the local Nest backend and local PostgreSQL database. Deployment of the public web app and mobile app is a later workstream.

Decision Summary
----------------
- Stack: Expo SDK 54, React Native 0.81.5, React 19.1.0, TypeScript (managed workflow).
- Data: `@tanstack/react-query` + `axios` for all data fetching. `dotenv` for environment config.
- Networking: Mobile apps call the backend API (Nest) running on the developer machine; backend interacts with PostgreSQL in Docker. Mobile never talks directly to the DB.
- Local testing: Android emulator (`10.0.2.2`), real devices via PC LAN IP, Expo Go for iOS devices.

## Current Implementation State (2026-04-30)

### Files

| File | Purpose |
|---|---|
| `mobile/App.tsx` | Expo entrypoint; wraps in `QueryClientProvider`; renders `RegularSeasonScreen` |
| `mobile/app.config.js` | Reads `API_BASE_URL` from `.env.development`; falls back to `http://10.0.2.2:3000` |
| `mobile/.env.development` | Set `API_BASE_URL=http://<PC_LAN_IP>:3000` for real device; use `10.0.2.2` for Android emulator |
| `mobile/tsconfig.json` | TypeScript config aligned to Expo SDK 54 |
| `mobile/babel.config.js` | `babel-preset-expo` ~54.0.10 |
| `mobile/src/api.ts` | Axios client + typed fetch helpers (see below) |
| `mobile/src/RegularSeasonScreen.tsx` | Main screen (see below) |
| `mobile/src/PostseasonBracket.tsx` | Mobile postseason bracket renderer for generic leagues plus NBA play-ins and playoffs |
| `mobile/README.md` | Quick-start commands |
| `documentation/MOBILE_ONBOARDING.md` | This file |

### `mobile/src/api.ts`

- `getApiBaseUrl()` — derives LAN backend host from Expo's `hostUri` constant when env var is absent.
- Types: `Sport`, `League`, `Season`, `Round`, `ClubRef`, `Standing`, `Match`, `SeasonClub`, `Group`, `StandingZone`, `PostseasonPhase`, `PostseasonBracket`.
- Helpers: `fetchSports`, `fetchLeagues`, `fetchSeasons`, `fetchRounds`, `fetchSeasonClubs`, `fetchSeasonMatches`, `fetchStandings`, `fetchMatchesSlice`, `fetchGroups`, `fetchStandingZones`, `fetchPostseasonBracket`.
- `Group` type: `{ id: number; name: string; sportId: number; leagueId: number; seasonId: number }`.

### `mobile/src/RegularSeasonScreen.tsx`

- Sport → League → Season → Round / Date selectors.
- Prefers Basketball / NBA automatically when those records exist.
- Standings section: for basketball leagues, groups standings by conference (Eastern / Western) using `/v1/groups?seasonId=...`. For other sports, shows a single flat list.
- Standing zones: applies row accent colors from `standing_zones` on mobile standings.
- Games list: shows `"score - score"` for finished games; shows `"vs"` for unplayed games (null scores suppressed).
- Uses `season-clubs` as a fallback so team labels do not collapse to raw club ids when standings rows omit club metadata.
- Postseason controls: supports `Regular`, `Play-ins`, and `Playoffs`, plus stage/detail selection inside postseason.

### `mobile/src/PostseasonBracket.tsx`

- Generic postseason bracket for non-basketball leagues.
- NBA play-ins bracket with measured connectors between first and second rounds.
- NBA mirrored playoffs bracket with conference-side slot ordering, round-to-round connectors, and local winner propagation once a series reaches 4 wins.
- Placeholder cards and synthesized rounds are rendered locally from the postseason payload so the bracket stays readable even when future rounds are not yet populated.

### Known Issues / Tech Debt

- `SafeAreaView` deprecation warning: `react-native` import should be replaced with `react-native-safe-area-context`.
- 11 moderate `npm audit` vulnerabilities (non-blocking dev dependency issues).

## Pending Tasks (priority order)

1. **NBA standings columns** — Add GB (games behind), HOME W-L, AWAY W-L, OT W-L columns to the basketball standings row. Data lives in `standing.homeWins`, `standing.homeLosses`, `standing.awayWins`, `standing.awayLosses`, `standing.overtimeWins`, `standing.overtimeLosses`. See `basketball-standings-spec.md` memory.
2. **SafeAreaView fix** — Replace `import { SafeAreaView } from 'react-native'` with `react-native-safe-area-context`.
3. **Shared contracts** — Decide whether to extract common web/mobile API types into a small shared package.
4. **Agent phase** — Start the local-first Agent Control Plane work now that the mobile read-only flows are stable enough for parallel backend automation work.
5. **Deployment phase** — Prepare deployment for the public web app and the mobile app after the local stack remains stable.

## Key Runtime Facts

| Fact | Value |
|---|---|
| NBA league id | 57 |
| Active NBA season id | 80 (2025/2026) |
| Eastern Conference group id | 10 |
| Western Conference group id | 11 |
| Expo start (real device) | `cd mobile && npx expo start --host lan --clear` |
| Real iPhone `API_BASE_URL` | `http://192.168.1.156:3000` |
| Android emulator `API_BASE_URL` | `http://10.0.2.2:3000` |
| Deployment status | Local only |

Local Backend & DB
------------------
The app expects the backend API to be accessible at a reachable host:port. By default the mobile scaffold attempts to read `API_BASE_URL` from Expo extras. Fallbacks:

- Android emulator: `http://10.0.2.2:3000` → maps to host `localhost:3000`.
- iOS simulator (mac only): `http://localhost:3000`.
- Real devices: `http://<PC_LAN_IP>:3000` (ensure firewall/port open).

Backend config notes
--------------------
- The Nest backend listens using `process.env.PORT || 3000` in `backend/src/main.ts`.
- CORS is currently limited to common localhost origins. For device testing you can add your PC LAN origin to the CORS list or enable dev mode `origin: true` temporarily.

Firewall & Network
------------------
On Windows grant inbound access for Node/Nest on port 3000 or allow the specific process. Confirm you can `curl http://<PC_LAN_IP>:3000/api` from another device on the network.

Developer workflow
------------------
1. Start DB: `docker compose up -d` (root repo). PostgreSQL is mapped to host port `5433` by the compose file.
2. Start backend: `cd backend && npm run start:dev`.
3. Start Expo: `cd mobile && npx expo start --host lan --clear`.
4. Open Android emulator (`npx expo start` then press `a`) or scan QR in Expo Go on iPhone.
5. On iPhone: open Camera app → scan QR → tap the `exp://` link → opens in Expo Go.

TypeScript check
----------------
```bash
cd mobile
npm run typecheck
```

API contract & types
--------------------
The mobile app reuses the same JSON contracts as the web frontend. Consider extracting common TypeScript interfaces from `frontend/lib/api/types.ts` into a small shared package if you want strict reuse across web and mobile in the future.

Stability & next steps
----------------------
- Phase 1 (mobile): read-only views for standings, fixtures, standing zones, and postseason brackets are implemented locally. Avoid admin flows.
- Phase 2 (mobile): authenticated read/write, push notifications, local caching.
- Immediate parallel work: agent development can start now on the local backend/runtime.
- Future infrastructure work: deploy the public web app and the mobile app; that deployment track is not completed yet in this repository.

Security
--------
- Mobile apps must never embed DB credentials or connect directly to the DB.
- For auth, the mobile app will request tokens from the backend and store them with a secure mobile storage approach (Expo SecureStore or equivalent) when you move to authenticated flows.

Troubleshooting
---------------
- Network unreachable: verify backend is running and accessible from the device. Use PC LAN IP and check firewall.
- API returns wrapped response objects: the simple mobile client unwraps `data.data` if present. Align backend API responses with the web client's conventions where practical.
- SDK mismatch on Expo Go: run `npx expo install expo@^54.0.0 && npx expo install --fix` to align all packages to SDK 54.
- Port 8081 in use: pass `--clear` flag and/or restart the Metro bundler process.
