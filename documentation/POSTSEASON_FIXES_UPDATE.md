Postseason & ETL Fixes — Implementation Summary

Summary

This document summarizes the recent fixes made to the ETL, database migrations, backend bracket endpoint, and frontend postseason UI. These changes address two related issues:

- The ETL was creating bogus clubs from ambiguous postseason participant labels (e.g. "Suns/Warriors", "TBD").
- The frontend postseason bracket sometimes hid existing playoff rounds (e.g. Round of 16) and did not synthesize missing higher-level phases (Quarterfinals/Semifinals) when needed.

Goals

- Prevent automatic creation of clubs from ambiguous labels; store placeholders and force entity review.
- Add explicit placeholder columns to `matches` so placeholders can be stored in the DB (migration `0023`).
- Ensure subsequent-load behavior: allow updating existing matches, do not fast-path skip unseen postseason matches, and always surface entity-review when placeholders present.
- Frontend: show Play-ins only when present; display single-match pairings with "Score" and multi-match pairings with "Series wins"; if DB contains a deeper playoff detail (e.g. R16) create the canonical sequence of phases up to Finals (synthesize QF/SF when missing).

Files changed / added

- Backend
  - Modified: `backend/src/matches/matches.service.ts`
    - Added `leagueId` to the `season` object returned by `getPostseasonBracket` (needed by frontend probing).
    - `getPostseasonBracket` now builds phases by looking at `seasonPhaseDetail` and returns `{ season, regularSeasonStandings, phases }`.
  - Migration (created, must be applied):
    - `backend/drizzle/0023_allow_placeholder_participants_on_matches.sql`
      - Makes `home_club_id` / `away_club_id` nullable.
      - Adds `home_club_placeholder` and `away_club_placeholder` columns to `matches`.

- Frontend
  - Modified: `frontend/components/common/standings/PostseasonBracket.tsx`
    - Groups matches into series, displays "Score" for single matches and "Series wins" for series.
    - Builds canonical phase list: includes Play-ins only when present, and synthesizes phases from the earliest playoff detail found in the DB up to Finals (e.g. found R16 → render R16, Quarterfinals, Semifinals, Finals). This is implemented by probing the API for the earliest playoff detail.
  - Modified: `frontend/components/common/standings/BaseStandings.tsx`
    - Ensures regular-mode queries only request `seasonPhase=Regular` for `matches` and `matchesAll` queries, so regular view no longer shows postseason matches.

Behavioral / ETL changes (high level)

- ETL now:
  - Avoids auto-creating clubs when participant labels are ambiguous. Instead it writes placeholders into `home_club_placeholder` / `away_club_placeholder` and leaves `home_club_id` / `away_club_id` NULL.
  - Falls back to full insert (not fast-path update) when unseen postseason matches are encountered, ensuring newly discovered postseason matches are created.
  - Skips standings writes for non-Regular matches.
  - Always triggers entity review for placeholders on subsequent loads.

How to apply the DB migration (required)

1. Change directory into the backend folder:

```bash
cd backend
```

2. Run Drizzle migrations (example using `npx`):

```bash
npx drizzle-kit migrate --config=drizzle.config.ts
```

Notes:
- Some developers run migrations via an npm script. If you have a script (e.g. `npm run migrate` or `yarn migrate`) use that instead.
- The migration file `0023_allow_placeholder_participants_on_matches.sql` must be applied before running the ETL that relies on placeholder columns. If the migration isn't applied the backend will intentionally fail the ETL with a guard message.

How to verify (quick checks)

1. Verify migration applied
   - Check DB schema: `matches` table has `home_club_placeholder` and `away_club_placeholder`; `home_club_id` and `away_club_id` are nullable.

2. Verify backend bracket payload
   - Request: `GET /v1/matches/postseason-bracket?leagueId=<leagueId>&seasonId=<seasonId>&groupId=<optional>`
   - Confirm the returned `season` includes `leagueId` and returned `phases` include the existing Round of 16 (if present). If DB has R16 but the payload lacks earlier/later phases, the frontend will probe `/v1/matches` to detect and synthesize the phase list.

3. Verify frontend changes
   - In regular view (seasonPhase = Regular) ensure the games/standings lists do NOT include Play-ins or Playoffs matches.
   - In postseason view, inspect the bracket UI:
     - Play-ins appear only if present in payload.
     - If payload contains R16 and QF/SF are missing, the UI shows synthesized Quarterfinals and Semifinals with TBD placeholders so the bracket looks canonical.
     - Single-match pairings show "Score" with the final score. Multi-match series show "Series wins" aggregated from finished matches.

Testing steps (dev server)

- Backend (example):

```bash
cd backend
# if you use npm scripts
npm run start:dev
# or
npm run start
# or directly via node / ts-node depending on dev setup
```

- Frontend (example):

```bash
cd frontend
# typical next dev script
npm run dev
# or
pnpm dev
```

Once both servers are running, open the UI and exercise:
- Regular standings/games list for a season → ensure no postseason matches show.
- Postseason bracket for the same season → ensure R16 appears (if DB has it) and that QF & SF are synthesized when missing.

Developer notes & risks

- The ETL and backend include a guard that requires migration `0023` to be applied; failing to run migrations will cause ETL to stop with an actionable error.
- The frontend synthesizes missing phases by probing the `/v1/matches` endpoint. If your API server is behind auth, CORS, or rate limits, the probe could fail; the UI will fallback to the original payload if probing fails.
- Visual edge-cases may appear if the payload contains inconsistent `seasonPhaseDetail` naming — the canonical enum values are: `Play-ins`, `Round of 64`, `Round of 32`, `Round of 16`, `Quarterfinals`, `Semifinals`, `Finals`.

Files to review for more details

- `backend/drizzle/0023_allow_placeholder_participants_on_matches.sql` (migration to apply)
- `backend/src/matches/matches.service.ts` (bracket builder + season payload changes)
- `frontend/components/common/standings/PostseasonBracket.tsx` (phase synthesis + UI rules)
- `frontend/components/common/standings/BaseStandings.tsx` (regular view filters)

If you want, I can:
- Run the backend bracket endpoint now and paste the JSON so we can confirm R16 is present, or
- Apply further small fixes if you see any mismatches after you run the migration and start the servers.

---
Document created on: 2026-04-18
Generated by: developer assistant (patch summary)
