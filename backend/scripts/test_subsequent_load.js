require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // Get the latest esp.1 transitional row
  const tRow = await pool.query(
    "SELECT id, league, season, origin FROM api_transitional WHERE league = $1 AND origin = $2 ORDER BY fetched_at DESC LIMIT 1",
    ['esp.1', 'Api-Espn']
  );
  const row = tRow.rows[0];
  console.log('Testing row:', row);
  console.log('typeof row.season:', typeof row.season);

  // Simulate extractLeagueMetadata for ESPN
  const full = await pool.query('SELECT payload FROM api_transitional WHERE id = $1', [row.id]);
  const payload = full.rows[0].payload;
  const events = payload.events || [];
  const firstEvent = events[0] || {};
  const seasonInfo = firstEvent.season || {};
  const leagueInfo = (payload.leagues || [])[0] || {};
  const metaLeagueName = leagueInfo.name || leagueInfo.abbreviation || null;
  const metaLeagueSeason = seasonInfo.year || null;
  console.log('meta.leagueName:', metaLeagueName);
  console.log('meta.leagueSeason:', metaLeagueSeason, 'type:', typeof metaLeagueSeason);

  const espnLeagueCode = row.league;
  const sportId = 36;

  // Build seasonYears exactly like the code does
  const seasonYears = [];
  if (metaLeagueSeason != null && Number.isFinite(Number(metaLeagueSeason))) {
    seasonYears.push(Number(metaLeagueSeason));
  }
  const rawSeasonStr = String(row.season || '');
  console.log('rawSeasonStr:', JSON.stringify(rawSeasonStr));
  const matches = rawSeasonStr.match(/\d{4}/g) || [];
  console.log('regex matches:', matches);
  for (const m of matches) {
    const y = Number(m);
    if (Number.isFinite(y) && !seasonYears.includes(y)) seasonYears.push(y);
  }
  console.log('seasonYears:', seasonYears);

  // League lookup with LOWER
  const lRes = await pool.query(
    "SELECT id, original_name, espn_id FROM leagues WHERE (LOWER(original_name) = LOWER($1) OR LOWER(secondary_name) = LOWER($1) OR ($3::text IS NOT NULL AND espn_id = $3)) AND sport_id = $2 LIMIT 1",
    [String(metaLeagueName || '').trim(), sportId, espnLeagueCode]
  );
  console.log('League match:', lRes.rows);

  if (lRes.rows.length && seasonYears.length > 0) {
    for (const year of seasonYears) {
      const sRes = await pool.query(
        "SELECT id, start_year, end_year FROM seasons WHERE sport_id = $1 AND league_id = $2 AND (start_year = $3 OR end_year = $3) LIMIT 1",
        [sportId, lRes.rows[0].id, year]
      );
      console.log('Season match year=' + year + ':', sRes.rows);
      if (sRes.rows.length) {
        const rRes = await pool.query(
          'SELECT COUNT(*)::int as cnt FROM rounds WHERE league_id = $1 AND season_id = $2',
          [lRes.rows[0].id, sRes.rows[0].id]
        );
        console.log('Rounds count:', rRes.rows[0].cnt);
        console.log('==> WOULD DETECT SUBSEQUENT LOAD:', rRes.rows[0].cnt > 0 ? 'YES' : 'NO');
        break;
      }
    }
  } else {
    console.log('==> FAILED: league rows:', lRes.rows.length, 'seasonYears:', seasonYears);
  }

  await pool.end();
}
run().catch(e => { console.error(e); process.exit(1); });
