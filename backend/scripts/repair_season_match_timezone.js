require('dotenv').config();

const { Pool } = require('pg');

const [sportIdArg, leagueIdArg, seasonIdArg, targetTimezoneArg, sourceTimezoneArg] = process.argv.slice(2);

if (!sportIdArg || !leagueIdArg || !seasonIdArg || !targetTimezoneArg) {
  console.error('Usage: node scripts/repair_season_match_timezone.js <sportId> <leagueId> <seasonId> <targetTimezone> [sourceTimezone]');
  process.exit(1);
}

const sportId = Number(sportIdArg);
const leagueId = Number(leagueIdArg);
const seasonId = Number(seasonIdArg);
const targetTimezone = targetTimezoneArg;
const sourceTimezone = sourceTimezoneArg || Intl.DateTimeFormat().resolvedOptions().timeZone;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function formatInTimezone(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

async function main() {
  await pool.query('BEGIN');

  const matchesRes = await pool.query(
    `
      select id, date
      from matches
      where sport_id = $1 and league_id = $2 and season_id = $3
      order by id asc
    `,
    [sportId, leagueId, seasonId],
  );

  for (const row of matchesRes.rows) {
    const storedDate = row.date instanceof Date ? row.date : new Date(row.date);
    if (Number.isNaN(storedDate.getTime())) continue;

    const recoveredUtcWallClock = formatInTimezone(storedDate, sourceTimezone);
    const recoveredUtcInstant = new Date(recoveredUtcWallClock.replace(' ', 'T') + 'Z');
    const correctedLocalTimestamp = formatInTimezone(recoveredUtcInstant, targetTimezone);

    await pool.query(`update matches set date = $2, updated_at = now() where id = $1`, [row.id, correctedLocalTimestamp]);
    await pool.query(`update standings set match_date = $2, updated_at = now() where match_id = $1`, [row.id, correctedLocalTimestamp]);
  }

  await pool.query('COMMIT');
  console.log(`Repaired ${matchesRes.rows.length} match timestamps for ${sportId}/${leagueId}/${seasonId} -> ${targetTimezone}.`);
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    try {
      await pool.query('ROLLBACK');
    } catch {}
    console.error(error);
    await pool.end();
    process.exit(1);
  });