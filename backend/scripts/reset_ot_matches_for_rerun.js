require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function parseArgs(argv) {
  const result = {
    sportId: null,
    leagueId: null,
    seasonId: null,
    execute: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--execute') {
      result.execute = true;
      continue;
    }
    if (arg === '--sportId') {
      result.sportId = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--leagueId') {
      result.leagueId = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--seasonId') {
      result.seasonId = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return result;
}

function printHelp() {
  console.log(`Usage:
  node scripts/reset_ot_matches_for_rerun.js [--sportId N] [--leagueId N] [--seasonId N] [--execute]

Purpose:
  Finds already-finished matches whose extra match_divisions periods exist but are not typed as overtime/penalties.
  In dry-run mode, only prints the affected matches.
  With --execute, it resets those matches to Scheduled and deletes their standings and match_divisions,
  so the existing T&L subsequent-load process can rebuild them on the next season payload rerun.

Examples:
  node scripts/reset_ot_matches_for_rerun.js --sportId 1 --leagueId 123 --seasonId 456
  node scripts/reset_ot_matches_for_rerun.js --sportId 1 --leagueId 123 --seasonId 456 --execute
`);
}

async function findAffectedMatches(filters) {
  const params = [filters.sportId, filters.leagueId, filters.seasonId];
  const sql = `
    WITH match_scope AS (
      SELECT
        m.id,
        m.sport_id,
        m.league_id,
        m.season_id,
        m.round_id,
        m.origin_api_id,
        m.date,
        m.status,
        m.home_score,
        m.away_score,
        hc.short_name AS home_name,
        ac.short_name AS away_name,
        s.name AS sport_name,
        CASE
          WHEN LOWER(s.name) LIKE '%basketball%' THEN 4
          WHEN LOWER(s.name) LIKE '%ice hockey%' THEN 3
          ELSE s.max_match_divisions_number
        END AS regulation_divisions
      FROM matches m
      JOIN sports s ON s.id = m.sport_id
      JOIN clubs hc ON hc.id = m.home_club_id
      JOIN clubs ac ON ac.id = m.away_club_id
      WHERE m.status = 'Finished'
        AND m.origin_api_id IS NOT NULL
        AND ($1::int IS NULL OR m.sport_id = $1)
        AND ($2::int IS NULL OR m.league_id = $2)
        AND ($3::int IS NULL OR m.season_id = $3)
    )
    SELECT
      ms.id,
      ms.sport_id,
      ms.league_id,
      ms.season_id,
      ms.round_id,
      ms.origin_api_id,
      ms.date,
      ms.status,
      ms.home_score,
      ms.away_score,
      ms.home_name,
      ms.away_name,
      ms.sport_name,
      ms.regulation_divisions,
      COUNT(*) FILTER (
        WHERE md.division_number > ms.regulation_divisions
          AND (COALESCE(md.home_score, 0) <> 0 OR COALESCE(md.away_score, 0) <> 0)
      )::int AS extra_divisions,
      ARRAY_AGG(
        CONCAT(md.division_number, ':', md.division_type, ':', COALESCE(md.home_score, 0), '-', COALESCE(md.away_score, 0))
        ORDER BY md.division_number
      ) AS division_map
    FROM match_scope ms
    JOIN match_divisions md ON md.match_id = ms.id
    GROUP BY
      ms.id,
      ms.sport_id,
      ms.league_id,
      ms.season_id,
      ms.round_id,
      ms.origin_api_id,
      ms.date,
      ms.status,
      ms.home_score,
      ms.away_score,
      ms.home_name,
      ms.away_name,
      ms.sport_name,
      ms.regulation_divisions
    HAVING BOOL_OR(
      md.division_number > ms.regulation_divisions
      AND (COALESCE(md.home_score, 0) <> 0 OR COALESCE(md.away_score, 0) <> 0)
      AND UPPER(COALESCE(md.division_type, '')) NOT IN ('OVERTIME', 'PENALTIES')
    )
    ORDER BY ms.date ASC, ms.id ASC
  `;

  const result = await pool.query(sql, params);
  return result.rows;
}

async function resetMatches(matchIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM standings WHERE match_id = ANY($1::int[])', [matchIds]);
    await client.query('DELETE FROM match_divisions WHERE match_id = ANY($1::int[])', [matchIds]);
    await client.query(
      `UPDATE matches
          SET status = 'Scheduled',
              home_score = NULL,
              away_score = NULL,
              updated_at = now()
        WHERE id = ANY($1::int[])`,
      [matchIds],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const matches = await findAffectedMatches(options);

  if (matches.length === 0) {
    console.log('No affected finished OT matches found for the provided filters.');
    return;
  }

  console.log(`Found ${matches.length} affected match(es).`);
  for (const match of matches) {
    console.log(
      [
        `matchId=${match.id}`,
        `leagueId=${match.league_id}`,
        `seasonId=${match.season_id}`,
        `roundId=${match.round_id}`,
        `originApiId=${match.origin_api_id}`,
        `${match.home_name} ${match.home_score}-${match.away_score} ${match.away_name}`,
        `extraDivisions=${match.extra_divisions}`,
        `divisions=${(match.division_map || []).join(',')}`,
      ].join(' | '),
    );
  }

  if (!options.execute) {
    console.log('\nDry run only. Re-run with --execute to reset these matches for the normal T&L rerun path.');
    return;
  }

  const matchIds = matches.map((match) => Number(match.id)).filter(Number.isFinite);
  await resetMatches(matchIds);
  console.log(`Reset ${matchIds.length} match(es). Next step: rerun the season payload through the existing T&L flow.`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });