import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class ApiService {
  private readonly logger = new Logger(ApiService.name);

  // Store pasted/imported payload into a transitional table
  async importData(payload: any) {
    if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS api_transitional (
          id SERIAL PRIMARY KEY,
          league INTEGER,
          season INTEGER,
          sport INTEGER,
          source_url TEXT,
          payload JSONB,
          fetched_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      const res = await pool.query(
        `INSERT INTO api_transitional (payload) VALUES ($1) RETURNING id, fetched_at;`,
        [payload],
      );
      this.logger.log(`Inserted api_transitional id=${res.rows[0].id}`);
      return { id: res.rows[0].id, fetched_at: res.rows[0].fetched_at };
    } finally {
      await pool.end();
    }
  }

  // Extract structured first-row metadata and match rows with specific keys
  async extractStructuredFromTransitional(id: number) {
    const row = await this.getTransitional(id);
    if (!row) return { found: false };
    const payload = row.payload ?? row;

    // Find candidate array same as parseTransitional
    let arr: any[] | null = null;
    if (Array.isArray(payload)) arr = payload as any[];
    else if (payload?.response && Array.isArray(payload.response)) arr = payload.response;
    else if (payload?.data && Array.isArray(payload.data)) arr = payload.data;
    else if (payload?.results && Array.isArray(payload.results)) arr = payload.results;

    if (!arr) {
      const stack = [payload];
      const seen = new Set();
      while (stack.length) {
        const cur = stack.shift();
        if (!cur || typeof cur !== 'object') continue;
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const k of Object.keys(cur)) {
          const v = cur[k];
          if (Array.isArray(v)) {
            arr = v;
            break;
          }
          if (v && typeof v === 'object') stack.push(v);
        }
        if (arr) break;
      }
    }

    // Helper to safely get nested paths
    const get = (obj: any, path: string) => {
      if (!obj) return null;
      return path.split('.').reduce((acc: any, key: string) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
    };

    // Prepare first-row metadata: prefer top-level league info from the first fixture or payload
    let firstRow: Record<string, any> = {};
    const sample = (Array.isArray(arr) && arr.length) ? arr[0] : payload;
    if (sample) {
      firstRow['league.name'] = get(sample, 'league.name') ?? get(payload, 'league.name') ?? null;
      firstRow['league.season'] = get(sample, 'league.season') ?? get(payload, 'league.season') ?? null;
      firstRow['league.country'] = get(sample, 'league.country') ?? get(payload, 'league.country') ?? null;
      firstRow['league.flag'] = get(sample, 'league.flag') ?? get(payload, 'league.flag') ?? null;
    }

    // Build matches rows based on requested keys
    const matches: Record<string, any>[] = [];
    if (Array.isArray(arr)) {
      for (const it of arr) {
        const m: Record<string, any> = {};
        m['league.round'] = get(it, 'league.round') ?? null;
        m['goals.away'] = get(it, 'goals.away') ?? null;
        m['goals.home'] = get(it, 'goals.home') ?? null;
        m['score.halftime.away'] = get(it, 'score.halftime.away') ?? get(it, 'score.halftime?.away') ?? null;
        m['score.halftime.home'] = get(it, 'score.halftime.home') ?? get(it, 'score.halftime?.home') ?? null;
        m['teams.away.name'] = get(it, 'teams.away.name') ?? null;
        m['teams.home.name'] = get(it, 'teams.home.name') ?? null;
        m['fixture.date'] = get(it, 'fixture.date') ?? null;
        m['fixture.venue.city'] = get(it, 'fixture.venue.city') ?? null;
        m['fixture.venue.name'] = get(it, 'fixture.venue.name') ?? null;
        m['fixture.status.long'] = get(it, 'fixture.status.long') ?? null;
        m['fixture.status.short'] = get(it, 'fixture.status.short') ?? null;
        // prefer long status when available
        m['fixture.status'] = m['fixture.status.long'] ?? m['fixture.status.short'] ?? null;
        m['fixture.timestamp'] = get(it, 'fixture.timestamp') ?? null;
        matches.push(m);
      }
    }

    return { found: true, firstRow, matches };
  }

  // Fetch from external API (api-football) and store full JSON response
  async fetchAndStore(league: number, season: number, sport?: number) {
    if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const apiKey = process.env.API_FOOTBALL_KEY || process.env.APISPORTS_KEY;
      if (!apiKey) throw new Error('Missing API key: set API_FOOTBALL_KEY or APISPORTS_KEY');

      const url = new URL('https://v3.football.api-sports.io/fixtures');
      if (season) url.searchParams.set('season', String(season));
      if (league) url.searchParams.set('league', String(league));

      this.logger.log(`Fetching external API: ${url.toString()}`);
      const resp = await fetch(url.toString(), { headers: { 'x-apisports-key': apiKey } });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`External API error ${resp.status}: ${txt}`);
      }
      const json = await resp.json();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS api_transitional (
          id SERIAL PRIMARY KEY,
          league INTEGER,
          season INTEGER,
          sport INTEGER,
          source_url TEXT,
          payload JSONB,
          fetched_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      const insertRes = await pool.query(
        `INSERT INTO api_transitional (league, season, sport, source_url, payload) VALUES ($1,$2,$3,$4,$5) RETURNING id, fetched_at;`,
        [league || null, season || null, sport || null, url.toString(), json],
      );
      this.logger.log(`Fetched and inserted api_transitional id=${insertRes.rows[0].id}`);
      return { id: insertRes.rows[0].id, fetched_at: insertRes.rows[0].fetched_at };
    } finally {
      await pool.end();
    }
  }

  // List transitional rows ordered by fetched_at desc
  async listTransitional(limit = 100) {
    if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const res = await pool.query(
        `SELECT id, league, season, sport, source_url, fetched_at FROM api_transitional ORDER BY fetched_at DESC LIMIT $1`,
        [limit],
      );
      return res.rows;
    } finally {
      await pool.end();
    }
  }

  // Get single transitional row by id (including payload)
  async getTransitional(id: number) {
    if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const res = await pool.query(`SELECT * FROM api_transitional WHERE id = $1 LIMIT 1`, [id]);
      return res.rows[0] || null;
    } finally {
      await pool.end();
    }
  }

  // Parse a transitional payload into tabular rows/columns
  async parseTransitional(id: number) {
    const row = await this.getTransitional(id);
    if (!row) return { found: false };
// console.log('Parsing transitional id=', id, 'payload=', row.payload);
    const payload = row.payload ?? row;
// console.log('Payload to parse:', payload);
    // helper: get candidate array from common places
    let arr: any[] | null = null;
// console.log('Finding array in payload...');
    if (Array.isArray(payload)) arr = payload as any[];
    else if (payload?.response && Array.isArray(payload.response)) arr = payload.response;
    else if (payload?.data && Array.isArray(payload.data)) arr = payload.data;
    else if (payload?.results && Array.isArray(payload.results)) arr = payload.results;
// console.log('Candidate array found:', arr);
    // If still not an array, try to find first array nested inside payload
    if (!arr) {
      const stack = [payload];
      const seen = new Set();
      while (stack.length) {
        const cur = stack.shift();
        if (!cur || typeof cur !== 'object') continue;
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const k of Object.keys(cur)) {
          const v = cur[k];
          if (Array.isArray(v)) {
            arr = v;
            break;
          }
          if (v && typeof v === 'object') stack.push(v);
        }
        if (arr) break;
      }
    }
// console.log('Final array to parse:', arr);
    // If still no array, fall back to single-row table from payload
    let rows: any[];
// console.log('Preparing rows for flattening...');
    if (!arr) {
      rows = [payload];
    } else {
      rows = arr;
    }
// console.log('Rows before flattening:', rows);
    // Flatten helper (nested objects -> dot notation; arrays -> JSON string)
    const flatten = (obj: any, prefix = '') => {
      const out: Record<string, any> = {};
      if (obj === null || obj === undefined) return out;
      if (typeof obj !== 'object') {
        out[prefix || 'value'] = obj;
        return out;
      }
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        const key = prefix ? `${prefix}.${k}` : k;
        if (v === null || v === undefined) {
          out[key] = v;
        } else if (Array.isArray(v)) {
          try {
            out[key] = JSON.stringify(v);
          } catch (e) {
            out[key] = String(v);
          }
        } else if (typeof v === 'object' && !(v instanceof Date)) {
          const nested = flatten(v, key);
          Object.assign(out, nested);
        } else if (v instanceof Date) {
          out[key] = v.toISOString();
        } else {
          out[key] = v;
        }
      }
      return out;
    };

    const flatRows = rows.map((r) => flatten(r));
    // collect columns
    const columns = Array.from(new Set(flatRows.flatMap(Object.keys)));
// console.log('Flattened rows:', flatRows);
// console.log('Columns:', columns);

    return { found: true, columns, rows: flatRows };
  }

  // Apply parsed transitional rows into a target table with dry-run and audit support
  async applyTransitional(
    id: number,
    options: { dryRun?: boolean; targetTable?: string; mapping?: Record<string, string> } = {},
  ) {
    if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      // Ensure audit table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_transitional_audit (
          id SERIAL PRIMARY KEY,
          transitional_id INTEGER,
          action TEXT,
          payload JSONB,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      const parsed = await this.parseTransitional(id);
      if (!parsed || !parsed.found) return { applied: 0, reason: 'not_found' };

      const rows = parsed.rows || [];
      if (!rows.length) return { applied: 0, reason: 'no_rows' };

      // If no target table specified, just return parsed preview
      if (!options.targetTable) {
        return { applied: 0, preview: { columns: parsed.columns, rows } };
      }

      const target = options.targetTable;

      // Fetch target table columns
      const colRes = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [target],
      );
      if (!colRes.rows.length) return { applied: 0, reason: 'target_not_found' };
      const targetCols = colRes.rows.map((r) => r.column_name);

      // Determine insertable columns
      let insertCols: string[] = [];
      let mapping: Record<string, string> | undefined = options.mapping;
      if (mapping && Object.keys(mapping).length) {
        // mapping: targetColumn -> sourceColumn
        insertCols = Object.keys(mapping).filter((tc) => targetCols.includes(tc));
        if (!insertCols.length) return { applied: 0, reason: 'no_matching_columns' };
      } else {
        // default intersection between parsed columns and target columns
        insertCols = parsed.columns.filter((c) => targetCols.includes(c));
        if (!insertCols.length) return { applied: 0, reason: 'no_matching_columns' };
      }

      // Begin transaction
      await client.query('BEGIN');
      let applied = 0;
      for (const r of rows) {
        const values = insertCols.map((c) => {
          if (mapping && mapping[c]) {
            return r[mapping[c]] === undefined ? null : r[mapping[c]];
          }
          return r[c] === undefined ? null : r[c];
        });
        const params = values.map((_, i) => `$${i + 1}`).join(',');
        const sql = `INSERT INTO ${target} (${insertCols.join(',')}) VALUES (${params}) RETURNING *`;
        try {
          if (!options.dryRun) {
            await client.query(sql, values);
          }
          applied += 1;
        } catch (e) {
          // On insert error, record and continue to allow auditing of failures
          await client.query(
            `INSERT INTO api_transitional_audit (transitional_id, action, payload) VALUES ($1,$2,$3)`,
            [id, 'insert_error', { error: String(e), row: r }],
          );
        }
      }

      // Insert audit record for the load attempt
      await client.query(`INSERT INTO api_transitional_audit (transitional_id, action, payload) VALUES ($1,$2,$3)`, [
        id,
        options.dryRun ? 'dry_run' : 'applied',
        { target, applied, dryRun: !!options.dryRun },
      ]);

      if (options.dryRun) {
        await client.query('ROLLBACK');
      } else {
        await client.query('COMMIT');
      }

      return { applied, dryRun: !!options.dryRun };
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      this.logger.error('applyTransitional error', e as any);
      return { applied: 0, error: String(e) };
    } finally {
      client.release();
      await pool.end();
    }
  }

  // Return column names for a target table
  async getTableColumns(tableName: string) {
    if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const res = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
        [tableName],
      );
      return res.rows.map((r) => r.column_name);
    } finally {
      await pool.end();
    }
  }

  // Apply first-row processing: upsert country, league, season based on parsed first row
  async applyFirstRowToApp(id: number, options: { sportId?: number } = {}) {
    if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      // Ensure import log table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_import_log (
          id SERIAL PRIMARY KEY,
          transitional_id INTEGER,
          message TEXT,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      const parsed = await this.parseTransitional(id);
      if (!parsed || !parsed.found) return { applied: false, reason: 'not_found' };
      const rows = parsed.rows || [];
      if (!rows.length) return { applied: false, reason: 'no_rows' };

      // Use first row for league/season metadata
      const first = rows[0];
      // Validate required first-row fields per process spec
      const requiredFirst = ['league.name', 'league.season', 'league.country'];
      const missing: string[] = [];
      for (const k of requiredFirst) {
        const v = first[k] ?? first[k.replace('league.', '')];
        if (v === null || v === undefined || String(v).trim() === '') missing.push(k);
      }
      if (missing.length) {
        // Log import error and abort
        const logRes = await client.query(
          `INSERT INTO api_import_log (transitional_id, message, details) VALUES ($1,$2,$3) RETURNING id`,
          [id, 'format_invalid_first_row', { missing, parsedColumns: parsed.columns }],
        );
        return { applied: false, reason: 'format_invalid', missing, logId: logRes.rows[0].id };
      }
      // Helper to normalize keys (we expect dot-notated keys like 'league.name')
      const getVal = (key: string) => {
        return first[key] ?? null;
      };

      const leagueName = String(getVal('league.name') ?? getVal('league') ?? '').trim();
      const leagueSeason = getVal('league.season') ?? getVal('season') ?? null;
      const leagueCountry = String(getVal('league.country') ?? getVal('country') ?? '').trim();
      const leagueFlag = getVal('league.flag') ?? null;

      await client.query('BEGIN');

      // Upsert country: try to find by name (case-insensitive)
      let countryId: number | null = null;
      if (leagueCountry) {
        const cRes = await client.query(`SELECT id FROM countries WHERE lower(name) = lower($1) LIMIT 1`, [leagueCountry]);
        if (cRes.rows.length) {
          countryId = cRes.rows[0].id;
        } else {
          const code = leagueCountry.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || null;
          const ins = await client.query(
            `INSERT INTO countries (name, code, flag, continent) VALUES ($1,$2,$3,$4) RETURNING id`,
            [leagueCountry, code, leagueFlag || null, 'Europe'],
          );
          countryId = ins.rows[0].id;
        }
      }

      // Upsert league: try to find by original_name or secondary_name using country and sport if available
      let leagueId: number | null = null;
      if (leagueName) {
        const sportId = options.sportId ?? null;
        const q = `SELECT id FROM leagues WHERE (original_name = $1 OR secondary_name = $1)` + (countryId ? ' AND country_id = $2' : '') + (sportId ? ' AND sport_id = $3' : '') + ' LIMIT 1';
        const params: any[] = [leagueName];
        if (countryId) params.push(countryId);
        if (sportId) params.push(sportId);
        const lRes = await client.query(q, params);
        if (lRes.rows.length) {
          leagueId = lRes.rows[0].id;
        } else {
          // Insert minimal league row per spec
          const ins = await client.query(
            `INSERT INTO leagues (sport_id, country_id, image_url, original_name, secondary_name, city_id, number_of_rounds_matches, min_divisions_number, max_divisions_number, division_time, has_ascends, ascends_quantity, has_descends, descends_quantity, has_subleagues, number_of_sub_leagues, flg_default, flg_round_automatic, type_of_schedule) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
            [
              options.sportId ?? null,
              countryId,
              leagueFlag || null,
              leagueName,
              leagueName,
              null,
              100,
              2,
              2,
              45,
              true,
              10,
              true,
              10,
              false,
              0,
              false,
              true,
              'Round',
            ],
          );
          leagueId = ins.rows[0].id;
        }
      }

      // Upsert season: check by sport_id, league_id, start_year
      let seasonId: number | null = null;
      if (leagueSeason && leagueId) {
        const sRes = await client.query(
          `SELECT id FROM seasons WHERE sport_id = $1 AND league_id = $2 AND start_year = $3 LIMIT 1`,
          [options.sportId ?? null, leagueId, leagueSeason],
        );
        if (sRes.rows.length) {
          seasonId = sRes.rows[0].id;
        } else {
          const ins = await client.query(
            `INSERT INTO seasons (sport_id, league_id, status, flg_default, number_of_groups, start_year, end_year) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
            [options.sportId ?? null, leagueId, 'Finished', false, 0, leagueSeason, leagueSeason],
          );
          seasonId = ins.rows[0].id;
        }
      }

      await client.query('COMMIT');

      return { applied: true, countryId, leagueId, seasonId };
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      this.logger.error('applyFirstRowToApp error', e as any);
      return { applied: false, error: String(e) };
    } finally {
      client.release();
      await pool.end();
    }
  }
}
