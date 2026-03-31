require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // Case 1: League 54, Season 68, Round 12 - should have 18 standings, has 16
    const r1 = await pool.query(`
      SELECT r.round_number, COUNT(s.id)::int as standings_count
      FROM rounds r
      LEFT JOIN standings s ON s.round_id = r.id AND s.league_id = 54 AND s.season_id = 68
      WHERE r.league_id = 54 AND r.season_id = 68
      GROUP BY r.round_number
      ORDER BY r.round_number
    `);
    console.log('=== Case 1: League 54, Season 68 - Standings per round ===');
    const expected1 = 18; // 9 matches * 2 clubs per match
    for (const row of r1.rows) {
      const marker = row.standings_count < expected1 ? ' <<<< ISSUE' : '';
      console.log(`Round ${row.round_number}: ${row.standings_count} standings${marker}`);
    }

    // Case 2: League 47, Season 66, Round 20 - should have 20 standings, has 18
    const r2 = await pool.query(`
      SELECT r.round_number, COUNT(s.id)::int as standings_count
      FROM rounds r
      LEFT JOIN standings s ON s.round_id = r.id AND s.league_id = 47 AND s.season_id = 66
      WHERE r.league_id = 47 AND r.season_id = 66
      GROUP BY r.round_number
      ORDER BY r.round_number
    `);
    console.log('\n=== Case 2: League 47, Season 66 - Standings per round ===');
    const expected2 = 20; // 10 matches * 2 clubs per match
    for (const row of r2.rows) {
      const marker = row.standings_count < expected2 ? ' <<<< ISSUE' : '';
      console.log(`Round ${row.round_number}: ${row.standings_count} standings${marker}`);
    }

    // Now let's find which clubs are missing standings in both problem rounds
    console.log('\n=== Case 1: Clubs in matches but missing standings for Round 12 ===');
    const missing1 = await pool.query(`
      SELECT m.id as match_id, m.home_club_id, m.away_club_id, m.status, m.home_score, m.away_score,
             hc.short_name as home_name, ac.short_name as away_name,
             m.date, m.origin_api_id,
             (SELECT COUNT(*) FROM standings WHERE match_id = m.id)::int as standings_for_match
      FROM matches m
      JOIN rounds r ON r.id = m.round_id
      JOIN clubs hc ON hc.id = m.home_club_id
      JOIN clubs ac ON ac.id = m.away_club_id
      WHERE m.league_id = 54 AND m.season_id = 68 AND r.round_number = 12
      ORDER BY m.date
    `);
    for (const row of missing1.rows) {
      const marker = row.standings_for_match === 0 ? ' <<<< NO STANDINGS!' : '';
      console.log(`Match ${row.match_id}: ${row.home_name} vs ${row.away_name} | ${row.home_score}-${row.away_score} | status: ${row.status} | standings: ${row.standings_for_match} | date: ${row.date} | origin_api_id: ${row.origin_api_id}${marker}`);
    }

    console.log('\n=== Case 2: Clubs in matches but missing standings for Round 20 ===');
    const missing2 = await pool.query(`
      SELECT m.id as match_id, m.home_club_id, m.away_club_id, m.status, m.home_score, m.away_score,
             hc.short_name as home_name, ac.short_name as away_name,
             m.date, m.origin_api_id,
             (SELECT COUNT(*) FROM standings WHERE match_id = m.id)::int as standings_for_match
      FROM matches m
      JOIN rounds r ON r.id = m.round_id
      JOIN clubs hc ON hc.id = m.home_club_id
      JOIN clubs ac ON ac.id = m.away_club_id
      WHERE m.league_id = 47 AND m.season_id = 66 AND r.round_number = 20
      ORDER BY m.date
    `);
    for (const row of missing2.rows) {
      const marker = row.standings_for_match === 0 ? ' <<<< NO STANDINGS!' : '';
      console.log(`Match ${row.match_id}: ${row.home_name} vs ${row.away_name} | ${row.home_score}-${row.away_score} | status: ${row.status} | standings: ${row.standings_for_match} | date: ${row.date} | origin_api_id: ${row.origin_api_id}${marker}`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
