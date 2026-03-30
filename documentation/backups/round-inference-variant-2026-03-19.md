Current inference variant backup saved before restricting auto-fill to only single-missing-match rounds.

Files covered:
- backend/src/api/api.service.ts
- frontend/app/admin/api/etl/football/page.tsx

Behavior snapshot:
- Date-based round boundaries use league-local day handling for `America/Brasilia`.
- Incomplete rounds can be carried forward in `openIncompleteRounds` and later delayed fixtures can be auto-assigned back.
- Ambiguous fixtures are deferred and one consolidated review set is returned after the full parse loop.
- Review UI shows a round summary, editable rows, unresolved-only filtering, and league-local dates.

Backend markers for this variant in `backend/src/api/api.service.ts`:
- `buildReviewDetails`
- `buildReviewConflict`
- `ROUND_BOUNDARY_GAP_DAYS = 1`
- `openIncompleteRounds`
- deferred conflict handling with `reviewEventIds`

Frontend markers for this variant in `frontend/app/admin/api/etl/football/page.tsx`:
- `formatLeagueDate`
- `roundReviewSummary`
- `showOnlyReviewRows`
- round review summary `Date Range` column

Intent of this backup:
- If we want to restore the broader postponed-match carry-forward logic later, use this note together with the current git history/diff around the listed markers.