import { Injectable, Logger } from '@nestjs/common';
import { StandingsCalculatorService } from '../standings/standings-calculator.service';
import { Pool } from 'pg';
import { matches } from 'class-validator/types/decorator/string/Matches';
import { eq } from 'drizzle-orm/sql/expressions/conditions';

// Shared normalization helpers used across functions in this module
const normalizeText = (value: any) => String(value ?? '').trim();
const normalizeLookupKey = (value: any) =>
    normalizeText(value)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '')
        .trim();

@Injectable()
export class ApiService {
    private readonly logger = new Logger(ApiService.name);

    // Store pasted/imported payload into a transitional table
    async importData(payload: any) {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        // declare insertCols in function scope so catch blocks can reference it for diagnostics
        let insertCols: string[] = [];
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS api_transitional (
                id SERIAL PRIMARY KEY,
                league VARCHAR(255),
                season INTEGER,
                sport INTEGER,
                origin TEXT,
                source_url TEXT,
                payload JSONB,
                status BOOLEAN DEFAULT false,
                fetched_at TIMESTAMPTZ DEFAULT now(),
                season_status VARCHAR(20) DEFAULT 'Finished'::character varying,
                flg_season_default BOOLEAN DEFAULT false,
                flg_season_same_years BOOLEAN DEFAULT false,
                league_schedule_type TEXT DEFAULT 'Round',
                flg_League_default BOOLEAN DEFAULT false,
                flg_has_divisions BOOLEAN DEFAULT true,
                flg_run_in_background BOOLEAN DEFAULT true
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
            // Extract league image from ESPN payload structure (payload.leagues[0].logos[0].href)
            firstRow['league.image'] = get(sample, 'league.image') ?? get(payload, 'league.image') ?? payload?.leagues?.[0]?.logos?.[0]?.href ?? null;
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

    // Fetch from external API and store full JSON response
    // origin: 'Api-Football' (default) or 'Api-Espn'
    async fetchAndStore(
        league: string,
        season: number,
        sport?: number,
        origin?: string,
        startDate?: string,
        endDate?: string,
        seasonStatus?: boolean | string,
        isSeasonDefault?: boolean,
        sameYears?: boolean,
        scheduleType?: string,
        isLeagueDefault?: boolean,
        hasDivisions?: boolean,
        runInBackground?: boolean,
    ) {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const effectiveOrigin = origin || 'Api-Football';
        try {
            let url: URL;
            let headers: Record<string, string> = {};

            // Read sport name from `sports` table using numeric sport id (if provided)
            let sportName: string | null = null;
            try {
                if (sport !== undefined && sport !== null) {
                    const sRes = await pool.query(`SELECT name FROM sports WHERE id = $1 LIMIT 1`, [sport]);
                    if (sRes && sRes.rows && sRes.rows.length) sportName = sRes.rows[0].name ?? null;
                }
            } catch (err) {
                this.logger.debug(`Could not read sport name for id=${sport}: ${String(err)}`);
            }
            sportName = (sportName ?? 'football').toLowerCase();

            if (effectiveOrigin === 'Api-Espn') {
                // Normalize common names and map football -> soccer for ESPN
                if (sportName === 'football' || sportName === 'footaball') sportName = 'soccer';

                // ESPN API doesn't require API key for public endpoints
                // Build URL for ESPN scoreboard
                url = new URL(`https://site.api.espn.com/apis/site/v2/sports/${sportName}/${league}/scoreboard`);
                // url = new URL('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard');
                // url = new URL('https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard');
                // ESPN uses date range format: YYYYMMDD-YYYYMMDD
                if (startDate && endDate) {
                    const normalizedStartDate = startDate.replace(/-/g, '');
                    const normalizedEndDate = endDate.replace(/-/g, '');
                    url.searchParams.set('dates', `${normalizedStartDate}-${normalizedEndDate}`);
                    url.searchParams.set('limit', '1000');
                } else if (season) {
                    const fallbackStartDate = `${season}0801`;
                    const fallbackEndDate = `${Number(season) + 1}0531`;
                    url.searchParams.set('dates', `${fallbackStartDate}-${fallbackEndDate}`);
                    url.searchParams.set('limit', '1000');
                }
            } else {
                // Api-Football (default)
                const apiKey = process.env.APISPORTS_KEY;
                if (!apiKey) throw new Error('Missing API key: set API_FOOTBALL_KEY or APISPORTS_KEY');
                url = new URL(`https://v3.${sportName}.api-sports.io/fixtures`);
                if (season) url.searchParams.set('season', String(season));
                if (league) url.searchParams.set('league', (league));
                headers = { 'x-apisports-key': apiKey };
            }
            this.logger.log(`Fetching external API (${effectiveOrigin}): ${url.toString()}`);

            const resp = await fetch(url.toString(), { headers });
            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(`External API error ${resp.status}: ${txt}`);
            }
            const json = await resp.json();

            await pool.query(`
                CREATE TABLE IF NOT EXISTS api_transitional (
                id SERIAL PRIMARY KEY,
                league VARCHAR(255),
                season INTEGER,
                sport INTEGER,
                origin TEXT,
                source_url TEXT,
                payload JSONB,
                status BOOLEAN DEFAULT false,
                fetched_at TIMESTAMPTZ DEFAULT now(),
                season_status VARCHAR(20) DEFAULT 'Finished'::character varying,
                flg_season_default BOOLEAN DEFAULT false,
                flg_season_same_years BOOLEAN DEFAULT false,
                league_schedule_type TEXT DEFAULT 'Round',
                flg_League_default BOOLEAN DEFAULT false,
                flg_has_divisions BOOLEAN DEFAULT true,
                flg_run_in_background BOOLEAN DEFAULT true
                );
            `);

            const insertRes = await pool.query(
                `INSERT 
                        INTO api_transitional 
                             (league, season, sport, source_url, payload, origin, season_status, flg_season_default, 
                              flg_season_same_years, league_schedule_type, flg_League_default, flg_has_divisions, flg_run_in_background) 
                      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) 
                      RETURNING id, fetched_at;`,
                             [league || null, season || null, sport || null, url.toString(), json, effectiveOrigin, 
                             seasonStatus, isSeasonDefault, sameYears, scheduleType, isLeagueDefault, hasDivisions, runInBackground],
            );
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
                `SELECT id,
                        league,
                        season,
                        sport,
                        source_url,
                        status,
                        fetched_at,
                        COALESCE(origin, 'Api-Football') as origin,
                        season_status,
                        flg_season_default,
                        flg_season_same_years,
                        league_schedule_type,
                        flg_League_default,
                        flg_has_divisions,
                        flg_run_in_background
                 FROM api_transitional
                 ORDER BY fetched_at DESC LIMIT $1`,
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

    private async ensureRoundReviewTable(pool: Pool) {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS api_transitional_round_review (
        id SERIAL PRIMARY KEY,
        transitional_id INTEGER UNIQUE NOT NULL,
        overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        resolved_at TIMESTAMPTZ NULL
      );
    `);
    }

    async getRoundReview(id: number) {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        try {
            await this.ensureRoundReviewTable(pool);
            const res = await pool.query(
                `SELECT * FROM api_transitional_round_review WHERE transitional_id = $1 ORDER BY id DESC LIMIT 1`,
                [id],
            );
            return res.rows[0] || null;
        } finally {
            await pool.end();
        }
    }

    async saveRoundReview(id: number, overrides: Record<string, number>) {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        try {
            await this.ensureRoundReviewTable(pool);
            const normalizedOverrides = Object.fromEntries(
                Object.entries(overrides || {}).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Number(value)]),
            );
            const res = await pool.query(
                `INSERT INTO api_transitional_round_review (transitional_id, overrides, status, updated_at, resolved_at)
         VALUES ($1, $2, 'draft', now(), NULL)
         ON CONFLICT (transitional_id)
         DO UPDATE SET overrides = EXCLUDED.overrides, status = 'draft', updated_at = now(), resolved_at = NULL
         RETURNING *`,
                [id, normalizedOverrides],
            );
            return res.rows[0] || null;
        } finally {
            await pool.end();
        }
    }

    async resolveRoundReview(id: number, overrides?: Record<string, number>) {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        try {
            await this.ensureRoundReviewTable(pool);
            const normalizedOverrides = Object.fromEntries(
                Object.entries(overrides || {}).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Number(value)]),
            );
            const res = await pool.query(
                `INSERT INTO api_transitional_round_review (transitional_id, overrides, status, updated_at, resolved_at)
         VALUES ($1, $2, 'resolved', now(), now())
         ON CONFLICT (transitional_id)
         DO UPDATE SET overrides = EXCLUDED.overrides, status = 'resolved', updated_at = now(), resolved_at = now()
         RETURNING *`,
                [id, normalizedOverrides],
            );
            return res.rows[0] || null;
        } finally {
            await pool.end();
        }
    }

    async deleteRoundReview(id: number) {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        try {
            await this.ensureRoundReviewTable(pool);
            const res = await pool.query(
                `DELETE FROM api_transitional_round_review WHERE transitional_id = $1 RETURNING transitional_id`,
                [id],
            );
            return { deleted: !!res.rows[0] };
        } finally {
            await pool.end();
        }
    }

    private async getDraftRoundOverrides(id: number): Promise<Record<string, number>> {
        const review = await this.getRoundReview(id);
        if (!review || review.status !== 'draft') return {};
        const raw = review.overrides && typeof review.overrides === 'object' ? review.overrides : {};
        return Object.fromEntries(
            Object.entries(raw).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Number(value)]),
        );
    }

    // Delete a transitional row by id
    async deleteTransitional(id: number) {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        try {
            const res = await pool.query(`DELETE FROM api_transitional WHERE id = $1 RETURNING id`, [id]);
            if (res.rows && res.rows.length) {
                return { deleted: true, id: res.rows[0].id };
            }
            return { deleted: false };
        } finally {
            await pool.end();
        }
    }

    // Update fields on a transitional row (supports status and a few common fields)
    async updateTransitional(id: number, updates: any) {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        try {
            if (!updates || typeof updates !== 'object') return { updated: false };
            // only allow a whitelist of fields to be updated
            const allowed = ['status', 'league', 'season', 'sport', 'source_url', 'payload', 'origin'];
            const keys = Object.keys(updates).filter((k) => allowed.includes(k));
            if (!keys.length) return { updated: false };

            // Normalize boolean-like status values
            const params: any[] = [];
            const setParts: string[] = [];
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                let val = updates[key];
                if (key === 'status') {
                    if (typeof val === 'string') {
                        val = val === 'true' || val === '1' || val === 't';
                    }
                    val = !!val;
                }
                params.push(val);
                // parameter offset will start at $2 because $1 is id
                setParts.push(`${key} = $${i + 2}`);
            }

            const sql = `UPDATE api_transitional SET ${setParts.join(', ')} WHERE id = $1 RETURNING id, status`;
            const res = await pool.query(sql, [id, ...params]);
            if (res.rows && res.rows.length) {
                return { updated: true, id: res.rows[0].id, status: res.rows[0].status };
            }
            return { updated: false };
        } finally {
            await pool.end();
        }
    }

    // Parse a transitional payload into tabular rows/columns
    async parseTransitional(id: number, roundOverrides?: Record<string, number>) {
        const row = await this.getTransitional(id);
        if (!row) return { found: false };

        // ── Subsequent-load detection ────────────────────────────────────────
        // When rounds already exist for the league/season this payload belongs
        // to, skip the heavyweight ESPN round inference entirely and return a
        // lightweight extraction. The caller (frontend) will see found:true
        // with rows and go straight to the data table / T&L button.
        const origin = row.origin ?? 'Api-Football';
        if (origin === 'Api-Espn') {
            // row.league is the ESPN URL code (e.g. 'eng.1', 'esp.1') stored at fetch time.
            const espnLeagueCode: string | null = row.league ?? null;
            const meta = this.extractLeagueMetadata(row);

            if (meta.leagueName || espnLeagueCode) {
                const sportId = 36; // football default

                // Build candidate season years from BOTH the payload and the
                // stored row.season string (e.g. "2025/2026" → [2025, 2026]).
                const seasonYears: number[] = [];
                if (meta.leagueSeason != null && Number.isFinite(Number(meta.leagueSeason))) {
                    seasonYears.push(Number(meta.leagueSeason));
                }
                const rawSeasonStr = String(row.season ?? '');
                for (const m of (rawSeasonStr.match(/\d{4}/g) ?? [])) {
                    const y = Number(m);
                    if (Number.isFinite(y) && !seasonYears.includes(y)) seasonYears.push(y);
                }

                if (seasonYears.length > 0) {
                    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
                    try {
                        // Case-insensitive match: ESPN payload returns e.g.
                        // "Spanish LALIGA" while DB has "Spanish LaLiga".
                        const lRes = await pool.query(
                            `SELECT id FROM leagues WHERE (LOWER(original_name) = LOWER($1) OR LOWER(secondary_name) = LOWER($1) OR ($3::text IS NOT NULL AND espn_id = $3)) AND sport_id = $2 LIMIT 1`,
                            [String(meta.leagueName ?? '').trim(), sportId, espnLeagueCode],
                        );
                        if (lRes.rows.length) {
                            let seasonRow: any = null;
                            for (const year of seasonYears) {
                                const sRes = await pool.query(
                                    `SELECT id FROM seasons WHERE sport_id = $1 AND league_id = $2 AND (start_year = $3 OR end_year = $3) ORDER BY start_year DESC LIMIT 1`,
                                    [sportId, lRes.rows[0].id, year],
                                );
                                if (sRes.rows.length) { seasonRow = sRes.rows[0]; break; }
                            }
                            if (seasonRow) {
                                const roundsRes = await pool.query(
                                    `SELECT COUNT(*)::int as cnt FROM rounds WHERE league_id = $1 AND season_id = $2`,
                                    [lRes.rows[0].id, seasonRow.id],
                                );
                                if (Number(roundsRes.rows[0]?.cnt ?? 0) > 0) {
                                    const lightweight = this.parseTransitionalEspnLightweight(row);
                                    if (lightweight.found) {
                                        return { ...lightweight, isSubsequentLoad: true };
                                    }
                                }
                            }
                        }
                    } finally {
                        await pool.end();
                    }
                }
            }
        }

        const savedOverrides = await this.getDraftRoundOverrides(id);
        const effectiveRoundOverrides = { ...savedOverrides, ...(roundOverrides ?? {}) };
        // console.log('Parsing transitional id=', id, 'origin=', row.origin);
        // Check the origin and route to appropriate parser
        if (origin === 'Api-Espn') {
            return this.parseTransitionalEspn(row, effectiveRoundOverrides);
        }
        // Default: Api-Football parsing
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

    // Parse ESPN API response into tabular format
    // ESPN structure: events[] -> competitions[0] -> competitors[], venue, status
    private parseTransitionalEspn(row: any, roundOverrides?: Record<string, number>) {
        const payload = row.payload ?? row;
        // console.log('Parsing ESPN transitional id=', row.id, 'payload=', payload);
        // ESPN data structure: { events: [...] }
        const events = payload?.events ?? [];
        if (!Array.isArray(events) || events.length === 0) {
            return { found: false, reason: 'no_events_array' };
        }
        // console.log(`Found ${events.length} events in ESPN payload`);
        // Extract league info from the first event's season
        const firstEvent = events[0];
        const seasonInfo = firstEvent?.season ?? {};
        const leagueInfo = payload?.leagues?.[0] ?? {};
        // console.log('Extracted league info:', leagueInfo, 'season info:', seasonInfo);
        const getEspnRoundNumbers = (items: any[], overrides: Map<string, number> = new Map()) => {
            const roundByEventId = new Map<string, number>();
            const uniqueClubIds = new Set<string>();
            const reservedEventIds = new Set<string>();
            // console.log('Deriving round numbers for ESPN events...');
            const getTeamId = (competitor: any) => {
                const teamId = competitor?.team?.id ?? competitor?.id;
                return teamId !== undefined && teamId !== null ? String(teamId) : null;
            };
            // console.log('Helper getTeamId defined');
            const getTeamName = (competitor: any) =>
                competitor?.team?.displayName ?? competitor?.team?.shortDisplayName ?? competitor?.team?.name ?? null;
            const getTeamShortName = (competitor: any) =>
                competitor?.team?.shortDisplayName ?? competitor?.team?.abbreviation ?? competitor?.team?.displayName ?? competitor?.team?.name ?? null;
            for (const event of items) {
                const competition = event?.competitions?.[0];
                const competitors = competition?.competitors ?? [];
                for (const competitor of competitors) {
                    const teamId = getTeamId(competitor);
                    if (teamId) uniqueClubIds.add(teamId);
                }
            }
            // console.log('Unique club IDs found:', uniqueClubIds);
            const allTeamIds = Array.from(uniqueClubIds);
            const maxMatchesPerRound = uniqueClubIds.size >= 2 ? Math.floor(uniqueClubIds.size / 2) : null;
            const toUtcDay = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            // Use league-local day boundaries when clustering rounds.  ESPN provides
            // timestamps in UTC; clustering by UTC can split matches that share the
            // same local calendar day (e.g. Brasilia UTC-3) across two days. Prefer
            // the Brazil timezone for Brasileirão payloads so matches on the same
            // local date are grouped together. If Intl timeZone formatting isn't
            // available, fall back to UTC-based day calculation.
            const LEAGUE_TIMEZONE = 'America/Sao_Paulo';
            const toLocalDay = (date: Date) => {
                try {
                    const parts = new Intl.DateTimeFormat('en-GB', {
                        timeZone: LEAGUE_TIMEZONE,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    }).formatToParts(date);
                    const year = Number(parts.find((p) => p.type === 'year')?.value ?? date.getUTCFullYear());
                    const month = Number(parts.find((p) => p.type === 'month')?.value ?? (date.getUTCMonth() + 1));
                    const day = Number(parts.find((p) => p.type === 'day')?.value ?? date.getUTCDate());
                    return Date.UTC(year, month - 1, day);
                } catch (err) {
                    return toUtcDay(date);
                }
            };
            const formatLeagueLocalDate = (date: Date | null) => {
                if (!date) return null;
                try {
                    return new Intl.DateTimeFormat('en-CA', {
                        timeZone: LEAGUE_TIMEZONE,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    }).format(date);
                } catch (err) {
                    return date.toISOString().slice(0, 10);
                }
            };
            //  console.log('Calculated max matches per round:', maxMatchesPerRound);
            const sortableEvents = items
                .map((event: any, index: number) => {
                    const competition = event?.competitions?.[0];
                    const competitors = competition?.competitors ?? [];
                    const home = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0] ?? null;
                    const away = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1] ?? competitors.find((c: any) => c !== home) ?? null;
                    const rawDate = competition?.startDate ?? competition?.date ?? event?.date ?? null;
                    const parsedDate = rawDate ? new Date(String(rawDate)) : null;
                    return {
                        event,
                        index,
                        date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
                        homeId: getTeamId(home),
                        awayId: getTeamId(away),
                        homeName: getTeamName(home),
                        awayName: getTeamName(away),
                        homeShortName: getTeamShortName(home),
                        awayShortName: getTeamShortName(away),
                    };
                })
                .filter((item) => item.date !== null)
                .sort((left, right) => left.date!.getTime() - right.date!.getTime());
            const expectedRoundCount = maxMatchesPerRound !== null
                ? Math.max(1, Math.ceil(sortableEvents.length / maxMatchesPerRound))
                : null;
            const buildRoundSummary = (assignmentMap: Map<string, number>) => {
                const summaryByRound = new Map<number, {
                    round: number;
                    assignedMatches: number;
                    teamIds: Set<string>;
                    duplicateTeamIds: Set<string>;
                    eventIds: string[];
                    minDate: Date | null;
                    maxDate: Date | null;
                }>();

                for (const entry of sortableEvents) {
                    const eventId = entry.event?.id !== undefined && entry.event?.id !== null ? String(entry.event.id) : null;
                    if (!eventId) continue;
                    const assignedRound = assignmentMap.get(eventId);
                    if (assignedRound === undefined || assignedRound === null) continue;

                    let bucket = summaryByRound.get(assignedRound);
                    if (!bucket) {
                        bucket = {
                            round: assignedRound,
                            assignedMatches: 0,
                            teamIds: new Set<string>(),
                            duplicateTeamIds: new Set<string>(),
                            eventIds: [],
                            minDate: null,
                            maxDate: null,
                        };
                        summaryByRound.set(assignedRound, bucket);
                    }

                    bucket.assignedMatches += 1;
                    bucket.eventIds.push(eventId);
                    if (entry.date) {
                        if (!bucket.minDate || entry.date.getTime() < bucket.minDate.getTime()) bucket.minDate = entry.date;
                        if (!bucket.maxDate || entry.date.getTime() > bucket.maxDate.getTime()) bucket.maxDate = entry.date;
                    }
                    for (const teamId of [entry.homeId, entry.awayId]) {
                        if (!teamId) continue;
                        if (bucket.teamIds.has(teamId)) bucket.duplicateTeamIds.add(teamId);
                        bucket.teamIds.add(teamId);
                    }
                }

                const highestAssignedRound = Math.max(0, ...Array.from(summaryByRound.keys()));
                const inferredRoundCount = expectedRoundCount !== null
                    ? expectedRoundCount
                    : highestAssignedRound;

                const roundSummary = Array.from({ length: inferredRoundCount }, (_, idx) => {
                    const round = idx + 1;
                    const bucket = summaryByRound.get(round);
                    const assignedMatches = bucket?.assignedMatches ?? 0;
                    const duplicateTeamIds = bucket?.duplicateTeamIds ?? new Set<string>();
                    const missingMatches = maxMatchesPerRound !== null ? Math.max(maxMatchesPerRound - assignedMatches, 0) : 0;
                    const status = duplicateTeamIds.size > 0
                        ? 'conflict'
                        : maxMatchesPerRound !== null && assignedMatches === maxMatchesPerRound
                            ? 'complete'
                            : assignedMatches > 0
                                ? 'incomplete'
                                : 'empty';

                    return {
                        round,
                        assignedMatches,
                        expectedMatches: maxMatchesPerRound,
                        missingMatches,
                        duplicateTeamIds: Array.from(duplicateTeamIds),
                        eventIds: bucket?.eventIds ?? [],
                        startDate: formatLeagueLocalDate(bucket?.minDate ?? null),
                        endDate: formatLeagueLocalDate(bucket?.maxDate ?? null),
                        dateRange: bucket?.minDate
                            ? bucket?.maxDate && formatLeagueLocalDate(bucket.maxDate) !== formatLeagueLocalDate(bucket.minDate)
                                ? `${formatLeagueLocalDate(bucket.minDate)} to ${formatLeagueLocalDate(bucket.maxDate)}`
                                : `${formatLeagueLocalDate(bucket.minDate)}`
                            : null,
                        status,
                    };
                });

                return { roundSummary, summaryByRound, inferredRoundCount };
            };
            const buildReviewDetails = (
                message: string,
                currentEventItem: (typeof sortableEvents)[number] | null,
                highlightedEventIds: string[] = [],
            ) => {
                const { roundSummary, summaryByRound, inferredRoundCount } = buildRoundSummary(roundByEventId);
                const teamNamesById = new Map<string, string>();
                for (const entry of sortableEvents) {
                    if (entry.homeId && entry.homeName && !teamNamesById.has(entry.homeId)) teamNamesById.set(entry.homeId, entry.homeName);
                    if (entry.awayId && entry.awayName && !teamNamesById.has(entry.awayId)) teamNamesById.set(entry.awayId, entry.awayName);
                }

                const maxCandidateRound = expectedRoundCount ?? inferredRoundCount;
                const highlightedSet = new Set(highlightedEventIds);

                const reviewMatches = sortableEvents.map((entry) => {
                    const eventId = entry.event?.id !== undefined && entry.event?.id !== null ? String(entry.event.id) : null;
                    const competition = entry.event?.competitions?.[0];
                    const competitors: any[] = competition?.competitors ?? [];
                    const home = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0] ?? null;
                    const away = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1] ?? null;
                    const status = competition?.status?.type ?? {};
                    const assignedRound = eventId ? roundByEventId.get(eventId) ?? null : null;
                    const isOutOfRangeAssignment = assignedRound !== null && expectedRoundCount !== null && assignedRound > expectedRoundCount;
                    const candidateRounds: number[] = [];

                    if (maxMatchesPerRound !== null && entry.homeId && entry.awayId) {
                        for (let round = 1; round <= maxCandidateRound; round++) {
                            const bucket = summaryByRound.get(round);
                            const teamIds = bucket?.teamIds ?? new Set<string>();
                            const assignedMatches = bucket?.assignedMatches ?? 0;
                            const currentAssignment = assignedRound === round;
                            const canFitTeams = currentAssignment || (!teamIds.has(entry.homeId) && !teamIds.has(entry.awayId));
                            const canFitSize = currentAssignment || assignedMatches < maxMatchesPerRound;
                            if (canFitTeams && canFitSize) candidateRounds.push(round);
                        }
                    }

                    return {
                        id: eventId,
                        eventId,
                        date: competition?.date ?? entry.date?.toISOString() ?? null,
                        leagueLocalDate: formatLeagueLocalDate(entry.date ?? null),
                        homeTeam: entry.homeName,
                        awayTeam: entry.awayName,
                        homeShortName: entry.homeShortName,
                        awayShortName: entry.awayShortName,
                        homeId: entry.homeId,
                        awayId: entry.awayId,
                        venueName: competition?.venue?.fullName ?? competition?.venue?.shortName ?? null,
                        venueCity: competition?.venue?.address?.city ?? null,
                        homeScore: home?.score != null ? Number(home.score) : null,
                        awayScore: away?.score != null ? Number(away.score) : null,
                        isCompleted: status?.completed ?? false,
                        statusLong: status?.description ?? null,
                        statusShort: status?.shortDetail ?? status?.detail ?? null,
                        assignedRound,
                        candidateRounds,
                        needsReview: assignedRound === null || isOutOfRangeAssignment || (eventId ? highlightedSet.has(eventId) : true),
                        assignmentSource: eventId && overrides.has(eventId) ? 'manual' : assignedRound !== null ? 'automatic' : 'unassigned',
                    };
                });

                const validationErrors: Array<{ code: string; message: string; round?: number }> = [];
                const unassignedCount = reviewMatches.filter((match) => match.assignedRound === null).length;
                if (unassignedCount > 0) {
                    validationErrors.push({
                        code: 'unassigned_matches',
                        message: `${unassignedCount} matches still do not have a round assignment.`,
                    });
                }
                const outOfRangeCount = reviewMatches.filter((match) => match.assignedRound !== null && expectedRoundCount !== null && match.assignedRound > expectedRoundCount).length;
                if (outOfRangeCount > 0 && expectedRoundCount !== null) {
                    validationErrors.push({
                        code: 'round_overflow',
                        message: `${outOfRangeCount} matches were pushed beyond round ${expectedRoundCount}. They must be reassigned to one of the real league rounds.`,
                    });
                }
                for (const summary of roundSummary) {
                    if (summary.duplicateTeamIds.length > 0) {
                        validationErrors.push({
                            code: 'duplicate_team_in_round',
                            round: summary.round,
                            message: `Round ${summary.round} has teams assigned more than once.`,
                        });
                    }
                    if (summary.assignedMatches > 0 && summary.expectedMatches !== null && summary.assignedMatches !== summary.expectedMatches) {
                        validationErrors.push({
                            code: 'incomplete_round',
                            round: summary.round,
                            message: `Round ${summary.round} has ${summary.assignedMatches} of ${summary.expectedMatches} matches assigned.`,
                        });
                    }
                }

                return {
                    message,
                    currentEvent: currentEventItem
                        ? {
                            id: currentEventItem.event?.id ?? null,
                            date: currentEventItem.event?.date ?? currentEventItem.date?.toISOString() ?? null,
                            homeTeam: currentEventItem.homeName,
                            awayTeam: currentEventItem.awayName,
                            homeShortName: currentEventItem.homeShortName,
                            awayShortName: currentEventItem.awayShortName,
                        }
                        : null,
                    reviewMatches,
                    roundSummary,
                    validationErrors,
                    partialEvents: sortableEvents.map((entry) => ({
                        eventId: entry.event?.id ?? null,
                        date: entry.date ? entry.date.toISOString() : null,
                        homeId: entry.homeId,
                        awayId: entry.awayId,
                        homeName: entry.homeName,
                        awayName: entry.awayName,
                        homeShortName: entry.homeShortName,
                        awayShortName: entry.awayShortName,
                    })),
                    roundAssignments: Array.from(roundByEventId.entries()).map(([evId, r]) => ({ eventId: evId, round: r })),
                    reservedEventIds: Array.from(reservedEventIds),
                    allTeamIds: allTeamIds.map((teamId) => ({ id: teamId, name: teamNamesById.get(teamId) ?? teamId })),
                };
            };
            const buildReviewConflict = (
                message: string,
                currentEventItem: (typeof sortableEvents)[number] | null,
                highlightedEventIds: string[] = [],
            ) => {
                // NOTE: pruneSparseAutomaticRounds + compactAssignedRounds are called once
                // after the main loop (before overrides are applied).  Do NOT call them here
                // again — doing so would mutate the round map a second time and corrupt
                // manually-overridden assignments.

                const details = buildReviewDetails(message, currentEventItem, highlightedEventIds);
                if (details.validationErrors.length === 0 && details.reviewMatches.every((match) => match.assignedRound !== null)) {
                    return null;
                }

                return {
                    reason: 'needs_round_review',
                    message,
                    details,
                };
            };

            const ROUND_BOUNDARY_GAP_DAYS = 1;
            const SPARSE_ROUND_MATCH_THRESHOLD = 3;
            const openIncompleteRounds: Array<{ round: number; missingTeamIds: Set<string> }> = [];
            const reviewEventIds = new Set<string>();
            const addOpenIncompleteRound = (round: number, teamIdsInRound: Set<string>) => {
                const missingTeamIds = new Set(allTeamIds.filter((teamId) => !teamIdsInRound.has(teamId)));
                // Only keep a round open for automatic backfill when exactly one match is missing.
                // If more than one match is missing, later delayed fixtures must go to manual review.
                if (missingTeamIds.size !== 2) return;
                const existing = openIncompleteRounds.find((entry) => entry.round === round);
                if (existing) {
                    existing.missingTeamIds = missingTeamIds;
                    return;
                }
                openIncompleteRounds.push({ round, missingTeamIds });
            };

            const allEventIds = sortableEvents
                .map((entry) => (entry.event?.id !== undefined && entry.event?.id !== null ? String(entry.event.id) : null))
                .filter((eventId): eventId is string => !!eventId);
            const hasAuthoritativeOverrides = allEventIds.length > 0 && allEventIds.every((eventId) => overrides.has(eventId));
            if (hasAuthoritativeOverrides) {
                for (const eventId of allEventIds) {
                    roundByEventId.set(eventId, Number(overrides.get(eventId)));
                }

                const reviewDetails = buildReviewDetails(
                    'The provided round assignments need review before the import can continue.',
                    null,
                );

                if (reviewDetails.validationErrors.length > 0) {
                    return {
                        roundByEventId,
                        reservedEventIds,
                        conflict: {
                            reason: 'needs_round_review',
                            message: 'The provided round assignments are still invalid. Adjust the table and try again.',
                            details: reviewDetails,
                        },
                    };
                }

                return { roundByEventId, reservedEventIds, conflict: null };
            }

            const pruneSparseAutomaticRounds = () => {
                const { roundSummary, summaryByRound } = buildRoundSummary(roundByEventId);
                const prunedEventIds: string[] = [];

                for (const summary of roundSummary) {
                    if (summary.assignedMatches === 0 || summary.assignedMatches > SPARSE_ROUND_MATCH_THRESHOLD) continue;
                    const bucket = summaryByRound.get(summary.round);
                    if (!bucket?.eventIds?.length) continue;

                    const autoAssignedEventIds = bucket.eventIds.filter((eventId) => !overrides.has(eventId));
                    if (autoAssignedEventIds.length === 0) continue;


                    for (const eventId of autoAssignedEventIds) {
                        roundByEventId.delete(eventId);
                        reservedEventIds.delete(eventId);
                        reviewEventIds.add(eventId);
                        prunedEventIds.push(eventId);
                    }
                }

                return prunedEventIds;
            };

            const compactAssignedRounds = () => {
                const orderedRounds = Array.from(new Set(Array.from(roundByEventId.values()))).sort((left, right) => left - right);
                const remappedRounds = new Map<number, number>();

                orderedRounds.forEach((roundNumber, index) => {
                    remappedRounds.set(roundNumber, index + 1);
                });

                if (orderedRounds.every((roundNumber, index) => roundNumber === index + 1)) return;

                for (const [eventId, roundNumber] of Array.from(roundByEventId.entries())) {
                    const compactedRound = remappedRounds.get(roundNumber);
                    if (compactedRound !== undefined) {
                        roundByEventId.set(eventId, compactedRound);
                    }
                }
            };
            // console.log('Events sorted by date:', sortableEvents);
            let currentRound = 1;
            let previousDate: Date | null = null;
            let matchesInCurrentRound = 0;
            let currentRoundTeamIds = new Set<string>();
            let index = 0;
            // console.log('Beginning round assignment loop...');
            // console.log('Total sortable events:', sortableEvents.length);
            while (index < sortableEvents.length) {
                const item = sortableEvents[index];
                const currentDate = item.date!;
                const eventId = item.event?.id !== undefined && item.event?.id !== null ? String(item.event.id) : null;
                // console.log(`Processing event id ${eventId} at index ${index} with date ${currentDate.toISOString()}`);
                if (!item.homeId || !item.awayId) {
                    previousDate = currentDate;
                    index += 1;
                    continue;
                }
                // console.log(`Event ${eventId} has homeId ${item.homeId} and awayId ${item.awayId}`);
                if (eventId && reservedEventIds.has(eventId)) {
                    previousDate = currentDate;
                    index += 1;
                    continue;
                }
                if (eventId && overrides.has(eventId)) {
                    index += 1;
                    continue;
                }
                // console.log(`Event ${eventId} is not reserved. Checking round assignment...`);
                const roundReachedExpectedSize = maxMatchesPerRound !== null && matchesInCurrentRound >= maxMatchesPerRound;
                if (roundReachedExpectedSize) {
                    currentRound += 1;
                    matchesInCurrentRound = 0;
                    currentRoundTeamIds = new Set<string>();
                    previousDate = null;
                    continue;
                }
                if (previousDate) {
                    const diffInDays = Math.floor((toLocalDay(currentDate) - toLocalDay(previousDate)) / (24 * 60 * 60 * 1000));
                    const hasRestDayBetweenMatches = diffInDays > 1;
                    const shouldSplitByGap = maxMatchesPerRound === null && hasRestDayBetweenMatches;
                    if (shouldSplitByGap) {
                        currentRound += 1;
                        matchesInCurrentRound = 0;
                        currentRoundTeamIds = new Set<string>();
                        previousDate = null;
                        continue;
                    }

                    const hasStrongRoundBoundary = maxMatchesPerRound !== null && diffInDays > ROUND_BOUNDARY_GAP_DAYS;
                    if (hasStrongRoundBoundary && matchesInCurrentRound > 0) {
                        if (matchesInCurrentRound < (maxMatchesPerRound ?? 0)) {
                            addOpenIncompleteRound(currentRound, currentRoundTeamIds);
                        }
                        currentRound += 1;
                        matchesInCurrentRound = 0;
                        currentRoundTeamIds = new Set<string>();
                        previousDate = null;
                        continue;
                    }
                }

                const compatibleOpenRounds = openIncompleteRounds.filter((entry) => entry.missingTeamIds.has(item.homeId) && entry.missingTeamIds.has(item.awayId));
                if (compatibleOpenRounds.length > 1) {
                    if (eventId) reviewEventIds.add(eventId);
                    previousDate = currentDate;
                    index += 1;
                    continue;
                }
                if (compatibleOpenRounds.length === 1 && eventId) {
                    const targetRound = compatibleOpenRounds[0];
                    roundByEventId.set(eventId, targetRound.round);
                    targetRound.missingTeamIds.delete(item.homeId);
                    targetRound.missingTeamIds.delete(item.awayId);
                    if (targetRound.missingTeamIds.size === 0) {
                        const roundIndex = openIncompleteRounds.findIndex((entry) => entry.round === targetRound.round);
                        if (roundIndex >= 0) openIncompleteRounds.splice(roundIndex, 1);
                    }
                    index += 1;
                    continue;
                }
                // console.log(`Checking for team conflicts in round ${currentRound}...`);
                // console.log('666');
                const teamAlreadyInRound = currentRoundTeamIds.has(item.homeId) || currentRoundTeamIds.has(item.awayId);
                if (teamAlreadyInRound && maxMatchesPerRound !== null) {
                    const missingTeamIds = allTeamIds.filter((teamId) => !currentRoundTeamIds.has(teamId));
                    const teamNamesById = new Map<string, string>();
                    for (const entry of sortableEvents) {
                        if (entry.homeId && entry.homeName && !teamNamesById.has(entry.homeId)) teamNamesById.set(entry.homeId, entry.homeName);
                        if (entry.awayId && entry.awayName && !teamNamesById.has(entry.awayId)) teamNamesById.set(entry.awayId, entry.awayName);
                    }
                    // console.log(`Round ${currentRound} is missing teams:`, missingTeamIds);
                    // console.log('777');
                    if (missingTeamIds.length > 2) {
                        // Before declaring a fatal conflict, attempt to detect and unassign a
                        // "stray" event from the current round.  A stray is a rescheduled /
                        // makeup fixture that was greedily absorbed into the round because it
                        // happened to fall between two proper game-weeks (e.g. a midweek
                        // rescheduled match played 4+ days before the actual game-week cluster).
                        // Heuristic: if an already-assigned event for this round has a date
                        // that is strictly more than STRAY_THRESHOLD_DAYS before the current
                        // conflicting event's date, it is likely a stray.  Unassign it and
                        // retry the current loop iteration — all other logic is untouched.
                        const STRAY_THRESHOLD_DAYS = 3;
                        let strayCandidateId: string | null = null;
                        let strayCandidateItem: (typeof sortableEvents)[0] | null = null;
                        const currentRoundEntries = Array.from(roundByEventId.entries())
                            .filter(([, r]) => r === currentRound);
                        for (const [assignedEventId] of currentRoundEntries) {
                            const assignedItem = sortableEvents.find(
                                (se) => se.event?.id != null && String(se.event.id) === assignedEventId,
                            );
                            if (!assignedItem?.date) continue;
                            const daysBefore = Math.floor(
                                (toLocalDay(currentDate) - toLocalDay(assignedItem.date)) / (24 * 60 * 60 * 1000),
                            );
                            if (daysBefore > STRAY_THRESHOLD_DAYS) {
                                strayCandidateId = assignedEventId;
                                strayCandidateItem = assignedItem;
                                break;
                            }
                        }
                        if (strayCandidateId && strayCandidateItem) {
                            // Remove the stray from the current round regardless of whether we have an override
                            roundByEventId.delete(strayCandidateId);
                            if (strayCandidateItem.homeId) currentRoundTeamIds.delete(strayCandidateItem.homeId);
                            if (strayCandidateItem.awayId) currentRoundTeamIds.delete(strayCandidateItem.awayId);
                            matchesInCurrentRound -= 1;
                            const overrideRound = overrides.get(strayCandidateId);
                            if (overrideRound !== undefined) {
                                // Caller supplied a manual round assignment — apply it and retry
                                roundByEventId.set(strayCandidateId, overrideRound);
                                continue;
                            }
                            if (strayCandidateId) reviewEventIds.add(strayCandidateId);
                            continue;
                        }

                        if (eventId) reviewEventIds.add(eventId);
                        previousDate = currentDate;
                        index += 1;
                        continue;
                    }
                    // console.log(`Attempting to find replacement match for round ${currentRound} with missing teams...`);
                    // console.log('888');
                    if (missingTeamIds.length === 2) {
                        const [missingHomeId, missingAwayId] = missingTeamIds;

                        const foundReplacement = sortableEvents.find((candidate, candidateIndex) => {
                            if (candidateIndex <= index) return false;
                            const candidateEventId = candidate.event?.id !== undefined && candidate.event?.id !== null ? String(candidate.event.id) : null;
                            if (!candidateEventId || reservedEventIds.has(candidateEventId) || roundByEventId.has(candidateEventId)) return false;
                            return (
                                (candidate.homeId === missingHomeId && candidate.awayId === missingAwayId) ||
                                (candidate.homeId === missingAwayId && candidate.awayId === missingHomeId)
                            );
                        });
                        // console.log(`Replacement match ${foundReplacement ? `found with event id ${foundReplacement.event?.id}` : 'not found'} for missing teams ${missingTeamIds.join(', ')}`);
                        // console.log('999');
                        if (!foundReplacement) {
                            console.log('000');
                            // console.log(`No replacement match found for round ${currentRound} with missing teams ${missingTeamIds.join(', ')}. This may indicate an unplayed/postponed match or a data inconsistency.`);
                            addOpenIncompleteRound(currentRound, currentRoundTeamIds);
                            currentRound += 1;
                            matchesInCurrentRound = 0;
                            currentRoundTeamIds = new Set<string>();
                            previousDate = null;
                            continue;
                        }
                        // console.log(`Assigning replacement event id ${foundReplacement.event?.id} to round ${currentRound} for missing teams ${missingTeamIds.join(', ')}`);
                        const replacementEventId = String(foundReplacement.event.id);
                        roundByEventId.set(replacementEventId, currentRound);
                        reservedEventIds.add(replacementEventId);
                        matchesInCurrentRound += 1;
                        currentRoundTeamIds.add(missingHomeId);
                        currentRoundTeamIds.add(missingAwayId);
                        currentRound += 1;
                        matchesInCurrentRound = 0;
                        currentRoundTeamIds = new Set<string>();
                        previousDate = null;
                        continue;
                    }
                }
                // console.log(`Assigning event id ${eventId} to round ${currentRound}`);
                if (eventId) roundByEventId.set(eventId, currentRound);
                // console.log(`Incrementing matches in current round: ${matchesInCurrentRound + 1}`);
                matchesInCurrentRound += 1;
                currentRoundTeamIds.add(item.homeId);
                currentRoundTeamIds.add(item.awayId);
                previousDate = currentDate;
                index += 1;
                // console.log('Current round team IDs:', Array.from(currentRoundTeamIds));
            }
            // Prune sparse auto-only clusters and compact round numbering BEFORE
            // applying manual overrides.  This keeps round numbers deterministic
            // across reparses (the same data + same overrides = same mapping).
            // Run multiple passes: after prune+compact, previously-non-sparse rounds
            // may now be sparse (their events were unaffected but the round number
            // shifted into a slot that used to hold a pruned cluster).
            let totalPrunedEventIds: string[] = [];
            for (let pass = 0; pass < 5; pass++) {
                const pruned = pruneSparseAutomaticRounds();
                if (pruned.length === 0) break;
                totalPrunedEventIds = totalPrunedEventIds.concat(pruned);
                compactAssignedRounds();

            }
            const prunedSparseRoundEventIds = totalPrunedEventIds;

            // Overlay manual overrides AFTER prune+compact so they target stable
            // round numbers.  buildReviewConflict must NOT call prune+compact again.
            for (const [eventId, overrideRound] of overrides.entries()) {
                roundByEventId.set(eventId, Number(overrideRound));
            }

            // After applying manual overrides, check if any previously-occupied round
            // is now empty (all its games were moved elsewhere by the user).  When
            // that happens, compact the round numbering so subsequent rounds slide
            // down to fill the gap.  Only trigger this when manual overrides actually
            // created a hole — not on the initial automatic pass.
            if (overrides.size > 0) {
                const occupiedRounds = new Set(roundByEventId.values());
                const maxRound = Math.max(...occupiedRounds);
                let hasGap = false;
                for (let r = 1; r <= maxRound; r++) {
                    if (!occupiedRounds.has(r)) { hasGap = true; break; }
                }
                if (hasGap) {
                    compactAssignedRounds();
                }
            }

            const finalConflict = buildReviewConflict(
                prunedSparseRoundEventIds.length > 0
                    ? 'Automatic round derivation ignored isolated clusters of 1 to 3 games because they likely belong to other rounds. Review those fixtures manually.'
                    : 'Automatic round derivation completed as far as it could. Review only the remaining unresolved or ambiguous fixtures.',
                null,
                Array.from(reviewEventIds),
            );
            // console.log('Round assignment complete. Result:', { roundByEventId, reservedEventIds });
            return { roundByEventId, reservedEventIds, conflict: finalConflict };
        };

        const overridesMap = new Map<string, number>(Object.entries(roundOverrides ?? {}));
        const roundResult = getEspnRoundNumbers(events, overridesMap);
        if (roundResult.conflict) {
            return {
                found: false,
                reason: roundResult.conflict.reason,
                error: roundResult.conflict.message,
                details: roundResult.conflict.details,
            };
        }

        const derivedRounds = roundResult.roundByEventId;

        // Map ESPN events to our standardized format (similar to Api-Football structure)
        const rows: any[] = [];

        for (const event of events) {
            const competition = event?.competitions?.[0];
            if (!competition) continue;

            const competitors = competition?.competitors ?? [];
            const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
            const awayTeam = competitors.find((c: any) => c.homeAway === 'away');

            if (!homeTeam || !awayTeam) continue;

            const venue = competition?.venue ?? {};
            const status = competition?.status?.type ?? {};

            // Map to Api-Football-like structure for consistency
            const mapped: Record<string, any> = {
                // League info (from first event or payload)
                'league.name': leagueInfo?.name ?? leagueInfo?.abbreviation ?? seasonInfo?.slug?.replace(/-/g, ' ') ?? 'Premier League',
                'league.season': seasonInfo?.year ?? new Date().getFullYear(),
                'league.country': venue?.address?.country ?? 'England',
                'league.flag': null,
                'league.image': leagueInfo?.logos?.[0]?.href ?? null,

                // ESPN does not reliably expose round/matchday values. Derive rounds primarily from the
                // expected number of matches in a round (clubs / 2). Date gaps are only a fallback when the
                // expected round size cannot be inferred.
                'league.round': derivedRounds.get(String(event?.id)) ?? null,

                // Scores
                'goals.home': homeTeam?.score ? Number(homeTeam.score) : null,
                'goals.away': awayTeam?.score ? Number(awayTeam.score) : null,

                // ESPN doesn't provide halftime scores in the standard scoreboard endpoint
                'score.halftime.home': null,
                'score.halftime.away': null,

                // Teams
                'teams.home.name': homeTeam?.team?.displayName ?? homeTeam?.team?.name ?? null,
                'teams.home.logo': homeTeam?.team?.logo ?? null,
                'teams.away.name': awayTeam?.team?.displayName ?? awayTeam?.team?.name ?? null,
                'teams.away.logo': awayTeam?.team?.logo ?? null,

                // Fixture info
                'fixture.date': competition?.date ?? event?.date ?? null,
                'fixture.venue.city': venue?.address?.city ?? null,
                'fixture.venue.name': venue?.fullName ?? venue?.shortName ?? null,
                'fixture.status.long': status?.description ?? null,
                'fixture.status.short': status?.shortDetail ?? status?.detail ?? null,
                'fixture.timestamp': event?.date ? new Date(event.date).getTime() / 1000 : null,

                // Origin API identifier — persisted as origin_api_id in the matches table
                'origin_api_id': event?.id != null ? String(event.id) : null,
            };
            // console.log('Mapping ESPN event id:', event?.id);
            rows.push(mapped);
        }

        if (rows.length === 0) {
            return { found: false, reason: 'no_valid_events' };
        }

        const columns = Array.from(new Set(rows.flatMap(Object.keys)));
        return { found: true, columns, rows };
    }

    // Apply parsed transitional rows into a target table with dry-run and audit support
    async applyTransitional(
        id: number,
        options: { dryRun?: boolean; targetTable?: string; mapping?: Record<string, string> } = {},
    ) {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        // wrap client.query to capture last SQL and params for better diagnostics when debugging
        const origQuery = client.query.bind(client);
        let lastSql: string | null = null;
        let lastParams: any[] | null = null;
        // declare insertCols in function scope so catch blocks can reference it for diagnostics
        let insertCols: string[] = [];
        client.query = (async (sql: any, params?: any[]) => {
            lastSql = typeof sql === 'string' ? sql : JSON.stringify(sql);
            lastParams = params ?? null;
            return origQuery(sql, params);
        }) as any;
        try {
            // Ensure audit and import log tables exist
            await client.query(`
        CREATE TABLE IF NOT EXISTS api_transitional_audit (
          id SERIAL PRIMARY KEY,
          transitional_id INTEGER,
          action TEXT,
          payload JSONB,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);
            await client.query(`
        CREATE TABLE IF NOT EXISTS api_import_log (
          id SERIAL PRIMARY KEY,
          transitional_id INTEGER,
          message TEXT,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);

            const parsed = await this.parseTransitional(id) as any;
            if (!parsed || !parsed.found) {
                if (parsed?.reason === 'round_assignment_conflict' || parsed?.reason === 'needs_round_review') {
                    const details = parsed?.details ?? {};
                    const message = parsed?.error ?? 'Round assignment review required while deriving ESPN rounds';
                    const logRes = await client.query(
                        `INSERT INTO api_import_log (transitional_id, message, details) VALUES ($1,$2,$3) RETURNING id`,
                        [id, parsed?.reason ?? 'round_assignment_conflict', { message, ...details }],
                    );
                    return { applied: 0, reason: parsed.reason, error: message, details, logId: logRes.rows[0]?.id ?? null };
                }
                return { applied: 0, reason: 'not_found' };
            }

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

            // Begin transaction (make full load atomic)
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
                    // On any insert error: capture failing SQL/params, rollback transaction and record a single import log entry
                    const snapshotSql = lastSql;
                    const snapshotParams = lastParams;
                    try {
                        await client.query('ROLLBACK');
                    } catch (_) { }
                    const includeDebug = process.env.DEBUG_ETL === 'true' || process.env.NODE_ENV !== 'production';
                    const details: any = { error: String(e), failedRow: r };
                    // Always try to detect which parameter/column caused the failure; fall back to scanning the parsed row
                    try {
                        if (snapshotParams && Array.isArray(snapshotParams)) {
                            // detect explicit NaN or JS NaN values
                            for (let i = 0; i < snapshotParams.length; i++) {
                                const val = snapshotParams[i];
                                if (val === 'NaN' || (typeof val === 'number' && Number.isNaN(val))) {
                                    details.failing = { index: i + 1, column: insertCols?.[i] ?? null, value: val };
                                    break;
                                }
                                const colName = insertCols?.[i] ?? '';
                                const numericHint = /\b(id|score|goals|minute|seconds|number|round|home|away|points|played|wins|losses|draws)\b/i.test(colName);
                                if (numericHint && val !== null && val !== undefined && !/^[-]?\d+$/.test(String(val))) {
                                    details.failing = { index: i + 1, column: colName || null, value: val };
                                    break;
                                }
                            }
                        }
                        // If we didn't find the failing param via snapshotParams, inspect the row fields for NaN-like values
                        if (!details.failing && (String(e).toLowerCase().includes('invalid input syntax for type integer') || String(e).includes('NaN'))) {
                            const offending: Array<any> = [];
                            for (const k of Object.keys(r || {})) {
                                const v = r[k];
                                if (v === 'NaN' || (typeof v === 'number' && Number.isNaN(v)) || (v !== null && v !== undefined && v !== '' && Number.isNaN(Number(v)))) {
                                    const guessedColumn = insertCols?.includes(k) ? k : k.replace(/\./g, '_');
                                    offending.push({ key: k, value: v, guessedColumn });
                                }
                            }
                            if (offending.length) details.offendingFields = offending;
                        }
                    } catch (_) { }
                    if (includeDebug) {
                        details.lastSql = snapshotSql;
                        details.lastParams = snapshotParams;
                        try {
                            if (snapshotParams && Array.isArray(snapshotParams) && insertCols && insertCols.length) {
                                details.paramColumnMap = Object.fromEntries(insertCols.map((col, idx) => [col, snapshotParams[idx]]));
                            }
                        } catch (_) { }
                    }
                    await client.query(
                        `INSERT INTO api_import_log (transitional_id, message, details) VALUES ($1,$2,$3) RETURNING id`,
                        [id, 'apply_transitional_error', details],
                    );
                    return { applied: 0, error: String(e), rolledBack: true, details: includeDebug ? details : undefined };
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

            // If this was a real run (not a dry run), mark the transitional row as processed
            if (!options.dryRun) {
                try {
                    await client.query(`UPDATE api_transitional SET status = true WHERE id = $1`, [id]);
                } catch (e) {
                    this.logger.error('Failed to update api_transitional status', e as any);
                }
            }

            return { applied, dryRun: !!options.dryRun };
        } catch (e) {
            const snapshotSql = lastSql;
            const snapshotParams = lastParams;
            try {
                await client.query('ROLLBACK');
            } catch (_) { }
            this.logger.error('applyTransitional error', e as any);
            const includeDebug = process.env.DEBUG_ETL === 'true' || process.env.NODE_ENV !== 'production';
            const details: any = { error: String(e) };
            if (includeDebug) {
                details.lastSql = snapshotSql;
                details.lastParams = snapshotParams;
                try {
                    if (snapshotParams && Array.isArray(snapshotParams) && insertCols && insertCols.length) {
                        details.paramColumnMap = Object.fromEntries(insertCols.map((col, idx) => [col, snapshotParams[idx]]));
                    }
                } catch (_) { }
            }
            return { applied: 0, error: String(e), details: includeDebug ? details : undefined };
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

    // Create match_divisions rows for a given match using sport defaults (e.g., football = sportId 36)
    // client: an active pg client within a transaction
    // matchRow: parsed row data with keys like 'score.halftime.home', 'score.halftime.away', 'goals.home', 'goals.away'
    async createMatchDivisions(
        client: any,
        sportId: number,
        matchId: number,
        matchRow: Record<string, any>,
        flgHasDivisions: boolean = false,
    ) {
        // Read sport defaults
        const sp = await client.query(
            `SELECT min_match_divisions_number AS min_divisions, max_match_divisions_number AS max_divisions, has_overtime, has_penalties, flg_espn_api_partial_scores FROM sports WHERE id = $1 LIMIT 1`,
            [sportId],
        );
        let maxDivisions = 2;
        let hasOvertime = false;
        let hasPenalties = false;
        let hasEspnPartialScores = false;
        if (sp.rows && sp.rows.length) {
            const r = sp.rows[0];
            if (r.max_divisions !== undefined && r.max_divisions !== null) maxDivisions = Number(r.max_divisions) || maxDivisions;
            hasOvertime = !!r.has_overtime;
            hasPenalties = !!r.has_penalties;
            hasEspnPartialScores = !!r.flg_espn_api_partial_scores;
        }

        // Parse numeric scores (tolerate nulls) and guard against NaN
        const hfHomeRaw = matchRow['score.halftime.home'];
        const hfAwayRaw = matchRow['score.halftime.away'];
        const gHomeRaw = matchRow['goals.home'];
        const gAwayRaw = matchRow['goals.away'];
        const hfHome = hfHomeRaw != null ? Number(hfHomeRaw) : null;
        const hfAway = hfAwayRaw != null ? Number(hfAwayRaw) : null;
        const gHome = gHomeRaw != null ? Number(gHomeRaw) : null;
        const gAway = gAwayRaw != null ? Number(gAwayRaw) : null;

        // For football typical behavior: 2 divisions (first half, second half)
        // Insert divisions 1..maxDivisions using halftime and fulltime deltas where possible
        for (let div = 1; div <= maxDivisions; div++) {
            let homeScore: number | null = null;
            let awayScore: number | null = null;
            let divisionType = 'REGULAR';

            if (div === 1) {
                homeScore = hfHome != null ? hfHome : (gHome != null ? gHome : 0);
                awayScore = hfAway != null ? hfAway : (gAway != null ? gAway : 0);
            } else if (div === 2) {
                // second period = fulltime - halftime when available
                if (gHome != null && hfHome != null) homeScore = gHome - hfHome;
                else if (gHome != null) homeScore = gHome;
                else homeScore = 0;

                if (gAway != null && hfAway != null) awayScore = gAway - hfAway;
                else if (gAway != null) awayScore = gAway;
                else awayScore = 0;
            } else {
                // For further divisions, distribute remaining goals as 0 (no detailed info)
                homeScore = 0;
                awayScore = 0;
            }

            // When the payload already carries halftime/fulltime scores (Api-Football
            // with flg_has_divisions=true) keep them; otherwise, if the sport does not
            // provide partial scores via ESPN API, zero-out division scores so the
            // ESPN enrichment pipeline can fill them in later.
            if (flgHasDivisions) {
                // Parsed row already has valid halftime scores — keep them
                homeScore = homeScore == null || !Number.isFinite(Number(homeScore)) ? 0 : Math.max(0, Math.trunc(Number(homeScore)));
                awayScore = awayScore == null || !Number.isFinite(Number(awayScore)) ? 0 : Math.max(0, Math.trunc(Number(awayScore)));
            } else if (!hasEspnPartialScores) {
                homeScore = 0;
                awayScore = 0;
            } else {
                // Ensure integers and guard against NaN by coercing non-finite values to 0
                homeScore = homeScore == null || !Number.isFinite(Number(homeScore)) ? 0 : Math.max(0, Math.trunc(Number(homeScore)));
                awayScore = awayScore == null || !Number.isFinite(Number(awayScore)) ? 0 : Math.max(0, Math.trunc(Number(awayScore)));
            }

            await client.query(
                `INSERT INTO match_divisions (match_id, division_number, division_type, home_score, away_score) VALUES ($1,$2,$3,$4,$5)`,
                [matchId, div, divisionType, homeScore, awayScore],
            );
        }

        // If sport indicates overtime/penalties, caller may insert extra rows accordingly (not implemented here)
        return { created: maxDivisions };
    }

    /**
     * Fetch linescores for a single ESPN event.
     * Returns per-period home/away scores extracted from competitors[].linescores.
     */
    private async fetchEspnEventLinescores(
        sportName: string,
        leagueCode: string,
        eventId: string,
    ): Promise<{ homeScores: number[]; awayScores: number[] } | null> {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sportName}/${leagueCode}/summary?event=${eventId}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                this.logger.warn(`ESPN event fetch failed (${resp.status}) for event ${eventId}`);
                return null;
            }
            const json = await resp.json();
            // The /summary endpoint returns linescores inside:
            //   header.competitions[0].competitors[x].linescores  (inline array)
            // Each linescore has { displayValue: "1" } — one entry per period.
            const competitors: any[] = json?.header?.competitions?.[0]?.competitors ?? [];
            let homeScores: number[] = [];
            let awayScores: number[] = [];
            for (const comp of competitors) {
                const homeAway: string = comp?.homeAway ?? '';
                const linescouresRaw = comp?.linescores;
                const linescores: any[] = Array.isArray(linescouresRaw) ? linescouresRaw : [];
                const scores: number[] = linescores.map((ls: any) => {
                    // displayValue is the canonical text score ("1", "0", …)
                    const raw = ls?.displayValue ?? ls?.value;
                    return Number(raw) || 0;
                });
                if (homeAway === 'home') homeScores = scores;
                else if (homeAway === 'away') awayScores = scores;
            }
            if (!homeScores.length && !awayScores.length) return null;
            return { homeScores, awayScores };
        } catch (e) {
            this.logger.warn(`ESPN event linescores error for event ${eventId}: ${String(e)}`);
            return null;
        }
    }

    /**
     * Enrich match_divisions rows with real partial scores fetched from ESPN.
     * Runs outside the main transaction with its own connection pool.
     * Sequential with a configurable delay between requests for rate-limiting.
     */
    async enrichMatchDivisionsFromEspn(
        sportName: string,
        leagueCode: string,
        matchesForEnrichment: Array<{ matchId: number; originApiId: string }>,
        rateMs = 200,
    ): Promise<{ enriched: number; skipped: number; errors: number }> {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        let enriched = 0;
        let skipped = 0;
        let errors = 0;
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        try {
            for (const m of matchesForEnrichment) {
                try {
                    // Check if divisions already have non-zero scores (idempotent)
                    const existing = await pool.query(
                        `SELECT COALESCE(SUM(home_score + away_score), 0)::int AS total FROM match_divisions WHERE match_id = $1`,
                        [m.matchId],
                    );
                    if (Number(existing.rows[0]?.total ?? 0) > 0) {
                        skipped++;
                        continue;
                    }//mjv
                    const linescores = await this.fetchEspnEventLinescores(sportName, leagueCode, m.originApiId);
                    if (!linescores) {
                        skipped++;
                        await sleep(rateMs);
                        continue;
                    }
                    const maxDiv = Math.max(linescores.homeScores.length, linescores.awayScores.length);
                    for (let div = 1; div <= maxDiv; div++) {
                        const homeScore = linescores.homeScores[div - 1] ?? 0;
                        const awayScore = linescores.awayScores[div - 1] ?? 0;
                        await pool.query(
                            `UPDATE match_divisions SET home_score = $1, away_score = $2 WHERE match_id = $3 AND division_number = $4`,
                            [homeScore, awayScore, m.matchId, div],
                        );
                    }
                    enriched++;
                } catch (e) {
                    this.logger.warn(`ESPN enrichment error for match ${m.matchId}: ${String(e)}`);
                    errors++;
                }
                await sleep(rateMs);
            }
            this.logger.log(`ESPN enrichment complete: enriched=${enriched}, skipped=${skipped}, errors=${errors}`);
        } finally {
            await pool.end();
        }
        return { enriched, skipped, errors };
    }

    // Apply first-row processing: upsert country, league, season based on parsed first row
    async applyFirstRowToApp(id: number, options: { sportId?: number; roundOverrides?: Record<string, number> } = {}) {
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

            const parsed = await this.parseTransitional(id, options.roundOverrides) as any;
            if (!parsed || !parsed.found) {
                return {
                applied: false,
                reason: parsed?.reason ?? 'not_found',
                error: parsed?.error ?? null,
                details: parsed?.details ?? null,
                };
            }
            // Read persisted UI options / flags from the api_transitional row (persisted at fetch time)
            let transitionalDbRow: any = {};
            try {
                const tRes = await client.query(
                    `SELECT season_status, flg_season_default, flg_season_same_years, league_schedule_type, flg_league_default, flg_has_divisions, flg_run_in_background FROM api_transitional WHERE id = $1 LIMIT 1`,
                    [id],
                );
                const defaults = {
                    season_status: 'Finished',
                    flg_season_default: false,
                    flg_season_same_years: false,
                    league_schedule_type: 'Round',
                    flg_league_default: false,
                    flg_has_divisions: true,
                    flg_run_in_background: true,
                };
                const row = tRes && tRes.rows && tRes.rows.length ? tRes.rows[0] : {};
                transitionalDbRow = { ...defaults, ...row };
                // Backwards-compatible alias expected by code elsewhere
                transitionalDbRow.sameYears = transitionalDbRow.sameYears ?? transitionalDbRow.flg_season_same_years;
            } catch (e) {
                this.logger.debug(`Could not read api_transitional row id=${id}: ${String(e)}`);
                transitionalDbRow = {
                    season_status: 'Finished',
                    flg_season_default: false,
                    flg_season_same_years: false,
                    league_schedule_type: 'Round',
                    flg_league_default: false,
                    flg_has_divisions: true,
                    flg_run_in_background: true,
                    sameYears: false,
                };
            }

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
            // Normalization helpers (moved to module scope)

            const leagueName = String(getVal('league.name') ?? getVal('league') ?? '').trim();
            const leagueSeason = getVal('league.season') ?? getVal('season') ?? null;
            const leagueCountry = String(getVal('league.country') ?? getVal('country') ?? '').trim();
            const leagueFlag = getVal('league.flag') ?? null;
            const leagueImage = getVal('league.image') ?? null;

            await client.query('BEGIN');

            // Upsert country: enhanced matching and alias support
            let countryId: number | null = null;
            if (leagueCountry) {
                const nameClean = String(leagueCountry).trim();
                // Try exact name or code match
                let cRes = await client.query(
                    `SELECT id FROM countries WHERE lower(name) = lower($1) OR lower(code) = lower($1) LIMIT 1`,
                    [nameClean],
                );
                // Try substring match
                if (!cRes.rows.length) {
                    cRes = await client.query(`SELECT id FROM countries WHERE name ILIKE $1 LIMIT 1`, [`%${nameClean}%`]);
                }
                // Try simple alias map
                if (!cRes.rows.length) {
                    const aliases: Record<string, string> = {
                        'england': 'United Kingdom',
                        'uk': 'United Kingdom',
                        'united kingdom': 'United Kingdom',
                        'usa': 'United States',
                        'u.s.a.': 'United States',
                        'united states of america': 'United States',
                        'united states': 'United States',
                    };
                    const mapped = aliases[nameClean.toLowerCase()];
                    if (mapped) {
                        cRes = await client.query(`SELECT id FROM countries WHERE lower(name) = lower($1) LIMIT 1`, [mapped]);
                    }
                }

                if (cRes.rows.length) {
                    countryId = cRes.rows[0].id;
                } else {
                    const code = nameClean.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || null;
                    const ins = await client.query(
                        `INSERT INTO countries (name, code, flag, continent) VALUES ($1,$2,$3,$4) RETURNING id`,
                        [nameClean, code, leagueFlag || null, 'Europe'],
                    );
                    countryId = ins.rows[0].id;
                }
            }

            // Upsert league: try to find by original_name or secondary_name using country and sport if available
            let leagueId: number | null = null;
            if (leagueName) {
                const sportId = options.sportId ?? 36;

                // For ESPN-origin payloads, attempt to find league by espn_id first
                let espnLeagueId: string | null = null;
                try {
                    const tRes2 = await client.query(`SELECT origin, payload FROM api_transitional WHERE id = $1 LIMIT 1`, [id]);
                    const originVal = tRes2.rows?.[0]?.origin ?? null;
                    const payload = tRes2.rows?.[0]?.payload ?? {};
                    if (originVal === 'Api-Espn') {
                        espnLeagueId = payload?.leagues?.[0]?.id ?? null;
                        if (espnLeagueId) {
                            const eRes = await client.query(`SELECT id FROM leagues WHERE espn_id = $1 LIMIT 1`, [String(espnLeagueId)]);
                            if (eRes.rows.length) {
                                leagueId = eRes.rows[0].id;
                                // If we have a league image from the payload, set it when missing
                                if (leagueImage) {
                                    try {
                                        await client.query(`UPDATE leagues SET image_url = COALESCE(image_url, $1) WHERE id = $2`, [leagueImage, leagueId]);
                                    } catch (e) {
                                        this.logger.debug(`Failed to update league image for league id=${leagueId}: ${String(e)}`);
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    this.logger.debug(`Failed espn_id lookup for transitional id=${id}: ${String(e)}`);
                }

                // Only run the name-based lookup/insert if espn_id did not find an existing league
                if (!leagueId) {
                    const q = `SELECT id FROM leagues WHERE (original_name = $1 OR secondary_name = $1)` + (countryId ? ' AND country_id = $2' : '') + (sportId ? ' AND sport_id = $3' : '') + ' LIMIT 1';
                    const params: any[] = [leagueName];
                    if (countryId) params.push(countryId);
                    if (sportId) params.push(sportId);
                    const lRes = await client.query(q, params);
                    if (lRes.rows.length) {
                        leagueId = lRes.rows[0].id;
                        // If we have a league image from the payload, set it when missing
                        if (leagueImage) {
                            try {
                                await client.query(`UPDATE leagues SET image_url = COALESCE(image_url, $1) WHERE id = $2`, [leagueImage, leagueId]);
                            } catch (e) {
                                this.logger.debug(`Failed to update league image for league id=${leagueId}: ${String(e)}`);
                            }
                        }
                    } else {
                        // Fallback: try a normalized/inclusion-based match among candidate leagues
                        try {
                            const incomingNorm = normalizeLookupKey(leagueName);
                            const candParams: any[] = [];
                            let candQ = `SELECT id, original_name, secondary_name FROM leagues`;
                            const whereParts: string[] = [];
                            if (countryId) {
                                whereParts.push(`country_id = $${candParams.length + 1}`);
                                candParams.push(countryId);
                            }
                            if (sportId) {
                                whereParts.push(`sport_id = $${candParams.length + 1}`);
                                candParams.push(sportId);
                            }
                            if (whereParts.length) candQ += ' WHERE ' + whereParts.join(' AND ');
                            candQ += ' LIMIT 200';
                            const candRes = await client.query(candQ, candParams);
                            for (const c of candRes.rows) {
                                const on = normalizeLookupKey(c.original_name ?? '');
                                const sn = normalizeLookupKey(c.secondary_name ?? '');
                                if (
                                    on === incomingNorm || sn === incomingNorm ||
                                    on.includes(incomingNorm) || incomingNorm.includes(on) ||
                                    sn.includes(incomingNorm) || incomingNorm.includes(sn)
                                ) {
                                    leagueId = c.id;
                                    break;
                                }
                            }
                            if (leagueId && leagueImage) {
                                try {
                                    await client.query(`UPDATE leagues SET image_url = COALESCE(image_url, $1) WHERE id = $2`, [leagueImage, leagueId]);
                                } catch (e) {
                                    this.logger.debug(`Failed to update league image for league id=${leagueId}: ${String(e)}`);
                                }
                            }
                        } catch (e) {
                            this.logger.debug(`Normalized league fallback failed: ${String(e)}`);
                        }

                        // If still not found, proceed to insert
                        if (!leagueId) {
                            // Insert minimal league row per spec. Include espn_id when available (ESPN origin)
                            const ins = await client.query(
                                `INSERT INTO leagues (sport_id, country_id, espn_id, image_url, original_name, secondary_name, city_id, number_of_rounds_matches, min_divisions_number, max_divisions_number, division_time, has_ascends, ascends_quantity, has_descends, descends_quantity, number_of_sub_leagues, flg_default, flg_round_automatic, type_of_schedule) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
                                [
                                    sportId,
                                    countryId,
                                    espnLeagueId ? String(espnLeagueId) : null,
                                    leagueImage ?? leagueFlag ?? null,
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
                                    0,
                                    transitionalDbRow.flg_league_default || false,
                                    true,
                                    transitionalDbRow.league_schedule_type || 'Round',
                                ],
                            );
                            leagueId = ins.rows[0].id;
                        }
                    }
                
                }
            }

            // Upsert season: check by sport_id, league_id, start_year
            let seasonId: number | null = null;
            if (leagueSeason && leagueId) {
                const sportId = options.sportId ?? 36;
                const sRes = await client.query(
                    `SELECT id FROM seasons WHERE sport_id = $1 AND league_id = $2 AND start_year = $3 LIMIT 1`,
                    [sportId, leagueId, leagueSeason],
                );
                if (sRes.rows.length) {
                    seasonId = sRes.rows[0].id;
                } else {
                    const startYearNum = Number(leagueSeason);
                    const startYear = Number.isFinite(startYearNum) ? Math.trunc(startYearNum) : leagueSeason;
                    const endYear = transitionalDbRow.sameYears ? startYear : Number.isFinite(startYearNum) ? startYearNum + 1 : startYear;
                    const ins = await client.query(
                        `INSERT INTO seasons (sport_id, league_id, status, flg_default, number_of_groups, start_year, end_year) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
                        [sportId, leagueId, transitionalDbRow.season_status, transitionalDbRow.flg_season_default, 0, startYear, endYear],
                    );
                    seasonId = ins.rows[0].id;
                }
            }

            await client.query('COMMIT');

            return { applied: true, countryId, leagueId, seasonId };
        } catch (e) {
            try {
                await client.query('ROLLBACK');
            } catch (_) { }
            this.logger.error('applyFirstRowToApp error', e as any);
            return { applied: false, error: String(e) };
        } finally {
            client.release();
            await pool.end();
        }
    }

    // Extract basic league metadata from the raw api_transitional payload without
    // running the heavy round-inference logic.  Used by the fast-path detection to
    // look up an existing league/season in the database.
    private extractLeagueMetadata(row: any): { leagueName: string | null; leagueSeason: any; leagueCountry: string | null } {
        const payload = row.payload ?? row;
        const origin = row.origin ?? 'Api-Football';

        if (origin === 'Api-Espn') {
            const events = payload?.events ?? [];
            const firstEvent = events[0] ?? {};
            const seasonInfo = firstEvent?.season ?? {};
            const leagueInfo = payload?.leagues?.[0] ?? {};
            const venue = firstEvent?.competitions?.[0]?.venue ?? {};
            return {
                leagueName: leagueInfo?.name ?? leagueInfo?.abbreviation ?? null,
                leagueSeason: seasonInfo?.year ?? null,
                leagueCountry: venue?.address?.country ?? null,
            };
        }

        // Api-Football
        const get = (obj: any, path: string) => path.split('.').reduce((acc: any, key: string) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
        let arr: any[] | null = null;
        if (Array.isArray(payload)) arr = payload;
        else if (payload?.response && Array.isArray(payload.response)) arr = payload.response;
        else if (payload?.data && Array.isArray(payload.data)) arr = payload.data;
        const sample = arr?.[0] ?? payload;

        return {
            leagueName: get(sample, 'league.name') ?? null,
            leagueSeason: get(sample, 'league.season') ?? null,
            leagueCountry: get(sample, 'league.country') ?? null,
        };
    }

    // Lightweight ESPN event extraction that produces the same row format as
    // parseTransitionalEspn but WITHOUT running round inference.  league.round is
    // set to null for every row — the per-row processing loop will preserve the
    // existing round_id via COALESCE when updating matches.
    private parseTransitionalEspnLightweight(row: any) {
        const payload = row.payload ?? row;
        const events = payload?.events ?? [];
        if (!Array.isArray(events) || events.length === 0) {
            return { found: false, reason: 'no_events_array' };
        }
        const firstEvent = events[0];
        const seasonInfo = firstEvent?.season ?? {};
        const leagueInfo = payload?.leagues?.[0] ?? {};

        const rows: any[] = [];
        for (const event of events) {
            const competition = event?.competitions?.[0];
            if (!competition) continue;
            const competitors = competition?.competitors ?? [];
            const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
            const awayTeam = competitors.find((c: any) => c.homeAway === 'away');
            if (!homeTeam || !awayTeam) continue;
            const venue = competition?.venue ?? {};
            const status = competition?.status?.type ?? {};

            rows.push({
                'league.name': leagueInfo?.name ?? leagueInfo?.abbreviation ?? seasonInfo?.slug?.replace(/-/g, ' ') ?? 'Unknown',
                'league.season': seasonInfo?.year ?? new Date().getFullYear(),
                'league.country': venue?.address?.country ?? 'England',
                'league.flag': null,
                'league.image': leagueInfo?.logos?.[0]?.href ?? null,
                'league.round': null,  // Skipped — rounds already exist in DB
                'goals.home': homeTeam?.score ? Number(homeTeam.score) : null,
                'goals.away': awayTeam?.score ? Number(awayTeam.score) : null,
                'score.halftime.home': null,
                'score.halftime.away': null,
                'teams.home.name': homeTeam?.team?.displayName ?? homeTeam?.team?.name ?? null,
                'teams.home.logo': homeTeam?.team?.logo ?? null,
                'teams.away.name': awayTeam?.team?.displayName ?? awayTeam?.team?.name ?? null,
                'teams.away.logo': awayTeam?.team?.logo ?? null,
                'fixture.date': competition?.date ?? event?.date ?? null,
                'fixture.venue.city': venue?.address?.city ?? null,
                'fixture.venue.name': venue?.fullName ?? venue?.shortName ?? null,
                'fixture.status.long': status?.description ?? null,
                'fixture.status.short': status?.shortDetail ?? status?.detail ?? null,
                'fixture.timestamp': event?.date ? new Date(event.date).getTime() / 1000 : null,
                'origin_api_id': event?.id != null ? String(event.id) : null,
            });
        }
        if (rows.length === 0) return { found: false, reason: 'no_valid_events' };
        const columns = Array.from(new Set(rows.flatMap(Object.keys)));
        return { found: true, columns, rows };
    }

    // Apply all rows: create rounds, clubs, and matches (atomic)
    async applyAllRowsToApp(id: number, options: { sportId?: number; leagueId?: number; seasonId?: number; dryRun?: boolean; roundOverrides?: Record<string, number> } = {}) {
        if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        // wrap client.query to capture last SQL and params for diagnostics when debugging
        const origQueryAll = client.query.bind(client);
        let lastSqlAll: string | null = null;
        let lastParamsAll: any[] | null = null;
        client.query = (async (sql: any, params?: any[]) => {
            lastSqlAll = typeof sql === 'string' ? sql : JSON.stringify(sql);
            lastParamsAll = params ?? null;
            return origQueryAll(sql, params);
        }) as any;
        try {
            // Ensure import log and audit tables exist
            await client.query(`
        CREATE TABLE IF NOT EXISTS api_import_log (
          id SERIAL PRIMARY KEY,
          transitional_id INTEGER,
          message TEXT,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);
            await client.query(`
        CREATE TABLE IF NOT EXISTS api_transitional_audit (
          id SERIAL PRIMARY KEY,
          transitional_id INTEGER,
          action TEXT,
          payload JSONB,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);

            // ── Fast-path detection ───────────────────────────────────────────
            // If rounds already exist for the league/season this is a subsequent
            // load.  Skip the heavy round inference (especially ESPN) and just
            // extract events with a lightweight parser.  The existing per-row
            // upsert logic already handles skip / update / insert correctly.
            const transitionalRow = await this.getTransitional(id);
            if (!transitionalRow) return { applied: 0, reason: 'not_found' };

            // Read ESPN enrichment flags from the transitional row
            const flgHasDivisions = transitionalRow.flg_has_divisions !== false;
            const flgRunInBackground = transitionalRow.flg_run_in_background !== false;
            const transitionalLeagueCode: string | null = transitionalRow.league ?? null;
            const transitionalOrigin: string = transitionalRow.origin ?? 'Api-Football';
            // Collect matches needing ESPN partial-score enrichment (when flg_has_divisions is false)
            const matchesForEnrichment: Array<{ matchId: number; originApiId: string }> = [];

            const sportId = options.sportId ?? 36;
            let leagueId = options.leagueId ?? null;
            let seasonId = options.seasonId ?? null;
            let isSubsequentLoad = false;

            const meta = this.extractLeagueMetadata(transitionalRow);
            const espnLeagueCode: string | null = transitionalRow.league ?? null;
            if (meta.leagueName || espnLeagueCode) {
                // Build candidate season years from the payload AND the stored season string
                // (e.g. "2025/2026" → [2025, 2026]) so NULL season never blocks detection.
                const seasonYears: number[] = [];
                if (meta.leagueSeason != null && Number.isFinite(Number(meta.leagueSeason))) {
                    seasonYears.push(Number(meta.leagueSeason));
                }
                const rawSeasonStr = String(transitionalRow.season ?? '');
                for (const m of (rawSeasonStr.match(/\d{4}/g) ?? [])) {
                    const y = Number(m);
                    if (Number.isFinite(y) && !seasonYears.includes(y)) seasonYears.push(y);
                }

                // Case-insensitive: ESPN payload returns e.g. "Spanish LALIGA"
                // while DB stores "Spanish LaLiga".
                const lRes = await client.query(
                    `SELECT id FROM leagues WHERE (LOWER(original_name) = LOWER($1) OR LOWER(secondary_name) = LOWER($1) OR ($3::text IS NOT NULL AND espn_id = $3)) AND sport_id = $2 LIMIT 1`,
                    [String(meta.leagueName ?? '').trim(), sportId, espnLeagueCode],
                );
                if (lRes.rows.length) {
                    const possibleLeagueId = lRes.rows[0].id;
                    let seasonRow: any = null;
                    for (const year of seasonYears) {
                        const sRes = await client.query(
                            `SELECT id FROM seasons WHERE sport_id = $1 AND league_id = $2 AND (start_year = $3 OR end_year = $3) ORDER BY start_year DESC LIMIT 1`,
                            [sportId, possibleLeagueId, year],
                        );
                        if (sRes.rows.length) { seasonRow = sRes.rows[0]; break; }
                    }
                    if (seasonRow) {
                        const roundsRes = await client.query(
                            `SELECT COUNT(*)::int as cnt FROM rounds WHERE league_id = $1 AND season_id = $2`,
                            [possibleLeagueId, seasonRow.id],
                        );
                        if (Number(roundsRes.rows[0]?.cnt ?? 0) > 0) {
                            isSubsequentLoad = true;
                            leagueId = possibleLeagueId;
                            seasonId = seasonRow.id;
                        }
                    }
                }
            }

            let rows: any[];
            if (isSubsequentLoad) {
                // Fast path: skip round inference, only extract events
                const origin = transitionalRow.origin ?? 'Api-Football';
                let parsed: any;
                if (origin === 'Api-Espn') {
                    parsed = this.parseTransitionalEspnLightweight(transitionalRow);
                } else {
                    // Api-Football standard parse is already lightweight (just JSON flattening)
                    parsed = await this.parseTransitional(id);
                }
                if (!parsed || !parsed.found) {
                    return { applied: 0, reason: parsed?.reason ?? 'lightweight_parse_failed' };
                }
                rows = parsed.rows || [];
            } else {
                // Full path: run parseTransitional with round inference
                const parsed = await this.parseTransitional(id, options.roundOverrides) as any;
                if (!parsed || !parsed.found) {
                    return {
                        applied: 0,
                        reason: parsed?.reason ?? 'not_found',
                        error: parsed?.error ?? null,
                        details: parsed?.details ?? null,
                    };
                }
                rows = parsed.rows || [];
                // Resolve league/season if not already known
                if (!leagueId || !seasonId) {
                    const firstRowResult = await this.applyFirstRowToApp(id, { sportId, roundOverrides: options.roundOverrides });
                    if (!firstRowResult.applied) return { applied: 0, reason: 'first_row_failed', details: firstRowResult };
                    leagueId = firstRowResult.leagueId;
                    seasonId = firstRowResult.seasonId;
                }
            }
            if (!rows.length) return { applied: 0, reason: 'no_rows' };

            // In-memory caches
            const clubCache: Record<string, number> = {};
            const roundCache: Record<number, number> = {};
            const cityCache: Record<string, number> = {};
            const stadiumCache: Record<string, number> = {};
            const sportClubCache = new Set<string>();
            const seasonClubCache = new Set<string>();
            const clubStadiumCache = new Set<string>();
            const standingsCalculator = new StandingsCalculatorService();

            const leagueMetaRes = await client.query(`SELECT country_id FROM leagues WHERE id = $1 LIMIT 1`, [leagueId]);
            const leagueCountryId = leagueMetaRes.rows[0]?.country_id ?? (await client.query(`SELECT id FROM countries LIMIT 1`)).rows[0]?.id ?? null;

            

            const ensureSportClub = async (clubId: number | null, clubNameRaw: any) => {
                if (!clubId) return;
                const clubName = normalizeText(clubNameRaw);
                const cacheKey = `${sportId}:${clubId}`;
                if (sportClubCache.has(cacheKey)) return;

                const existing = await client.query(
                    `SELECT id FROM sport_clubs WHERE sport_id = $1 AND club_id = $2 LIMIT 1`,
                    [sportId, clubId],
                );
                if (!existing.rows.length) {
                    await client.query(
                        `INSERT INTO sport_clubs (sport_id, club_id, name, flg_active) VALUES ($1, $2, $3, $4)`,
                        [sportId, clubId, clubName || null, true],
                    );
                }

                sportClubCache.add(cacheKey);
            };

            const ensureSeasonClub = async (clubId: number | null) => {
                if (!clubId) return;
                const cacheKey = `${sportId}:${leagueId}:${seasonId}:${clubId}`;
                if (seasonClubCache.has(cacheKey)) return;

                const existing = await client.query(
                    `SELECT id FROM season_clubs WHERE sport_id = $1 AND league_id = $2 AND season_id = $3 AND club_id = $4 AND group_id IS NULL LIMIT 1`,
                    [sportId, leagueId, seasonId, clubId],
                );
                if (!existing.rows.length) {
                    await client.query(
                        `INSERT INTO season_clubs (sport_id, league_id, season_id, club_id, group_id) VALUES ($1, $2, $3, $4, $5)`,
                        [sportId, leagueId, seasonId, clubId, null],
                    );
                }

                seasonClubCache.add(cacheKey);
            };

            const ensureCity = async (cityNameRaw: any) => {
                const cityName = normalizeText(cityNameRaw).replace(/[;]+$/g, '');
                if (!cityName || !leagueCountryId) return null;

                const baseCityName = cityName.split(',')[0]?.trim() || cityName;
                const cityVariants = Array.from(new Set([cityName, baseCityName].filter(Boolean)));

                for (const variant of cityVariants) {
                    const cacheKey = `${leagueCountryId}:${variant.toLowerCase()}`;
                    if (cityCache[cacheKey]) return cityCache[cacheKey];
                }

                for (const variant of cityVariants) {
                    const exact = await client.query(
                        `SELECT id FROM cities WHERE country_id = $1 AND lower(name) = lower($2) LIMIT 1`,
                        [leagueCountryId, variant],
                    );
                    if (exact.rows.length) {
                        for (const cacheVariant of cityVariants) {
                            cityCache[`${leagueCountryId}:${cacheVariant.toLowerCase()}`] = exact.rows[0].id;
                        }
                        return exact.rows[0].id;
                    }
                }

                const flexible = await client.query(
                    `SELECT id, name
             FROM cities
            WHERE country_id = $1
              AND (
                lower($2) LIKE '%' || lower(name) || '%'
                OR lower(name) LIKE '%' || lower($3) || '%'
                OR lower($4) LIKE '%' || lower(name) || '%'
                OR lower(name) LIKE '%' || lower($5) || '%'
              )
            ORDER BY
              CASE
                WHEN lower(name) = lower($3) THEN 0
                WHEN lower(name) = lower($2) THEN 1
                ELSE 2
              END,
              length(name) ASC
            LIMIT 1`,
                    [leagueCountryId, cityName, baseCityName, baseCityName, cityName],
                );
                if (flexible.rows.length) {
                    for (const cacheVariant of cityVariants) {
                        cityCache[`${leagueCountryId}:${cacheVariant.toLowerCase()}`] = flexible.rows[0].id;
                    }
                    return flexible.rows[0].id;
                }

                const inserted = await client.query(
                    `INSERT INTO cities (name, country_id) VALUES ($1, $2) RETURNING id`,
                    [baseCityName, leagueCountryId],
                );
                for (const cacheVariant of cityVariants) {
                    cityCache[`${leagueCountryId}:${cacheVariant.toLowerCase()}`] = inserted.rows[0].id;
                }
                return inserted.rows[0].id;
            };

            const ensureStadium = async (venueNameRaw: any, cityId: number | null): Promise<{ id: number; created: boolean } | null> => {
                const venueName = normalizeText(venueNameRaw);
                if (!venueName || !cityId) return null;

                const normalizedVenueName = normalizeLookupKey(venueName);
                const cacheKey = `${sportId}:${cityId}:${normalizedVenueName}`;
                if (stadiumCache[cacheKey]) return { id: stadiumCache[cacheKey], created: false };

                const existing = await client.query(
                    `SELECT id FROM stadiums WHERE sport_id = $1 AND city_id = $2 AND lower(name) = lower($3) LIMIT 1`,
                    [sportId, cityId, venueName],
                );
                if (existing.rows.length) {
                    const stadiumId = existing.rows[0].id;
                    stadiumCache[cacheKey] = stadiumId;
                    return { id: stadiumId, created: false };
                }

                const normalizedExisting = await client.query(
                    `SELECT id
             FROM stadiums
            WHERE sport_id = $1
              AND city_id = $2
              AND regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') = $3
            LIMIT 1`,
                    [sportId, cityId, normalizedVenueName],
                );
                if (normalizedExisting.rows.length) {
                    const stadiumId = normalizedExisting.rows[0].id;
                    stadiumCache[cacheKey] = stadiumId;
                    return { id: stadiumId, created: false };
                }

                const flexible = await client.query(
                    `SELECT id
             FROM stadiums
            WHERE sport_id = $1
              AND city_id = $2
              AND (
                $3 LIKE '%' || regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') || '%'
                OR regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') LIKE '%' || $3 || '%'
              )
            ORDER BY length(name) ASC
            LIMIT 1`,
                    [sportId, cityId, normalizedVenueName],
                );
                if (flexible.rows.length) {
                    const stadiumId = flexible.rows[0].id;
                    stadiumCache[cacheKey] = stadiumId;
                    return { id: stadiumId, created: false };
                }

                const inserted = await client.query(
                    `INSERT INTO stadiums (sport_id, name, city_id, capacity, image_url, year_constructed, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                    [sportId, venueName, cityId, null, null, null, 'stadium'],
                );
                const stadiumId = inserted.rows[0].id;
                stadiumCache[cacheKey] = stadiumId;
                return { id: stadiumId, created: true };
            };

            const ensureClubStadium = async (clubId: number | null, stadiumId: number | null) => {
                if (!clubId || !stadiumId) return;
                const cacheKey = `${clubId}:${stadiumId}`;
                if (clubStadiumCache.has(cacheKey)) return;

                const existing = await client.query(
                    `SELECT id FROM club_stadiums WHERE club_id = $1 AND stadium_id = $2 LIMIT 1`,
                    [clubId, stadiumId],
                );
                if (!existing.rows.length) {
                    await client.query(
                        `INSERT INTO club_stadiums (club_id, stadium_id, start_date, end_date) VALUES ($1, $2, $3, $4)`,
                        [clubId, stadiumId, new Date('1902-07-21T00:00:00.000Z'), null],
                    );
                }

                clubStadiumCache.add(cacheKey);
            };

            await client.query('BEGIN');
            let applied = 0;
            let createdClubs = 0;
            // Track club names that were included in this import (existing or newly created)
            const clubsIncluded: string[] = [];
            let createdRounds = 0;
            let createdDivisions = 0;
            let createdStandings = 0;
            let createdMatches = 0;
            let createdStadiums = 0;
            const stadiumsCreated: Array<{ id: number; name: string }> = [];

            // Sort rows by round number ascending BEFORE processing.
            // This is critical when a reserved/relocated match (e.g. a postponed game that was
            // looked-up from a later position in the JSON) has a lower round number than the
            // events that precede it in the array. Without this sort the standings calculator
            // would see a later-round "previous" row as the base when computing the earlier round,
            // producing impossible played-count values like 3 for round 2.
            const sortedRows = [...rows].sort((a: any, b: any) => {
                const ra = a['league.round'] != null ? Number(a['league.round']) : Infinity;
                const rb = b['league.round'] != null ? Number(b['league.round']) : Infinity;
                if (ra !== rb) return ra - rb;
                // Within the same round preserve the original JSON order (stable secondary sort)
                return 0;
            });

            // Check whether `matches` table contains `origin_api_id` so we can conditionally include it
            const matchColsRes = await client.query(
                `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
                ['matches'],
            );
            const matchCols = matchColsRes.rows.map((c: any) => c.column_name);
            const hasOriginApiIdCol = matchCols.includes('origin_api_id');

            // Counters for upsert tracking
            let skippedUnchanged = 0;
            let updatedMatches = 0;

            for (const r of sortedRows) {
                try {
                    const roundNumber = r['league.round'] ?? r['round'] ?? null;
                    let roundId: number | null = null;
                    let roundNumberInt: number | null = null;
                    if (roundNumber !== null && roundNumber !== undefined) {
                        // Round values may be strings like "Regular Season - 1". Extract 1-3 digit number when present.
                        roundNumberInt = null;
                        if (typeof roundNumber === 'string') {
                            const m = String(roundNumber).match(/(\d{1,3})\b/);
                            roundNumberInt = m ? Number(m[1]) : null;
                        } else {
                            const parsed = Number(roundNumber);
                            roundNumberInt = Number.isFinite(parsed) ? Math.trunc(parsed) : null;
                        }
                        if (roundNumberInt !== null) {
                            if (roundCache[roundNumberInt]) {
                                roundId = roundCache[roundNumberInt];
                            } else {
                                const rr = await client.query(
                                    `SELECT id FROM rounds WHERE league_id = $1 AND season_id = $2 AND round_number = $3 LIMIT 1`,
                                    [leagueId, seasonId, roundNumberInt],
                                );
                                if (rr.rows.length) {
                                    roundId = rr.rows[0].id;
                                    roundCache[roundNumberInt] = roundId;
                                } else {
                                    const ins = await client.query(
                                        `INSERT INTO rounds (league_id, season_id, round_number) VALUES ($1,$2,$3) RETURNING id`,
                                        [leagueId, seasonId, roundNumberInt],
                                    );
                                    roundId = ins.rows[0].id;
                                    roundCache[roundNumberInt] = roundId;
                                    createdRounds += 1;
                                }
                            }
                        }
                    }

                    // Helper to find or create club - returns { id, shortName }
                    const findOrCreateClub = async (clubNameRaw: any, clubLogo: any): Promise<{ id: number; shortName: string } | null> => {
                        if (!clubNameRaw) return null;
                        const clubName = String(clubNameRaw).trim();
                        if (!clubName) return null;
                        if (clubCache[clubName]) {
                            // Fetch short_name from DB for cached clubs
                            const cached = await client.query(`SELECT id, short_name FROM clubs WHERE id = $1 LIMIT 1`, [clubCache[clubName]]);
                            if (cached.rows.length) {
                                return { id: cached.rows[0].id, shortName: cached.rows[0].short_name || clubName };
                            }
                        }

                        // Try exact short_name or name (restrict to current country)
                        let cres: any = { rows: [] };
                        try {
                            cres = await client.query(
                                `SELECT id, short_name FROM clubs WHERE (lower(short_name)=lower($1) OR lower(name)=lower($1)) AND country_id = $2 LIMIT 1`,
                                [clubName, leagueCountryId],
                            );
                        } catch (e) {
                            this.logger.debug(`Club lookup exact query failed: ${String(e)}`);
                            cres = { rows: [] };
                        }
                        if (!cres.rows.length) {
                            try {
                                cres = await client.query(
                                    `SELECT id, short_name FROM clubs WHERE (name ILIKE $1 OR short_name ILIKE $1) AND country_id = $2 LIMIT 1`,
                                    [`%${clubName}%`, leagueCountryId],
                                );
                            } catch (e) {
                                this.logger.debug(`Club lookup ILIKE query failed: ${String(e)}`);
                                cres = { rows: [] };
                            }
                        }
                        // If still not found, try a normalization-based match (strip diacritics/punctuation)
                        if (!cres.rows.length) {
                            try {
                                const normalizedIncoming = normalizeLookupKey(clubName);
                                const cands = await client.query(`SELECT id, name, short_name FROM clubs WHERE country_id = $1`, [leagueCountryId]);
                                for (const c of cands.rows) {
                                    const nName = normalizeLookupKey(c.name ?? '');
                                    const nShort = normalizeLookupKey(c.short_name ?? '');
                                    if (nName === normalizedIncoming || nShort === normalizedIncoming) {
                                        cres = { rows: [{ id: c.id, short_name: c.short_name }] };
                                        break;
                                    }
                                }
                            } catch (e) {
                                this.logger.debug(`Normalization club lookup failed: ${String(e)}`);
                            }
                        }
                        if (cres.rows.length) {
                            clubCache[clubName] = cres.rows[0].id;
                            const shortName = cres.rows[0].short_name || clubName;
                            return { id: cres.rows[0].id, shortName };
                        }

                        // Create club
                        const countryId = leagueCountryId;
                        const ins = await client.query(
                            `INSERT INTO clubs (name, short_name, image_url, foundation_year, country_id, city_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, short_name`,
                            [clubName, clubName, clubLogo || null, 2000, countryId, null],
                        );
                        const cid = ins.rows[0].id;
                        const shortName = ins.rows[0].short_name || clubName;
                        clubCache[clubName] = cid;
                        createdClubs += 1;
                        // only track clubs that were actually created during this run
                        if (!clubsIncluded.includes(shortName)) clubsIncluded.push(shortName);
                        return { id: cid, shortName };
                    };

                    const homeName = r['teams.home.name'] ?? r['home_team'] ?? null;
                    const awayName = r['teams.away.name'] ?? r['away_team'] ?? null;
                    const homeLogo = r['teams.home.logo'] ?? null;
                    const awayLogo = r['teams.away.logo'] ?? null;
                    const venueCity = r['fixture.venue.city'] ?? null;
                    const venueName = r['fixture.venue.name'] ?? null;

                    const homeClubResult = await findOrCreateClub(homeName, homeLogo);
                    const awayClubResult = await findOrCreateClub(awayName, awayLogo);
                    const homeClubId = homeClubResult?.id ?? null;
                    const awayClubId = awayClubResult?.id ?? null;
                    const homeClubShortName = homeClubResult?.shortName ?? homeName;
                    const awayClubShortName = awayClubResult?.shortName ?? awayName;

                    await ensureSportClub(homeClubId, homeClubShortName);
                    await ensureSportClub(awayClubId, awayClubShortName);
                    await ensureSeasonClub(homeClubId);
                    await ensureSeasonClub(awayClubId);

                    // Venue data is attached to the fixture, which in football corresponds to the home club context.
                    const cityId = await ensureCity(venueCity);
                    const stadiumResult = await ensureStadium(venueName, cityId);
                    const stadiumId = stadiumResult ? stadiumResult.id : null;
                    if (stadiumResult && stadiumResult.created) {
                        createdStadiums++;
                        if (venueName && homeClubShortName) {
                            stadiumsCreated.push({ id: stadiumResult.id, name: venueName, clubName: homeClubShortName, clubId: homeClubId });
                        }
                    }
                    await ensureClubStadium(homeClubId, stadiumId);

                    // Prepare match insert
                    const dateRaw = r['fixture.date'] ?? r['date'] ?? null;
                    const dateVal = dateRaw ? new Date(String(dateRaw)) : null;
                    const statusShort = r['fixture.status.short'] ?? null;
                    const status = statusShort === 'FT' ? 'Finished' : 'Scheduled';
                    const homeScore = status === 'Finished' && r['goals.home'] !== undefined ? Number(r['goals.home']) : null;
                    const awayScore = status === 'Finished' && r['goals.away'] !== undefined ? Number(r['goals.away']) : null;
                    // Resolve the origin API identifier from whichever key the parser emitted:
                    //   ESPN rows  -> 'origin_api_id' (new) or legacy 'espn_event_id'
                    //   Api-Football rows -> 'fixture.id' (produced by the generic flattener)
                    const originApiIdRaw = r['origin_api_id'] ?? r['espn_event_id'] ?? r['fixture.id'] ?? null;
                    const originApiId: string | null =
                        originApiIdRaw != null && String(originApiIdRaw).trim() !== ''
                            ? String(originApiIdRaw).trim()
                            : null;

                    // ── Upsert logic ─────────────────────────────────────────────
                    // When origin_api_id is available, check whether this match already
                    // exists in the database for the same league/season.
                    //   • Already finished → skip entirely (no duplicates)
                    //   • Exists but not finished AND payload now has scores → UPDATE
                    //   • Does not exist → INSERT as usual
                    let matchId: number;
                    let isExistingMatch = false;

                    if (hasOriginApiIdCol && originApiId) {
                        const existingRes = await client.query(
                            `SELECT id, status, home_score, away_score, round_id FROM matches WHERE origin_api_id = $1 AND league_id = $2 AND season_id = $3 LIMIT 1`,
                            [originApiId, leagueId, seasonId],
                        );
                        if (existingRes.rows.length > 0) {
                            const existing = existingRes.rows[0];
                            // On subsequent loads league.round is null → preserve the DB round_id
                            if (roundId == null && existing.round_id != null) {
                                roundId = existing.round_id;
                            }
                            if (existing.status === 'Finished') {
                                // Match already fully loaded — nothing to do
                                skippedUnchanged += 1;
                                applied += 1;
                                continue;
                            }
                            // Match exists but is not finished yet
                            if (status === 'Finished' && homeScore != null && awayScore != null) {
                                // Payload now has scores → update the match
                                await client.query(
                                    `UPDATE matches SET status = $1, home_score = $2, away_score = $3, round_id = COALESCE($4, round_id), date = COALESCE($5, date), updated_at = now() WHERE id = $6`,
                                    [status, homeScore, awayScore, roundId, dateVal, existing.id],
                                );
                                matchId = existing.id;
                                isExistingMatch = true;
                                updatedMatches += 1;
                                // Recreate match_divisions for the now-finished match
                                await client.query(`DELETE FROM match_divisions WHERE match_id = $1`, [matchId]);
                                try {
                                    const divRes = await this.createMatchDivisions(client, sportId, matchId, r, flgHasDivisions);
                                    if (divRes && divRes.created) createdDivisions += Number(divRes.created) || 0;
                                    // When flg_has_divisions is false, zero-out scores and queue for ESPN enrichment
                                    // Only queue finished matches — unfinished ones have no partial scores to fetch
                                    if (!flgHasDivisions && transitionalOrigin === 'Api-Espn' && originApiId && status === 'Finished') {
                                        await client.query(`UPDATE match_divisions SET home_score = 0, away_score = 0 WHERE match_id = $1`, [matchId]);
                                        matchesForEnrichment.push({ matchId, originApiId });
                                    }
                                } catch (e) {
                                    throw e;
                                }
                            } else {
                                // Still not finished in the payload either — skip
                                skippedUnchanged += 1;
                                applied += 1;
                                continue;
                            }
                        }
                    }

                    if (!isExistingMatch) {
                        // Insert new match
                        let matchRes;
                        if (hasOriginApiIdCol) {
                            matchRes = await client.query(
                                `INSERT INTO matches (sport_id, league_id, season_id, round_id, group_id, home_club_id, away_club_id, stadium_id, date, status, home_score, away_score, origin_api_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
                                [sportId, leagueId, seasonId, roundId, null, homeClubId, awayClubId, stadiumId, dateVal, status, homeScore, awayScore, originApiId],
                            );
                        } else {
                            matchRes = await client.query(
                                `INSERT INTO matches (sport_id, league_id, season_id, round_id, group_id, home_club_id, away_club_id, stadium_id, date, status, home_score, away_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
                                [sportId, leagueId, seasonId, roundId, null, homeClubId, awayClubId, stadiumId, dateVal, status, homeScore, awayScore],
                            );
                        }
                        matchId = matchRes.rows[0].id;
                        createdMatches++;
                        // create match_divisions rows for NEW matches
                        try {
                            const divRes = await this.createMatchDivisions(client, sportId, matchId, r, flgHasDivisions);
                            if (divRes && divRes.created) createdDivisions += Number(divRes.created) || 0;
                            // When flg_has_divisions is false, zero-out scores and queue for ESPN enrichment
                            // Only queue finished matches — unfinished ones have no partial scores to fetch
                            if (!flgHasDivisions && transitionalOrigin === 'Api-Espn' && originApiId && status === 'Finished') {
                                await client.query(`UPDATE match_divisions SET home_score = 0, away_score = 0 WHERE match_id = $1`, [matchId]);
                                matchesForEnrichment.push({ matchId, originApiId });
                            }
                        } catch (e) {
                            throw e;
                        }
                    }

                    // Build standings only for finished matches: fetch previous standings and match_divisions, compute stats, insert two rows
                    try {
                        if (status !== 'Finished') {
                            // skip standings update for non-finished matches
                            applied += 1;
                            continue;
                        }
                        // Guard: skip if standings already exist for this match (e.g. re-run)
                        const existingStandingsRes = await client.query(
                            `SELECT COUNT(*)::int as cnt FROM standings WHERE match_id = $1`,
                            [matchId],
                        );
                        if (Number(existingStandingsRes.rows[0]?.cnt ?? 0) > 0) {
                            applied += 1;
                            continue;
                        }
                        // fetch the standings row with the highest round LOWER than the
                        // current round for each club.  Using "ORDER BY id DESC" would
                        // incorrectly pick an early-played future round (e.g. round 31)
                        // as the base when inserting round 30.
                        const latestHomeRes = roundId
                            ? await client.query(
                                `SELECT s.* FROM standings s
                     JOIN rounds r ON r.id = s.round_id
                    WHERE s.club_id = $1 AND s.league_id = $2 AND s.season_id = $3
                      AND r.round_number < (SELECT round_number FROM rounds WHERE id = $4)
                    ORDER BY r.round_number DESC LIMIT 1`,
                                [homeClubId, leagueId, seasonId, roundId],
                            )
                            : await client.query(
                                `SELECT * FROM standings WHERE club_id = $1 AND league_id = $2 AND season_id = $3 ORDER BY id DESC LIMIT 1`,
                                [homeClubId, leagueId, seasonId],
                            );

                        const latestAwayRes = roundId
                            ? await client.query(
                                `SELECT s.* FROM standings s
                     JOIN rounds r ON r.id = s.round_id
                    WHERE s.club_id = $1 AND s.league_id = $2 AND s.season_id = $3
                      AND r.round_number < (SELECT round_number FROM rounds WHERE id = $4)
                    ORDER BY r.round_number DESC LIMIT 1`,
                                [awayClubId, leagueId, seasonId, roundId],
                            )
                            : await client.query(
                                `SELECT * FROM standings WHERE club_id = $1 AND league_id = $2 AND season_id = $3 ORDER BY id DESC LIMIT 1`,
                                [awayClubId, leagueId, seasonId],
                            );

                        const latestHomeStanding = latestHomeRes.rows[0] ?? null;
                        const latestAwayStanding = latestAwayRes.rows[0] ?? null;

                        const mapRowToStanding = (r: any) =>
                            r
                                ? {
                                    points: r.points ?? 0,
                                    played: r.played ?? r.games_played ?? 0,
                                    wins: r.wins ?? 0,
                                    draws: r.draws ?? 0,
                                    losses: r.losses ?? 0,
                                    goalsFor: r.goals_for ?? r.goalsFor ?? 0,
                                    goalsAgainst: r.goals_against ?? r.goalsAgainst ?? 0,
                                    homeGamesPlayed: r.home_games_played ?? r.homeGamesPlayed ?? 0,
                                    awayGamesPlayed: r.away_games_played ?? r.awayGamesPlayed ?? 0,
                                    homePoints: r.home_points ?? r.homePoints ?? 0,
                                    awayPoints: r.away_points ?? r.awayPoints ?? 0,
                                    homeWins: r.home_wins ?? r.homeWins ?? 0,
                                    homeLosses: r.home_losses ?? r.homeLosses ?? 0,
                                    homeDraws: r.home_draws ?? r.homeDraws ?? 0,
                                    homeGoalsFor: r.home_goals_for ?? r.homeGoalsFor ?? 0,
                                    homeGoalsAgainst: r.home_goals_against ?? r.homeGoalsAgainst ?? 0,
                                    awayWins: r.away_wins ?? r.awayWins ?? 0,
                                    awayLosses: r.away_losses ?? r.awayLosses ?? 0,
                                    awayDraws: r.away_draws ?? r.awayDraws ?? 0,
                                    awayGoalsFor: r.away_goals_for ?? r.awayGoalsFor ?? 0,
                                    awayGoalsAgainst: r.away_goals_against ?? r.awayGoalsAgainst ?? 0,
                                    overtimeWins: r.overtime_wins ?? r.overtimeWins ?? 0,
                                    overtimeLosses: r.overtime_losses ?? r.overtimeLosses ?? 0,
                                    penaltyWins: r.penalty_wins ?? r.penaltyWins ?? 0,
                                    penaltyLosses: r.penalty_losses ?? r.penaltyLosses ?? 0,
                                    setsWon: r.sets_won ?? r.setsWon ?? 0,
                                    setsLost: r.sets_lost ?? r.setsLost ?? 0,
                                }
                                : null;

                        const latestHome = mapRowToStanding(latestHomeStanding);
                        const latestAway = mapRowToStanding(latestAwayStanding);

                        // fetch sport name
                        const spn = await client.query(`SELECT name FROM sports WHERE id = $1 LIMIT 1`, [sportId]);
                        const sportName = spn.rows[0]?.name ?? 'default';

                        // fetch match divisions we just created
                        const md = await client.query(
                            `SELECT id, division_number, division_type, home_score, away_score FROM match_divisions WHERE match_id = $1 ORDER BY division_number ASC`,
                            [matchId],
                        );
                        const matchDivisions = md.rows.map((d: any) => ({ id: d.id, divisionNumber: d.division_number, divisionType: d.division_type, homeScore: d.home_score, awayScore: d.away_score }));

                        const matchData = {
                            sportId: sportId,
                            leagueId,
                            seasonId,
                            roundId,
                            matchDate: dateVal,
                            groupId: null,
                            homeClubId,
                            awayClubId,
                            homeScore: homeScore ?? 0,
                            awayScore: awayScore ?? 0,
                            matchId: matchId,
                            matchDivisions,
                        };

                        // Use calculator to compute stats
                        const { home: homeStats, away: awayStats } = standingsCalculator.calculate(
                            sportName,
                            matchData,
                            latestHome,
                            latestAway,
                        );

                        // Insert home standing (validate param count before executing)
                        {
                            const standingsSql = `INSERT INTO standings (sport_id, league_id, season_id, round_id, match_date, group_id, club_id, match_id, points, played, wins, draws, losses, goals_for, goals_against, sets_won, sets_lost, home_games_played, away_games_played, home_points, away_points, home_wins, home_draws, home_losses, home_goals_for, home_goals_against, away_wins, away_draws, away_losses, away_goals_for, away_goals_against, overtime_wins, overtime_losses, penalty_wins, penalty_losses) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)`;
                            let standingsParams: any[] = [
                                sportId,
                                leagueId,
                                seasonId,
                                roundId ?? null,
                                dateVal,
                                null,
                                homeClubId,
                                matchId,
                                homeStats.points,
                                homeStats.played,
                                homeStats.wins,
                                homeStats.draws,
                                homeStats.losses,
                                homeStats.goalsFor,
                                homeStats.goalsAgainst,
                                homeStats.setsWon,
                                homeStats.setsLost,
                                homeStats.homeGamesPlayed,
                                homeStats.awayGamesPlayed,
                                homeStats.homePoints,
                                homeStats.awayPoints,
                                homeStats.homeWins,
                                homeStats.homeDraws,
                                homeStats.homeLosses,
                                homeStats.homeGoalsFor,
                                homeStats.homeGoalsAgainst,
                                homeStats.awayWins,
                                homeStats.awayDraws,
                                homeStats.awayLosses,
                                homeStats.awayGoalsFor,
                                homeStats.awayGoalsAgainst,
                                homeStats.overtimeWins,
                                homeStats.overtimeLosses,
                                homeStats.penaltyWins,
                                homeStats.penaltyLosses,
                            ];
                            const placeholders = (standingsSql.match(/\$\d+/g) || []).length;
                            if (standingsParams.length !== placeholders) {
                                this.logger.warn(`Param count mismatch for standings INSERT (home): expected=${placeholders} got=${standingsParams.length}. Adjusting params.`);
                                if (standingsParams.length > placeholders) {
                                    standingsParams = standingsParams.slice(0, placeholders);
                                } else {
                                    // pad with nulls so we don't trigger Postgres placeholder mismatch
                                    while (standingsParams.length < placeholders) standingsParams.push(null);
                                }
                            }
                            await client.query(standingsSql, standingsParams);
                        }

                        // Insert away standing (validate param count before executing)
                        {
                            const standingsSql = `INSERT INTO standings (sport_id, league_id, season_id, round_id, match_date, group_id, club_id, match_id, points, played, wins, draws, losses, goals_for, goals_against, sets_won, sets_lost, home_games_played, away_games_played, home_points, away_points, home_wins, home_draws, home_losses, home_goals_for, home_goals_against, away_wins, away_draws, away_losses, away_goals_for, away_goals_against, overtime_wins, overtime_losses, penalty_wins, penalty_losses) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)`;
                            let standingsParams: any[] = [
                                sportId,
                                leagueId,
                                seasonId,
                                roundId ?? null,
                                dateVal,
                                null,
                                awayClubId,
                                matchId,
                                awayStats.points,
                                awayStats.played,
                                awayStats.wins,
                                awayStats.draws,
                                awayStats.losses,
                                awayStats.goalsFor,
                                awayStats.goalsAgainst,
                                awayStats.setsWon,
                                awayStats.setsLost,
                                awayStats.homeGamesPlayed,
                                awayStats.awayGamesPlayed,
                                awayStats.homePoints,
                                awayStats.awayPoints,
                                awayStats.homeWins,
                                awayStats.homeDraws,
                                awayStats.homeLosses,
                                awayStats.homeGoalsFor,
                                awayStats.homeGoalsAgainst,
                                awayStats.awayWins,
                                awayStats.awayDraws,
                                awayStats.awayLosses,
                                awayStats.awayGoalsFor,
                                awayStats.awayGoalsAgainst,
                                awayStats.overtimeWins,
                                awayStats.overtimeLosses,
                                awayStats.penaltyWins,
                                awayStats.penaltyLosses,
                            ];
                            const placeholders = (standingsSql.match(/\$\d+/g) || []).length;
                            if (standingsParams.length !== placeholders) {
                                this.logger.warn(`Param count mismatch for standings INSERT (away): expected=${placeholders} got=${standingsParams.length}. Adjusting params.`);
                                if (standingsParams.length > placeholders) {
                                    standingsParams = standingsParams.slice(0, placeholders);
                                } else {
                                    while (standingsParams.length < placeholders) standingsParams.push(null);
                                }
                            }
                            await client.query(standingsSql, standingsParams);
                        }
                        createdStandings += 2;

                        // ── Cascade recalculation for future rounds ─────────────────
                        // When a club already has standings rows for rounds AFTER the
                        // current one (early-played matches), those rows were computed
                        // without this round's result.  Recalculate them in ascending
                        // round order so the cumulative totals cascade correctly.
                        const cascadeClub = async (clubId: number) => {
                            if (!roundId) return; // can't cascade without knowing the current round
                            // Get current round number
                            const curRndRes = await client.query(
                                `SELECT round_number FROM rounds WHERE id = $1 LIMIT 1`,
                                [roundId],
                            );
                            const currentRoundNumber = curRndRes.rows[0]?.round_number;
                            if (currentRoundNumber == null) return;

                            // Find all standings rows for this club in higher rounds
                            const futureRes = await client.query(
                                `SELECT s.id AS standings_id, s.match_id, s.round_id, r.round_number,
                        m.home_club_id, m.away_club_id, m.home_score, m.away_score, m.date
                   FROM standings s
                   JOIN rounds r ON r.id = s.round_id
                   JOIN matches m ON m.id = s.match_id
                  WHERE s.club_id = $1 AND s.league_id = $2 AND s.season_id = $3
                    AND r.round_number > $4
                  ORDER BY r.round_number ASC`,
                                [clubId, leagueId, seasonId, currentRoundNumber],
                            );
                            if (futureRes.rows.length === 0) return;

                            for (const futureRow of futureRes.rows) {
                                // Fetch the standings row immediately BEFORE this future row for this club
                                const prevRes = await client.query(
                                    `SELECT s.* FROM standings s
                     JOIN rounds r ON r.id = s.round_id
                    WHERE s.club_id = $1 AND s.league_id = $2 AND s.season_id = $3
                      AND r.round_number < $4
                    ORDER BY r.round_number DESC LIMIT 1`,
                                    [clubId, leagueId, seasonId, futureRow.round_number],
                                );
                                const prevStanding = mapRowToStanding(prevRes.rows[0] ?? null);

                                // Determine if this club was home or away in the future match
                                const isHome = futureRow.home_club_id === clubId;
                                const opponentClubId = isHome ? futureRow.away_club_id : futureRow.home_club_id;

                                // Fetch opponent's standings row immediately before the future round
                                const opPrevRes = await client.query(
                                    `SELECT s.* FROM standings s
                     JOIN rounds r ON r.id = s.round_id
                    WHERE s.club_id = $1 AND s.league_id = $2 AND s.season_id = $3
                      AND r.round_number < $4
                    ORDER BY r.round_number DESC LIMIT 1`,
                                    [opponentClubId, leagueId, seasonId, futureRow.round_number],
                                );
                                const opPrevStanding = mapRowToStanding(opPrevRes.rows[0] ?? null);

                                // Fetch match_divisions for the future match
                                const fmd = await client.query(
                                    `SELECT id, division_number, division_type, home_score, away_score FROM match_divisions WHERE match_id = $1 ORDER BY division_number ASC`,
                                    [futureRow.match_id],
                                );

                                const fMatchData = {
                                    sportId,
                                    leagueId,
                                    seasonId,
                                    roundId: futureRow.round_id,
                                    matchDate: futureRow.date,
                                    groupId: null,
                                    homeClubId: futureRow.home_club_id,
                                    awayClubId: futureRow.away_club_id,
                                    homeScore: Number(futureRow.home_score ?? 0),
                                    awayScore: Number(futureRow.away_score ?? 0),
                                    matchId: futureRow.match_id,
                                    matchDivisions: fmd.rows.map((d: any) => ({ id: d.id, divisionNumber: d.division_number, divisionType: d.division_type, homeScore: d.home_score, awayScore: d.away_score })),
                                };

                                const { home: fHomeStats, away: fAwayStats } = standingsCalculator.calculate(
                                    sportName,
                                    fMatchData,
                                    isHome ? prevStanding : opPrevStanding,
                                    isHome ? opPrevStanding : prevStanding,
                                );

                                // Pick the stats that correspond to this club
                                const clubStats = isHome ? fHomeStats : fAwayStats;

                                // Update the existing standings row
                                await client.query(
                                    `UPDATE standings SET
                     points = $1, played = $2, wins = $3, draws = $4, losses = $5,
                     goals_for = $6, goals_against = $7, sets_won = $8, sets_lost = $9,
                     home_games_played = $10, away_games_played = $11,
                     home_points = $12, away_points = $13,
                     home_wins = $14, home_draws = $15, home_losses = $16,
                     home_goals_for = $17, home_goals_against = $18,
                     away_wins = $19, away_draws = $20, away_losses = $21,
                     away_goals_for = $22, away_goals_against = $23,
                     overtime_wins = $24, overtime_losses = $25,
                     penalty_wins = $26, penalty_losses = $27,
                     updated_at = now()
                   WHERE id = $28`,
                                    [
                                        clubStats.points, clubStats.played, clubStats.wins, clubStats.draws, clubStats.losses,
                                        clubStats.goalsFor, clubStats.goalsAgainst, clubStats.setsWon, clubStats.setsLost,
                                        clubStats.homeGamesPlayed, clubStats.awayGamesPlayed,
                                        clubStats.homePoints, clubStats.awayPoints,
                                        clubStats.homeWins, clubStats.homeDraws, clubStats.homeLosses,
                                        clubStats.homeGoalsFor, clubStats.homeGoalsAgainst,
                                        clubStats.awayWins, clubStats.awayDraws, clubStats.awayLosses,
                                        clubStats.awayGoalsFor, clubStats.awayGoalsAgainst,
                                        clubStats.overtimeWins, clubStats.overtimeLosses,
                                        clubStats.penaltyWins, clubStats.penaltyLosses,
                                        futureRow.standings_id,
                                    ],
                                );
                            }
                        };

                        await cascadeClub(homeClubId);
                        await cascadeClub(awayClubId);
                    } catch (e) {
                        throw e;
                    }

                    applied += 1;
                } catch (e) {
                    // rollback and log with diagnostic details when available
                    const snapshotSql = lastSqlAll;
                    const snapshotParams = lastParamsAll;
                    try {
                        await client.query('ROLLBACK');
                    } catch (_) { }
                    const includeDebug = process.env.DEBUG_ETL === 'true' || process.env.NODE_ENV !== 'production';
                    const details: any = { error: String(e), row: r };
                    // Try to parse column list from last SQL and map failing param index to column
                    try {
                        let cols: string[] | undefined = undefined;
                        if (snapshotSql && typeof snapshotSql === 'string') {
                            const m = snapshotSql.match(/INSERT\s+INTO\s+[^\(]+\(([^)]+)\)/i);
                            if (m && m[1]) {
                                cols = m[1].split(',').map((s) => s.trim());
                                if (snapshotParams && Array.isArray(snapshotParams)) {
                                    for (let i = 0; i < snapshotParams.length; i++) {
                                        const val = snapshotParams[i];
                                        if (val === 'NaN' || (typeof val === 'number' && Number.isNaN(val))) {
                                            details.failing = { index: i + 1, column: cols[i] ?? null, value: val };
                                            break;
                                        }
                                        const colName = cols[i] ?? '';
                                        const numericHint = /\b(id|score|goals|minute|seconds|number|round|home|away|points|played|wins|losses|draws)\b/i.test(colName);
                                        if (numericHint && val !== null && val !== undefined && !/^[-]?\d+$/.test(String(val))) {
                                            details.failing = { index: i + 1, column: colName || null, value: val };
                                            break;
                                        }
                                    }
                                }
                            } else {
                                if (snapshotParams && Array.isArray(snapshotParams)) details.paramValues = snapshotParams;
                            }
                        } else {
                            if (snapshotParams && Array.isArray(snapshotParams)) details.paramValues = snapshotParams;
                        }
                        // If we didn't find a failing param via SQL/params, try to inspect the parsed row for NaN-like values
                        if (!details.failing && (String(e).toLowerCase().includes('invalid input syntax for type integer') || String(e).includes('NaN'))) {
                            const offending: Array<any> = [];
                            const numericKeyRegex = /\b(id|score|goals|minute|seconds|number|round|periods|elapsed|timestamp|home|away|points|played|wins|losses|draws)\b/i;
                            for (const k of Object.keys(r || {})) {
                                // only consider keys that look like numeric fields
                                if (!numericKeyRegex.test(k)) continue;
                                const v = r[k];
                                if (v === 'NaN' || (typeof v === 'number' && Number.isNaN(v)) || (v !== null && v !== undefined && v !== '' && Number.isNaN(Number(v)))) {
                                    // try to guess a column name by simple mapping: direct key -> column or key with dots replaced
                                    // guess target column by preferring a direct match in parsed INSERT cols when available
                                    const guessedColumn = cols && cols.includes(k) ? k : k.replace(/\./g, '_');
                                    offending.push({ key: k, value: v, guessedColumn });
                                }
                            }
                            if (offending.length) details.offendingFields = offending;
                        }
                    } catch (_) { }
                    if (includeDebug) {
                        details.lastSql = snapshotSql;
                        details.lastParams = snapshotParams;
                    }
                    await client.query(`INSERT INTO api_import_log (transitional_id, message, details) VALUES ($1,$2,$3)`, [
                        id,
                        'apply_all_rows_error',
                        details,
                    ]);
                    return { applied: 0, error: String(e), rolledBack: true, details: includeDebug ? details : undefined };
                }
            }

            // Insert audit record summarizing the runcreatedStadiums, stadiumsCreated, 
            try {
                await client.query(
                    `INSERT INTO api_transitional_audit (transitional_id, action, payload) VALUES ($1,$2,$3)`,
                    [
                        id,
                        options.dryRun ? 'dry_run' : 'applied',
                        { applied, createdClubs, createdRounds, createdDivisions, createdStandings, createdMatches, skippedUnchanged, updatedMatches, clubsIncluded, dryRun: !!options.dryRun },
                    ],
                );
            } catch (e) {
                // audit insertion failed — log and continue to commit/rollback
                this.logger.error('Failed to write api_transitional_audit', e as any);
            }

            if (options.dryRun) {
                await client.query('ROLLBACK');
            } else {
                await client.query('COMMIT');
                await this.deleteRoundReview(id);
            }

            const result: any = { 
                applied, 
                createdClubs, 
                createdRounds, 
                createdDivisions, 
                createdStandings, 
                createdMatches,
                createdStadiums,
                stadiumsCreated,
                skippedUnchanged, 
                updatedMatches, 
                clubsIncluded, 
                dryRun: !!options.dryRun, 
                isSubsequentLoad, 
                enrichmentQueued: matchesForEnrichment.length 
            };

            // ── ESPN partial-score enrichment ─────────────────────────────
            // When flg_has_divisions is false, divisions were created with zero scores.
            // Now that the transaction is committed, fetch real partial scores from ESPN.
            // Skip entirely on dry runs — no real data was saved, no internet traffic needed.
            if (!options.dryRun && matchesForEnrichment.length > 0 && transitionalLeagueCode) {
                // Resolve ESPN-compatible sport name
                let espnSportName = 'soccer';
                try {
                    const spRes = await pool.query(`SELECT name FROM sports WHERE id = $1 LIMIT 1`, [sportId]);
                    if (spRes.rows.length) {
                        const sn = (spRes.rows[0].name ?? 'football').toLowerCase();
                        espnSportName = (sn === 'football' || sn === 'footaball') ? 'soccer' : sn;
                    }
                } catch { /* default to soccer */ }

                this.logger.log(`ESPN enrichment: ${matchesForEnrichment.length} matches queued (background=${flgRunInBackground})`);
                if (flgRunInBackground) {
                    // Fire-and-forget: run outside the request lifecycle
                    const leagueCode = transitionalLeagueCode;
                    const matches = [...matchesForEnrichment];
                    const sportN = espnSportName;
                    setImmediate(() => {
                        this.enrichMatchDivisionsFromEspn(sportN, leagueCode, matches).catch((e) =>
                            this.logger.error(`Background ESPN enrichment failed: ${String(e)}`),
                        );
                    });
                } else {
                    // Inline: wait for enrichment to finish before returning
                    result.enrichment = await this.enrichMatchDivisionsFromEspn(espnSportName, transitionalLeagueCode, matchesForEnrichment);
                }
            }

            return result;
        } catch (e) {
            const snapshotSql = lastSqlAll;
            const snapshotParams = lastParamsAll;
            try {
                await client.query('ROLLBACK');
            } catch (_) { }
            const includeDebug = process.env.DEBUG_ETL === 'true' || process.env.NODE_ENV !== 'production';
            const details: any = { error: String(e) };
            if (includeDebug) {
                details.lastSql = snapshotSql;
                details.lastParams = snapshotParams;
                try {
                    if (snapshotParams && Array.isArray(snapshotParams)) details.paramValues = snapshotParams;
                } catch (_) { }
            }
            await client.query(`INSERT INTO api_import_log (transitional_id, message, details) VALUES ($1,$2,$3)`, [id, 'apply_all_rows_exception', details]);
            this.logger.error('applyAllRowsToApp error', e as any);
            return { applied: 0, error: String(e), details: includeDebug ? details : undefined };
        } finally {
            client.release();
            await pool.end();
        }
    }
}
