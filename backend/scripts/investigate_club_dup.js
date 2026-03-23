const { Pool } = require('pg');
const path = require('path');
// Load backend .env explicitly so this script works when run from workspace root
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {
  // ignore if dotenv isn't installed globally; rely on process.env as fallback
}

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL environment variable');
    process.exit(2);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const transitionalId = 29;
    console.log('Querying api_transitional id=', transitionalId);
    const tRes = await pool.query('SELECT id, origin, fetched_at, payload FROM api_transitional WHERE id = $1 LIMIT 1', [transitionalId]);
    if (!tRes.rows.length) {
      console.log('No transitional row found for id', transitionalId);
      process.exit(0);
    }
    const tr = tRes.rows[0];
    console.log('\n-- transitional row --');
    console.log({ id: tr.id, origin: tr.origin, fetched_at: tr.fetched_at });

    // Print a small summary of payload keys and sample locations for team names
    const payload = tr.payload || {};

    // Helper: find team names by digging common patterns
    function collectTeamNames(obj, out = new Set()) {
      if (!obj || typeof obj !== 'object') return out;
      if (Array.isArray(obj)) {
        for (const it of obj) collectTeamNames(it, out);
        return out;
      }
      // teams.home.name pattern
      if (obj.teams && obj.teams.home && obj.teams.home.name) out.add(String(obj.teams.home.name));
      if (obj.teams && obj.teams.away && obj.teams.away.name) out.add(String(obj.teams.away.name));
      // competitors / competitors[].team.name (ESPN)
      if (obj.competitors && Array.isArray(obj.competitors)) {
        for (const c of obj.competitors) {
          if (c.team && (c.team.displayName || c.team.name || c.team.shortDisplayName)) {
            out.add(String(c.team.displayName || c.team.name || c.team.shortDisplayName));
          }
          if (c.team && c.team.id) out.add(String(c.team.id));
        }
      }
      // direct team objects
      if (obj.team && (obj.team.name || obj.team.displayName || obj.team.shortDisplayName)) out.add(String(obj.team.name || obj.team.displayName || obj.team.shortDisplayName));

      for (const k of Object.keys(obj)) {
        try { collectTeamNames(obj[k], out); } catch (e) {}
      }
      return out;
    }

    const teamNames = Array.from(collectTeamNames(payload)).slice(0, 10);
    console.log('\n-- candidate team names (sample) --');
    console.log(teamNames);

    console.log('\n-- Fetch clubs 339 and 348 --');
    const clubsRes = await pool.query('SELECT id, name, short_name, country_id, image_url, created_at FROM clubs WHERE id IN ($1,$2) ORDER BY id', [339, 348]);
    console.log(clubsRes.rows);

    const countryIds = Array.from(new Set(clubsRes.rows.map(r => r.country_id).filter(Boolean)));
    if (countryIds.length) {
      const cRes = await pool.query(`SELECT id, name, code FROM countries WHERE id = ANY($1::int[])`, [countryIds]);
      console.log('\n-- countries for those clubs --');
      console.log(cRes.rows);
    } else {
      console.log('\n-- No country_id found on those clubs --');
    }

    // Run the same lookup queries the ETL code uses for each candidate name and each country_id
    console.log('\n-- Simulate ETL club lookup using candidate names and country ids --');
    const lookupSqlExact = `SELECT id, name, short_name, country_id FROM clubs WHERE (lower(short_name)=lower($1) OR lower(name)=lower($1)) AND country_id = $2 LIMIT 1`;
    const lookupSqlLike = `SELECT id, name, short_name, country_id FROM clubs WHERE (name ILIKE $1 OR short_name ILIKE $1) AND country_id = $2 LIMIT 1`;
    for (const name of teamNames) {
      for (const cid of (countryIds.length ? countryIds : [null])) {
        try {
          const p1 = cid;
          const exact = cid ? await pool.query(lookupSqlExact, [name, cid]) : { rows: [] };
          const like = cid ? await pool.query(lookupSqlLike, [`%${name}%`, cid]) : { rows: [] };
          console.log(`\nLookup name='${name}' country_id=${cid}`);
          console.log(' exact:', exact.rows);
          console.log(' like :', like.rows);
        } catch (e) {
          console.error('Lookup failed', e);
        }
      }
    }

    // Also show if any clubs exist with the same normalized name regardless of country
    console.log('\n-- Clubs matching normalized name ignoring country (for troubleshooting) --');
    const normalize = (s) => String(s ?? '').trim().toLowerCase();
    for (const name of teamNames) {
      const n = normalize(name);
      const anyRes = await pool.query(`SELECT id, name, short_name, country_id FROM clubs WHERE lower(name) = $1 OR lower(short_name) = $1 LIMIT 5`, [n]);
      console.log(`\nNormalized lookup '${n}':`, anyRes.rows);
    }

    console.log('\n-- Done --');
  } catch (err) {
    console.error('Error during investigation:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
})();
