# Postseason Bracket — Recent Updates (2026-04-24)

Summary
- This document summarizes all recent updates, bug fixes, and feature work performed on the postseason bracket rendering and related logic across frontend and supporting data handling.
- Primary focus: `PostseasonBracket.tsx` and NBA-specific behavior (first-round ordering, play-ins, seeds display, connector alignment, and series score attribution).

Why this change
- Multiple regressions and inconsistent behavior were reported while improving NBA bracket ordering and play-in support.
- Work aimed to make bracket rendering deterministic for NBA (WEST on left, EAST on right), display conference seeds, attribute series scores/wins to club ids, and keep visual connectors stable after re-orderings.

Files touched (primary)
- frontend/components/common/standings/PostseasonBracket.tsx — core of the bracket logic and rendering (ordering, series construction, connectors, seed maps, play-ins)

High-level list of changes
1. Series building and wins attribution
   - `buildSeries(matches)` groups matches into series using club ids or placeholders when ids are missing.
   - Series now compute `winsById` keyed by the winning `clubId`, ensuring series score/win counts are attributed to clubs (not positional counters).

2. Conference-aware seeds
   - Created `confSeedMaps` to map `clubId -> conferenceRank` using `regularSeasonStandings` grouped by `groupId`.
   - `getSeedForClub` returns conference rank when available, otherwise falls back to global `seedMap`.
   - Seed values are shown next to team names in the UI (`SeriesCard`) for Playoffs and Play-ins.

3. Deterministic Round-of-16 (First Round) ordering
   - Implemented `buildBracketOrderedSlots` which finds an "anchor" phase (highest phase with data) and builds ordered slots top-down.
   - For NBA "Round of 16" the visual slot assignment is deterministic and play-in-aware using checks for canonical seed pairs: [1 vs play-in(7..10), 4v5, 3v6, 2 vs play-in(7..10)].
   - Fallback ordering uses minimum seed then earliestDate for stability.

4. Connector alignment and robustness
   - Connector computation now prefers to find parent series by matching club ids (seriesClubIds) rather than assuming index-pair relationships.
   - If no club-id parent is found (edge cases), it falls back to index-based pairing to keep layout stable.
   - For ongoing seasons where subsequent-phase series do not yet exist, connectors are still drawn to placeholders so the full bracket is visible and aligned (consistent with finished season behavior).

5. Play-ins support
   - `NbaPlayInsBracket` enhanced with an `enhancedClubToConf` mapping to improve match->conference detection; builds conference-specific first/second columns, and aligns second-round matches to averages of parent first-round positions.

6. UI and small UX fixes
   - `SeriesCard` shows `seed + club name` where seed is available and uses local per-series `localSeedMap` to prefer conference seeds.
   - Last-game / next-game footer logic kept intact and consistent with series data.

Recent bug/regression fixes
- Fixed: series wins and displayed series score were previously tied to positional counters; now they are keyed by winning `clubId`.
- Fixed: connectors broke after reordering first-round slots; now parent-child linking uses club-id membership and falls back to index pairing, and placeholders are used for alignment in ongoing seasons.
- Fixed: Phoenix/other clubs showing global position numbers instead of conference seeds by building and using `confSeedMaps`.

Known remaining issues / notes
- There have been transient reports that some East Conference slots were not ordered as expected by the canonical NBA mapping for a particular dataset (2024/2025). The most likely causes are:
  - Missing or incorrect `groupId` values in `regularSeasonStandings` for some clubs.
  - Play-in match data not containing expected club ids, causing the deterministic checks to fall back to the pool ordering.
- If runtime data is incomplete (missing `groupId` or `position`), the anchor-driven ordering still provides stable placeholders, but exact canonical slot mapping may require the missing data.

How to verify locally
1. Start frontend (from repository root):

```bash
cd frontend
npm run dev
```

2. Load the Playoffs page for NBA and compare two scenarios:
   - A finished season (all phases completed): connector lines should link all phases, seeds present, and ordering match canonical mapping.
   - An ongoing season (current phase = First Round): the UI should still show connectors from placeholder child slots up to the finals column, and rectangles should be vertically aligned with their parent placeholders.

3. Inspect browser console for debug logs (if enabled) and verify the `orderedByPhase['Round of 16']` content for each conference.

Developer notes and pointers
- Ordering logic is implemented in `buildBracketOrderedSlots` inside `PostseasonBracket.tsx`. It's intentionally conservative: prefer deterministic mapping when possible, otherwise leave placeholders and keep stable visual order.
- Connector drawing lives in the `useEffect` that measures card refs and computes SVG paths. Matching by `seriesClubIds()` is the main mechanism that keeps links correct after re-orders.
- When adding or modifying logic that affects slot ordering, update both the ordering algorithm and the connector computation to remain in sync (prefer club-id matching in both places).

Suggested next steps / backlog
- Add an optional debug-mode flag that prints `orderedByPhase` arrays to the browser console for easier troubleshooting in QA and staging.
- Add a unit/integration test harness that runs the bracket builder with sample datasets (finished and ongoing) and verifies slot ordering and parent-child relationships.
- Add more explicit validation and warnings when `regularSeasonStandings` lacks `groupId` or `position` (to help explain why canonical mapping failed).

Contact
- If anything above is unclear or you need the changes refined, open an issue or ping the developer who committed the recent updates.

---

Generated: 2026-04-24
