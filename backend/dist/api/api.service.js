"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ApiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiService = void 0;
const common_1 = require("@nestjs/common");
const standings_calculator_service_1 = require("../standings/standings-calculator.service");
const pg_1 = require("pg");
const normalizeText = (value) => String(value ?? '').trim();
const normalizeLookupKey = (value) => normalizeText(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
let ApiService = ApiService_1 = class ApiService {
    constructor() {
        this.logger = new common_1.Logger(ApiService_1.name);
    }
    async importData(payload) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        let insertCols = [];
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
            const res = await pool.query(`INSERT INTO api_transitional (payload) VALUES ($1) RETURNING id, fetched_at;`, [payload]);
            this.logger.log(`Inserted api_transitional id=${res.rows[0].id}`);
            return { id: res.rows[0].id, fetched_at: res.rows[0].fetched_at };
        }
        finally {
            await pool.end();
        }
    }
    async extractStructuredFromTransitional(id) {
        const row = await this.getTransitional(id);
        if (!row)
            return { found: false };
        const payload = row.payload ?? row;
        let arr = null;
        if (Array.isArray(payload))
            arr = payload;
        else if (payload?.response && Array.isArray(payload.response))
            arr = payload.response;
        else if (payload?.data && Array.isArray(payload.data))
            arr = payload.data;
        else if (payload?.results && Array.isArray(payload.results))
            arr = payload.results;
        if (!arr) {
            const stack = [payload];
            const seen = new Set();
            while (stack.length) {
                const cur = stack.shift();
                if (!cur || typeof cur !== 'object')
                    continue;
                if (seen.has(cur))
                    continue;
                seen.add(cur);
                for (const k of Object.keys(cur)) {
                    const v = cur[k];
                    if (Array.isArray(v)) {
                        arr = v;
                        break;
                    }
                    if (v && typeof v === 'object')
                        stack.push(v);
                }
                if (arr)
                    break;
            }
        }
        const get = (obj, path) => {
            if (!obj)
                return null;
            return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
        };
        let firstRow = {};
        const sample = (Array.isArray(arr) && arr.length) ? arr[0] : payload;
        if (sample) {
            firstRow['league.name'] = get(sample, 'league.name') ?? get(payload, 'league.name') ?? null;
            firstRow['league.season'] = get(sample, 'league.season') ?? get(payload, 'league.season') ?? null;
            firstRow['league.country'] = get(sample, 'league.country') ?? get(payload, 'league.country') ?? null;
            firstRow['league.flag'] = get(sample, 'league.flag') ?? get(payload, 'league.flag') ?? null;
            firstRow['league.image'] = get(sample, 'league.image') ?? get(payload, 'league.image') ?? payload?.leagues?.[0]?.logos?.[0]?.href ?? null;
        }
        const matches = [];
        if (Array.isArray(arr)) {
            for (const it of arr) {
                const m = {};
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
                m['fixture.status'] = m['fixture.status.long'] ?? m['fixture.status.short'] ?? null;
                m['fixture.timestamp'] = get(it, 'fixture.timestamp') ?? null;
                matches.push(m);
            }
        }
        return { found: true, firstRow, matches };
    }
    async fetchAndStore(league, season, sport, origin, startDate, endDate, seasonStatus, isSeasonDefault, sameYears, scheduleType, isLeagueDefault, hasDivisions, runInBackground) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        const effectiveOrigin = origin || 'Api-Football';
        try {
            let url;
            let headers = {};
            let sportName = null;
            try {
                if (sport !== undefined && sport !== null) {
                    const sRes = await pool.query(`SELECT name FROM sports WHERE id = $1 LIMIT 1`, [sport]);
                    if (sRes && sRes.rows && sRes.rows.length)
                        sportName = sRes.rows[0].name ?? null;
                }
            }
            catch (err) {
                this.logger.debug(`Could not read sport name for id=${sport}: ${String(err)}`);
            }
            sportName = (sportName ?? 'football').toLowerCase();
            if (effectiveOrigin === 'Api-Espn') {
                if (sportName === 'football' || sportName === 'footaball')
                    sportName = 'soccer';
                url = new URL(`https://site.api.espn.com/apis/site/v2/sports/${sportName}/${league}/scoreboard`);
                if (startDate && endDate) {
                    const normalizedStartDate = startDate.replace(/-/g, '');
                    const normalizedEndDate = endDate.replace(/-/g, '');
                    url.searchParams.set('dates', `${normalizedStartDate}-${normalizedEndDate}`);
                    url.searchParams.set('limit', '1000');
                }
                else if (season) {
                    const fallbackStartDate = `${season}0801`;
                    const fallbackEndDate = `${Number(season) + 1}0531`;
                    url.searchParams.set('dates', `${fallbackStartDate}-${fallbackEndDate}`);
                    url.searchParams.set('limit', '1000');
                }
            }
            else {
                const apiKey = process.env.APISPORTS_KEY;
                if (!apiKey)
                    throw new Error('Missing API key: set API_FOOTBALL_KEY or APISPORTS_KEY');
                url = new URL(`https://v3.${sportName}.api-sports.io/fixtures`);
                if (season)
                    url.searchParams.set('season', String(season));
                if (league)
                    url.searchParams.set('league', (league));
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
            const insertRes = await pool.query(`INSERT 
                        INTO api_transitional 
                             (league, season, sport, source_url, payload, origin, season_status, flg_season_default, 
                              flg_season_same_years, league_schedule_type, flg_League_default, flg_has_divisions, flg_run_in_background) 
                      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) 
                      RETURNING id, fetched_at;`, [league || null, season || null, sport || null, url.toString(), json, effectiveOrigin,
                seasonStatus, isSeasonDefault, sameYears, scheduleType, isLeagueDefault, hasDivisions, runInBackground]);
        }
        finally {
            await pool.end();
        }
    }
    async listTransitional(limit = 100) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        try {
            const res = await pool.query(`SELECT id,
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
                 ORDER BY fetched_at DESC LIMIT $1`, [limit]);
            return res.rows;
        }
        finally {
            await pool.end();
        }
    }
    async getTransitional(id) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        try {
            const res = await pool.query(`SELECT * FROM api_transitional WHERE id = $1 LIMIT 1`, [id]);
            return res.rows[0] || null;
        }
        finally {
            await pool.end();
        }
    }
    async ensureRoundReviewTable(pool) {
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
    async getRoundReview(id) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        try {
            await this.ensureRoundReviewTable(pool);
            const res = await pool.query(`SELECT * FROM api_transitional_round_review WHERE transitional_id = $1 ORDER BY id DESC LIMIT 1`, [id]);
            return res.rows[0] || null;
        }
        finally {
            await pool.end();
        }
    }
    async saveRoundReview(id, overrides) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        try {
            await this.ensureRoundReviewTable(pool);
            const normalizedOverrides = Object.fromEntries(Object.entries(overrides || {}).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Number(value)]));
            const res = await pool.query(`INSERT INTO api_transitional_round_review (transitional_id, overrides, status, updated_at, resolved_at)
         VALUES ($1, $2, 'draft', now(), NULL)
         ON CONFLICT (transitional_id)
         DO UPDATE SET overrides = EXCLUDED.overrides, status = 'draft', updated_at = now(), resolved_at = NULL
         RETURNING *`, [id, normalizedOverrides]);
            return res.rows[0] || null;
        }
        finally {
            await pool.end();
        }
    }
    async resolveRoundReview(id, overrides) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        try {
            await this.ensureRoundReviewTable(pool);
            const normalizedOverrides = Object.fromEntries(Object.entries(overrides || {}).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Number(value)]));
            const res = await pool.query(`INSERT INTO api_transitional_round_review (transitional_id, overrides, status, updated_at, resolved_at)
         VALUES ($1, $2, 'resolved', now(), now())
         ON CONFLICT (transitional_id)
         DO UPDATE SET overrides = EXCLUDED.overrides, status = 'resolved', updated_at = now(), resolved_at = now()
         RETURNING *`, [id, normalizedOverrides]);
            return res.rows[0] || null;
        }
        finally {
            await pool.end();
        }
    }
    async deleteRoundReview(id) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        try {
            await this.ensureRoundReviewTable(pool);
            const res = await pool.query(`DELETE FROM api_transitional_round_review WHERE transitional_id = $1 RETURNING transitional_id`, [id]);
            return { deleted: !!res.rows[0] };
        }
        finally {
            await pool.end();
        }
    }
    async getDraftRoundOverrides(id) {
        const review = await this.getRoundReview(id);
        if (!review || review.status !== 'draft')
            return {};
        const raw = review.overrides && typeof review.overrides === 'object' ? review.overrides : {};
        return Object.fromEntries(Object.entries(raw).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Number(value)]));
    }
    async deleteTransitional(id) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        try {
            const res = await pool.query(`DELETE FROM api_transitional WHERE id = $1 RETURNING id`, [id]);
            if (res.rows && res.rows.length) {
                return { deleted: true, id: res.rows[0].id };
            }
            return { deleted: false };
        }
        finally {
            await pool.end();
        }
    }
    async updateTransitional(id, updates) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        try {
            if (!updates || typeof updates !== 'object')
                return { updated: false };
            const allowed = ['status', 'league', 'season', 'sport', 'source_url', 'payload', 'origin'];
            const keys = Object.keys(updates).filter((k) => allowed.includes(k));
            if (!keys.length)
                return { updated: false };
            const params = [];
            const setParts = [];
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
                setParts.push(`${key} = $${i + 2}`);
            }
            const sql = `UPDATE api_transitional SET ${setParts.join(', ')} WHERE id = $1 RETURNING id, status`;
            const res = await pool.query(sql, [id, ...params]);
            if (res.rows && res.rows.length) {
                return { updated: true, id: res.rows[0].id, status: res.rows[0].status };
            }
            return { updated: false };
        }
        finally {
            await pool.end();
        }
    }
    async parseTransitional(id, roundOverrides) {
        const row = await this.getTransitional(id);
        if (!row)
            return { found: false };
        const origin = row.origin ?? 'Api-Football';
        if (origin === 'Api-Espn') {
            const espnLeagueCode = row.league ?? null;
            const meta = this.extractLeagueMetadata(row);
            if (meta.leagueName || espnLeagueCode) {
                const sportId = 36;
                const seasonYears = [];
                if (meta.leagueSeason != null && Number.isFinite(Number(meta.leagueSeason))) {
                    seasonYears.push(Number(meta.leagueSeason));
                }
                const rawSeasonStr = String(row.season ?? '');
                for (const m of (rawSeasonStr.match(/\d{4}/g) ?? [])) {
                    const y = Number(m);
                    if (Number.isFinite(y) && !seasonYears.includes(y))
                        seasonYears.push(y);
                }
                if (seasonYears.length > 0) {
                    const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
                    try {
                        const lRes = await pool.query(`SELECT id FROM leagues WHERE (LOWER(original_name) = LOWER($1) OR LOWER(secondary_name) = LOWER($1) OR ($3::text IS NOT NULL AND espn_id = $3)) AND sport_id = $2 LIMIT 1`, [String(meta.leagueName ?? '').trim(), sportId, espnLeagueCode]);
                        if (lRes.rows.length) {
                            let seasonRow = null;
                            for (const year of seasonYears) {
                                const sRes = await pool.query(`SELECT id FROM seasons WHERE sport_id = $1 AND league_id = $2 AND (start_year = $3 OR end_year = $3) ORDER BY start_year DESC LIMIT 1`, [sportId, lRes.rows[0].id, year]);
                                if (sRes.rows.length) {
                                    seasonRow = sRes.rows[0];
                                    break;
                                }
                            }
                            if (seasonRow) {
                                const roundsRes = await pool.query(`SELECT COUNT(*)::int as cnt FROM rounds WHERE league_id = $1 AND season_id = $2`, [lRes.rows[0].id, seasonRow.id]);
                                if (Number(roundsRes.rows[0]?.cnt ?? 0) > 0) {
                                    const lightweight = this.parseTransitionalEspnLightweight(row);
                                    if (lightweight.found) {
                                        return { ...lightweight, isSubsequentLoad: true };
                                    }
                                }
                            }
                        }
                    }
                    finally {
                        await pool.end();
                    }
                }
            }
        }
        const savedOverrides = await this.getDraftRoundOverrides(id);
        const effectiveRoundOverrides = { ...savedOverrides, ...(roundOverrides ?? {}) };
        if (origin === 'Api-Espn') {
            return this.parseTransitionalEspn(row, effectiveRoundOverrides);
        }
        const payload = row.payload ?? row;
        let arr = null;
        if (Array.isArray(payload))
            arr = payload;
        else if (payload?.response && Array.isArray(payload.response))
            arr = payload.response;
        else if (payload?.data && Array.isArray(payload.data))
            arr = payload.data;
        else if (payload?.results && Array.isArray(payload.results))
            arr = payload.results;
        if (!arr) {
            const stack = [payload];
            const seen = new Set();
            while (stack.length) {
                const cur = stack.shift();
                if (!cur || typeof cur !== 'object')
                    continue;
                if (seen.has(cur))
                    continue;
                seen.add(cur);
                for (const k of Object.keys(cur)) {
                    const v = cur[k];
                    if (Array.isArray(v)) {
                        arr = v;
                        break;
                    }
                    if (v && typeof v === 'object')
                        stack.push(v);
                }
                if (arr)
                    break;
            }
        }
        const get = (obj, path) => {
            if (!obj)
                return null;
            return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
        };
        let firstRow = {};
        const sample = (Array.isArray(arr) && arr.length) ? arr[0] : payload;
        if (sample) {
            firstRow['league.name'] = get(sample, 'league.name') ?? get(payload, 'league.name') ?? null;
            firstRow['league.season'] = get(sample, 'league.season') ?? get(payload, 'league.season') ?? null;
            firstRow['league.country'] = get(sample, 'league.country') ?? get(payload, 'league.country') ?? null;
            firstRow['league.flag'] = get(sample, 'league.flag') ?? get(payload, 'league.flag') ?? null;
        }
        let rows;
        if (!arr) {
            rows = [payload];
        }
        else {
            rows = arr;
        }
        const flatten = (obj, prefix = '') => {
            const out = {};
            if (obj === null || obj === undefined)
                return out;
            if (typeof obj !== 'object') {
                out[prefix || 'value'] = obj;
                return out;
            }
            for (const k of Object.keys(obj)) {
                const v = obj[k];
                const key = prefix ? `${prefix}.${k}` : k;
                if (v === null || v === undefined) {
                    out[key] = v;
                }
                else if (Array.isArray(v)) {
                    try {
                        out[key] = JSON.stringify(v);
                    }
                    catch (e) {
                        out[key] = String(v);
                    }
                }
                else if (typeof v === 'object' && !(v instanceof Date)) {
                    const nested = flatten(v, key);
                    Object.assign(out, nested);
                }
                else if (v instanceof Date) {
                    out[key] = v.toISOString();
                }
                else {
                    out[key] = v;
                }
            }
            return out;
        };
        const flatRows = rows.map((r) => flatten(r));
        const columns = Array.from(new Set(flatRows.flatMap(Object.keys)));
        return { found: true, columns, rows: flatRows };
    }
    parseTransitionalEspn(row, roundOverrides) {
        const payload = row.payload ?? row;
        const events = payload?.events ?? [];
        if (!Array.isArray(events) || events.length === 0) {
            return { found: false, reason: 'no_events_array' };
        }
        const firstEvent = events[0];
        const seasonInfo = firstEvent?.season ?? {};
        const leagueInfo = payload?.leagues?.[0] ?? {};
        const getEspnRoundNumbers = (items, overrides = new Map()) => {
            const roundByEventId = new Map();
            const uniqueClubIds = new Set();
            const reservedEventIds = new Set();
            const getTeamId = (competitor) => {
                const teamId = competitor?.team?.id ?? competitor?.id;
                return teamId !== undefined && teamId !== null ? String(teamId) : null;
            };
            const getTeamName = (competitor) => competitor?.team?.displayName ?? competitor?.team?.shortDisplayName ?? competitor?.team?.name ?? null;
            const getTeamShortName = (competitor) => competitor?.team?.shortDisplayName ?? competitor?.team?.abbreviation ?? competitor?.team?.displayName ?? competitor?.team?.name ?? null;
            for (const event of items) {
                const competition = event?.competitions?.[0];
                const competitors = competition?.competitors ?? [];
                for (const competitor of competitors) {
                    const teamId = getTeamId(competitor);
                    if (teamId)
                        uniqueClubIds.add(teamId);
                }
            }
            const allTeamIds = Array.from(uniqueClubIds);
            const maxMatchesPerRound = uniqueClubIds.size >= 2 ? Math.floor(uniqueClubIds.size / 2) : null;
            const toUtcDay = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            const LEAGUE_TIMEZONE = 'America/Brasilia';
            const toLocalDay = (date) => {
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
                }
                catch (err) {
                    return toUtcDay(date);
                }
            };
            const formatLeagueLocalDate = (date) => {
                if (!date)
                    return null;
                try {
                    return new Intl.DateTimeFormat('en-CA', {
                        timeZone: LEAGUE_TIMEZONE,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                    }).format(date);
                }
                catch (err) {
                    return date.toISOString().slice(0, 10);
                }
            };
            const sortableEvents = items
                .map((event, index) => {
                const competition = event?.competitions?.[0];
                const competitors = competition?.competitors ?? [];
                const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0] ?? null;
                const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1] ?? competitors.find((c) => c !== home) ?? null;
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
                .sort((left, right) => left.date.getTime() - right.date.getTime());
            const expectedRoundCount = maxMatchesPerRound !== null
                ? Math.max(1, Math.ceil(sortableEvents.length / maxMatchesPerRound))
                : null;
            const buildRoundSummary = (assignmentMap) => {
                const summaryByRound = new Map();
                for (const entry of sortableEvents) {
                    const eventId = entry.event?.id !== undefined && entry.event?.id !== null ? String(entry.event.id) : null;
                    if (!eventId)
                        continue;
                    const assignedRound = assignmentMap.get(eventId);
                    if (assignedRound === undefined || assignedRound === null)
                        continue;
                    let bucket = summaryByRound.get(assignedRound);
                    if (!bucket) {
                        bucket = {
                            round: assignedRound,
                            assignedMatches: 0,
                            teamIds: new Set(),
                            duplicateTeamIds: new Set(),
                            eventIds: [],
                            minDate: null,
                            maxDate: null,
                        };
                        summaryByRound.set(assignedRound, bucket);
                    }
                    bucket.assignedMatches += 1;
                    bucket.eventIds.push(eventId);
                    if (entry.date) {
                        if (!bucket.minDate || entry.date.getTime() < bucket.minDate.getTime())
                            bucket.minDate = entry.date;
                        if (!bucket.maxDate || entry.date.getTime() > bucket.maxDate.getTime())
                            bucket.maxDate = entry.date;
                    }
                    for (const teamId of [entry.homeId, entry.awayId]) {
                        if (!teamId)
                            continue;
                        if (bucket.teamIds.has(teamId))
                            bucket.duplicateTeamIds.add(teamId);
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
                    const duplicateTeamIds = bucket?.duplicateTeamIds ?? new Set();
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
            const buildReviewDetails = (message, currentEventItem, highlightedEventIds = []) => {
                const { roundSummary, summaryByRound, inferredRoundCount } = buildRoundSummary(roundByEventId);
                const teamNamesById = new Map();
                for (const entry of sortableEvents) {
                    if (entry.homeId && entry.homeName && !teamNamesById.has(entry.homeId))
                        teamNamesById.set(entry.homeId, entry.homeName);
                    if (entry.awayId && entry.awayName && !teamNamesById.has(entry.awayId))
                        teamNamesById.set(entry.awayId, entry.awayName);
                }
                const maxCandidateRound = expectedRoundCount ?? inferredRoundCount;
                const highlightedSet = new Set(highlightedEventIds);
                const reviewMatches = sortableEvents.map((entry) => {
                    const eventId = entry.event?.id !== undefined && entry.event?.id !== null ? String(entry.event.id) : null;
                    const competition = entry.event?.competitions?.[0];
                    const competitors = competition?.competitors ?? [];
                    const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0] ?? null;
                    const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1] ?? null;
                    const status = competition?.status?.type ?? {};
                    const assignedRound = eventId ? roundByEventId.get(eventId) ?? null : null;
                    const isOutOfRangeAssignment = assignedRound !== null && expectedRoundCount !== null && assignedRound > expectedRoundCount;
                    const candidateRounds = [];
                    if (maxMatchesPerRound !== null && entry.homeId && entry.awayId) {
                        for (let round = 1; round <= maxCandidateRound; round++) {
                            const bucket = summaryByRound.get(round);
                            const teamIds = bucket?.teamIds ?? new Set();
                            const assignedMatches = bucket?.assignedMatches ?? 0;
                            const currentAssignment = assignedRound === round;
                            const canFitTeams = currentAssignment || (!teamIds.has(entry.homeId) && !teamIds.has(entry.awayId));
                            const canFitSize = currentAssignment || assignedMatches < maxMatchesPerRound;
                            if (canFitTeams && canFitSize)
                                candidateRounds.push(round);
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
                const validationErrors = [];
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
            const buildReviewConflict = (message, currentEventItem, highlightedEventIds = []) => {
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
            const openIncompleteRounds = [];
            const reviewEventIds = new Set();
            const addOpenIncompleteRound = (round, teamIdsInRound) => {
                const missingTeamIds = new Set(allTeamIds.filter((teamId) => !teamIdsInRound.has(teamId)));
                if (missingTeamIds.size !== 2)
                    return;
                const existing = openIncompleteRounds.find((entry) => entry.round === round);
                if (existing) {
                    existing.missingTeamIds = missingTeamIds;
                    return;
                }
                openIncompleteRounds.push({ round, missingTeamIds });
            };
            const allEventIds = sortableEvents
                .map((entry) => (entry.event?.id !== undefined && entry.event?.id !== null ? String(entry.event.id) : null))
                .filter((eventId) => !!eventId);
            const hasAuthoritativeOverrides = allEventIds.length > 0 && allEventIds.every((eventId) => overrides.has(eventId));
            if (hasAuthoritativeOverrides) {
                for (const eventId of allEventIds) {
                    roundByEventId.set(eventId, Number(overrides.get(eventId)));
                }
                const reviewDetails = buildReviewDetails('The provided round assignments need review before the import can continue.', null);
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
                const prunedEventIds = [];
                for (const summary of roundSummary) {
                    if (summary.assignedMatches === 0 || summary.assignedMatches > SPARSE_ROUND_MATCH_THRESHOLD)
                        continue;
                    const bucket = summaryByRound.get(summary.round);
                    if (!bucket?.eventIds?.length)
                        continue;
                    const autoAssignedEventIds = bucket.eventIds.filter((eventId) => !overrides.has(eventId));
                    if (autoAssignedEventIds.length === 0)
                        continue;
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
                const remappedRounds = new Map();
                orderedRounds.forEach((roundNumber, index) => {
                    remappedRounds.set(roundNumber, index + 1);
                });
                if (orderedRounds.every((roundNumber, index) => roundNumber === index + 1))
                    return;
                for (const [eventId, roundNumber] of Array.from(roundByEventId.entries())) {
                    const compactedRound = remappedRounds.get(roundNumber);
                    if (compactedRound !== undefined) {
                        roundByEventId.set(eventId, compactedRound);
                    }
                }
            };
            let currentRound = 1;
            let previousDate = null;
            let matchesInCurrentRound = 0;
            let currentRoundTeamIds = new Set();
            let index = 0;
            while (index < sortableEvents.length) {
                const item = sortableEvents[index];
                const currentDate = item.date;
                const eventId = item.event?.id !== undefined && item.event?.id !== null ? String(item.event.id) : null;
                if (!item.homeId || !item.awayId) {
                    previousDate = currentDate;
                    index += 1;
                    continue;
                }
                if (eventId && reservedEventIds.has(eventId)) {
                    previousDate = currentDate;
                    index += 1;
                    continue;
                }
                if (eventId && overrides.has(eventId)) {
                    index += 1;
                    continue;
                }
                const roundReachedExpectedSize = maxMatchesPerRound !== null && matchesInCurrentRound >= maxMatchesPerRound;
                if (roundReachedExpectedSize) {
                    currentRound += 1;
                    matchesInCurrentRound = 0;
                    currentRoundTeamIds = new Set();
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
                        currentRoundTeamIds = new Set();
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
                        currentRoundTeamIds = new Set();
                        previousDate = null;
                        continue;
                    }
                }
                const compatibleOpenRounds = openIncompleteRounds.filter((entry) => entry.missingTeamIds.has(item.homeId) && entry.missingTeamIds.has(item.awayId));
                if (compatibleOpenRounds.length > 1) {
                    if (eventId)
                        reviewEventIds.add(eventId);
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
                        if (roundIndex >= 0)
                            openIncompleteRounds.splice(roundIndex, 1);
                    }
                    index += 1;
                    continue;
                }
                const teamAlreadyInRound = currentRoundTeamIds.has(item.homeId) || currentRoundTeamIds.has(item.awayId);
                if (teamAlreadyInRound && maxMatchesPerRound !== null) {
                    const missingTeamIds = allTeamIds.filter((teamId) => !currentRoundTeamIds.has(teamId));
                    const teamNamesById = new Map();
                    for (const entry of sortableEvents) {
                        if (entry.homeId && entry.homeName && !teamNamesById.has(entry.homeId))
                            teamNamesById.set(entry.homeId, entry.homeName);
                        if (entry.awayId && entry.awayName && !teamNamesById.has(entry.awayId))
                            teamNamesById.set(entry.awayId, entry.awayName);
                    }
                    if (missingTeamIds.length > 2) {
                        const STRAY_THRESHOLD_DAYS = 3;
                        let strayCandidateId = null;
                        let strayCandidateItem = null;
                        const currentRoundEntries = Array.from(roundByEventId.entries())
                            .filter(([, r]) => r === currentRound);
                        for (const [assignedEventId] of currentRoundEntries) {
                            const assignedItem = sortableEvents.find((se) => se.event?.id != null && String(se.event.id) === assignedEventId);
                            if (!assignedItem?.date)
                                continue;
                            const daysBefore = Math.floor((toLocalDay(currentDate) - toLocalDay(assignedItem.date)) / (24 * 60 * 60 * 1000));
                            if (daysBefore > STRAY_THRESHOLD_DAYS) {
                                strayCandidateId = assignedEventId;
                                strayCandidateItem = assignedItem;
                                break;
                            }
                        }
                        if (strayCandidateId && strayCandidateItem) {
                            roundByEventId.delete(strayCandidateId);
                            if (strayCandidateItem.homeId)
                                currentRoundTeamIds.delete(strayCandidateItem.homeId);
                            if (strayCandidateItem.awayId)
                                currentRoundTeamIds.delete(strayCandidateItem.awayId);
                            matchesInCurrentRound -= 1;
                            const overrideRound = overrides.get(strayCandidateId);
                            if (overrideRound !== undefined) {
                                roundByEventId.set(strayCandidateId, overrideRound);
                                continue;
                            }
                            if (strayCandidateId)
                                reviewEventIds.add(strayCandidateId);
                            continue;
                        }
                        if (eventId)
                            reviewEventIds.add(eventId);
                        previousDate = currentDate;
                        index += 1;
                        continue;
                    }
                    if (missingTeamIds.length === 2) {
                        const [missingHomeId, missingAwayId] = missingTeamIds;
                        const foundReplacement = sortableEvents.find((candidate, candidateIndex) => {
                            if (candidateIndex <= index)
                                return false;
                            const candidateEventId = candidate.event?.id !== undefined && candidate.event?.id !== null ? String(candidate.event.id) : null;
                            if (!candidateEventId || reservedEventIds.has(candidateEventId) || roundByEventId.has(candidateEventId))
                                return false;
                            return ((candidate.homeId === missingHomeId && candidate.awayId === missingAwayId) ||
                                (candidate.homeId === missingAwayId && candidate.awayId === missingHomeId));
                        });
                        if (!foundReplacement) {
                            console.log('000');
                            addOpenIncompleteRound(currentRound, currentRoundTeamIds);
                            currentRound += 1;
                            matchesInCurrentRound = 0;
                            currentRoundTeamIds = new Set();
                            previousDate = null;
                            continue;
                        }
                        const replacementEventId = String(foundReplacement.event.id);
                        roundByEventId.set(replacementEventId, currentRound);
                        reservedEventIds.add(replacementEventId);
                        matchesInCurrentRound += 1;
                        currentRoundTeamIds.add(missingHomeId);
                        currentRoundTeamIds.add(missingAwayId);
                        currentRound += 1;
                        matchesInCurrentRound = 0;
                        currentRoundTeamIds = new Set();
                        previousDate = null;
                        continue;
                    }
                }
                if (eventId)
                    roundByEventId.set(eventId, currentRound);
                matchesInCurrentRound += 1;
                currentRoundTeamIds.add(item.homeId);
                currentRoundTeamIds.add(item.awayId);
                previousDate = currentDate;
                index += 1;
            }
            let totalPrunedEventIds = [];
            for (let pass = 0; pass < 5; pass++) {
                const pruned = pruneSparseAutomaticRounds();
                if (pruned.length === 0)
                    break;
                totalPrunedEventIds = totalPrunedEventIds.concat(pruned);
                compactAssignedRounds();
            }
            const prunedSparseRoundEventIds = totalPrunedEventIds;
            for (const [eventId, overrideRound] of overrides.entries()) {
                roundByEventId.set(eventId, Number(overrideRound));
            }
            if (overrides.size > 0) {
                const occupiedRounds = new Set(roundByEventId.values());
                const maxRound = Math.max(...occupiedRounds);
                let hasGap = false;
                for (let r = 1; r <= maxRound; r++) {
                    if (!occupiedRounds.has(r)) {
                        hasGap = true;
                        break;
                    }
                }
                if (hasGap) {
                    compactAssignedRounds();
                }
            }
            const finalConflict = buildReviewConflict(prunedSparseRoundEventIds.length > 0
                ? 'Automatic round derivation ignored isolated clusters of 1 to 3 games because they likely belong to other rounds. Review those fixtures manually.'
                : 'Automatic round derivation completed as far as it could. Review only the remaining unresolved or ambiguous fixtures.', null, Array.from(reviewEventIds));
            return { roundByEventId, reservedEventIds, conflict: finalConflict };
        };
        const overridesMap = new Map(Object.entries(roundOverrides ?? {}));
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
        const rows = [];
        for (const event of events) {
            const competition = event?.competitions?.[0];
            if (!competition)
                continue;
            const competitors = competition?.competitors ?? [];
            const homeTeam = competitors.find((c) => c.homeAway === 'home');
            const awayTeam = competitors.find((c) => c.homeAway === 'away');
            if (!homeTeam || !awayTeam)
                continue;
            const venue = competition?.venue ?? {};
            const status = competition?.status?.type ?? {};
            const mapped = {
                'league.name': leagueInfo?.name ?? leagueInfo?.abbreviation ?? seasonInfo?.slug?.replace(/-/g, ' ') ?? 'Premier League',
                'league.season': seasonInfo?.year ?? new Date().getFullYear(),
                'league.country': venue?.address?.country ?? 'England',
                'league.flag': null,
                'league.image': leagueInfo?.logos?.[0]?.href ?? null,
                'league.round': derivedRounds.get(String(event?.id)) ?? null,
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
            };
            rows.push(mapped);
        }
        if (rows.length === 0) {
            return { found: false, reason: 'no_valid_events' };
        }
        const columns = Array.from(new Set(rows.flatMap(Object.keys)));
        return { found: true, columns, rows };
    }
    async applyTransitional(id, options = {}) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        const origQuery = client.query.bind(client);
        let lastSql = null;
        let lastParams = null;
        let insertCols = [];
        client.query = (async (sql, params) => {
            lastSql = typeof sql === 'string' ? sql : JSON.stringify(sql);
            lastParams = params ?? null;
            return origQuery(sql, params);
        });
        try {
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
            const parsed = await this.parseTransitional(id);
            if (!parsed || !parsed.found) {
                if (parsed?.reason === 'round_assignment_conflict' || parsed?.reason === 'needs_round_review') {
                    const details = parsed?.details ?? {};
                    const message = parsed?.error ?? 'Round assignment review required while deriving ESPN rounds';
                    const logRes = await client.query(`INSERT INTO api_import_log (transitional_id, message, details) VALUES ($1,$2,$3) RETURNING id`, [id, parsed?.reason ?? 'round_assignment_conflict', { message, ...details }]);
                    return { applied: 0, reason: parsed.reason, error: message, details, logId: logRes.rows[0]?.id ?? null };
                }
                return { applied: 0, reason: 'not_found' };
            }
            const rows = parsed.rows || [];
            if (!rows.length)
                return { applied: 0, reason: 'no_rows' };
            if (!options.targetTable) {
                return { applied: 0, preview: { columns: parsed.columns, rows } };
            }
            const target = options.targetTable;
            const colRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [target]);
            if (!colRes.rows.length)
                return { applied: 0, reason: 'target_not_found' };
            const targetCols = colRes.rows.map((r) => r.column_name);
            let mapping = options.mapping;
            if (mapping && Object.keys(mapping).length) {
                insertCols = Object.keys(mapping).filter((tc) => targetCols.includes(tc));
                if (!insertCols.length)
                    return { applied: 0, reason: 'no_matching_columns' };
            }
            else {
                insertCols = parsed.columns.filter((c) => targetCols.includes(c));
                if (!insertCols.length)
                    return { applied: 0, reason: 'no_matching_columns' };
            }
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
                }
                catch (e) {
                    const snapshotSql = lastSql;
                    const snapshotParams = lastParams;
                    try {
                        await client.query('ROLLBACK');
                    }
                    catch (_) { }
                    const includeDebug = process.env.DEBUG_ETL === 'true' || process.env.NODE_ENV !== 'production';
                    const details = { error: String(e), failedRow: r };
                    try {
                        if (snapshotParams && Array.isArray(snapshotParams)) {
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
                        if (!details.failing && (String(e).toLowerCase().includes('invalid input syntax for type integer') || String(e).includes('NaN'))) {
                            const offending = [];
                            for (const k of Object.keys(r || {})) {
                                const v = r[k];
                                if (v === 'NaN' || (typeof v === 'number' && Number.isNaN(v)) || (v !== null && v !== undefined && v !== '' && Number.isNaN(Number(v)))) {
                                    const guessedColumn = insertCols?.includes(k) ? k : k.replace(/\./g, '_');
                                    offending.push({ key: k, value: v, guessedColumn });
                                }
                            }
                            if (offending.length)
                                details.offendingFields = offending;
                        }
                    }
                    catch (_) { }
                    if (includeDebug) {
                        details.lastSql = snapshotSql;
                        details.lastParams = snapshotParams;
                        try {
                            if (snapshotParams && Array.isArray(snapshotParams) && insertCols && insertCols.length) {
                                details.paramColumnMap = Object.fromEntries(insertCols.map((col, idx) => [col, snapshotParams[idx]]));
                            }
                        }
                        catch (_) { }
                    }
                    await client.query(`INSERT INTO api_import_log (transitional_id, message, details) VALUES ($1,$2,$3) RETURNING id`, [id, 'apply_transitional_error', details]);
                    return { applied: 0, error: String(e), rolledBack: true, details: includeDebug ? details : undefined };
                }
            }
            await client.query(`INSERT INTO api_transitional_audit (transitional_id, action, payload) VALUES ($1,$2,$3)`, [
                id,
                options.dryRun ? 'dry_run' : 'applied',
                { target, applied, dryRun: !!options.dryRun },
            ]);
            if (options.dryRun) {
                await client.query('ROLLBACK');
            }
            else {
                await client.query('COMMIT');
            }
            if (!options.dryRun) {
                try {
                    await client.query(`UPDATE api_transitional SET status = true WHERE id = $1`, [id]);
                }
                catch (e) {
                    this.logger.error('Failed to update api_transitional status', e);
                }
            }
            return { applied, dryRun: !!options.dryRun };
        }
        catch (e) {
            const snapshotSql = lastSql;
            const snapshotParams = lastParams;
            try {
                await client.query('ROLLBACK');
            }
            catch (_) { }
            this.logger.error('applyTransitional error', e);
            const includeDebug = process.env.DEBUG_ETL === 'true' || process.env.NODE_ENV !== 'production';
            const details = { error: String(e) };
            if (includeDebug) {
                details.lastSql = snapshotSql;
                details.lastParams = snapshotParams;
                try {
                    if (snapshotParams && Array.isArray(snapshotParams) && insertCols && insertCols.length) {
                        details.paramColumnMap = Object.fromEntries(insertCols.map((col, idx) => [col, snapshotParams[idx]]));
                    }
                }
                catch (_) { }
            }
            return { applied: 0, error: String(e), details: includeDebug ? details : undefined };
        }
        finally {
            client.release();
            await pool.end();
        }
    }
    async getTableColumns(tableName) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        try {
            const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`, [tableName]);
            return res.rows.map((r) => r.column_name);
        }
        finally {
            await pool.end();
        }
    }
    async createMatchDivisions(client, sportId, matchId, matchRow, flgHasDivisions = false) {
        const sp = await client.query(`SELECT min_match_divisions_number AS min_divisions, max_match_divisions_number AS max_divisions, has_overtime, has_penalties, flg_espn_api_partial_scores FROM sports WHERE id = $1 LIMIT 1`, [sportId]);
        let maxDivisions = 2;
        let hasOvertime = false;
        let hasPenalties = false;
        let hasEspnPartialScores = false;
        if (sp.rows && sp.rows.length) {
            const r = sp.rows[0];
            if (r.max_divisions !== undefined && r.max_divisions !== null)
                maxDivisions = Number(r.max_divisions) || maxDivisions;
            hasOvertime = !!r.has_overtime;
            hasPenalties = !!r.has_penalties;
            hasEspnPartialScores = !!r.flg_espn_api_partial_scores;
        }
        const hfHomeRaw = matchRow['score.halftime.home'];
        const hfAwayRaw = matchRow['score.halftime.away'];
        const gHomeRaw = matchRow['goals.home'];
        const gAwayRaw = matchRow['goals.away'];
        const hfHome = hfHomeRaw != null ? Number(hfHomeRaw) : null;
        const hfAway = hfAwayRaw != null ? Number(hfAwayRaw) : null;
        const gHome = gHomeRaw != null ? Number(gHomeRaw) : null;
        const gAway = gAwayRaw != null ? Number(gAwayRaw) : null;
        for (let div = 1; div <= maxDivisions; div++) {
            let homeScore = null;
            let awayScore = null;
            let divisionType = 'REGULAR';
            if (div === 1) {
                homeScore = hfHome != null ? hfHome : (gHome != null ? gHome : 0);
                awayScore = hfAway != null ? hfAway : (gAway != null ? gAway : 0);
            }
            else if (div === 2) {
                if (gHome != null && hfHome != null)
                    homeScore = gHome - hfHome;
                else if (gHome != null)
                    homeScore = gHome;
                else
                    homeScore = 0;
                if (gAway != null && hfAway != null)
                    awayScore = gAway - hfAway;
                else if (gAway != null)
                    awayScore = gAway;
                else
                    awayScore = 0;
            }
            else {
                homeScore = 0;
                awayScore = 0;
            }
            if (flgHasDivisions) {
                homeScore = homeScore == null || !Number.isFinite(Number(homeScore)) ? 0 : Math.max(0, Math.trunc(Number(homeScore)));
                awayScore = awayScore == null || !Number.isFinite(Number(awayScore)) ? 0 : Math.max(0, Math.trunc(Number(awayScore)));
            }
            else if (!hasEspnPartialScores) {
                homeScore = 0;
                awayScore = 0;
            }
            else {
                homeScore = homeScore == null || !Number.isFinite(Number(homeScore)) ? 0 : Math.max(0, Math.trunc(Number(homeScore)));
                awayScore = awayScore == null || !Number.isFinite(Number(awayScore)) ? 0 : Math.max(0, Math.trunc(Number(awayScore)));
            }
            await client.query(`INSERT INTO match_divisions (match_id, division_number, division_type, home_score, away_score) VALUES ($1,$2,$3,$4,$5)`, [matchId, div, divisionType, homeScore, awayScore]);
        }
        return { created: maxDivisions };
    }
    async fetchEspnEventLinescores(sportName, leagueCode, eventId) {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sportName}/${leagueCode}/summary?event=${eventId}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                this.logger.warn(`ESPN event fetch failed (${resp.status}) for event ${eventId}`);
                return null;
            }
            const json = await resp.json();
            const competitors = json?.header?.competitions?.[0]?.competitors ?? [];
            let homeScores = [];
            let awayScores = [];
            for (const comp of competitors) {
                const homeAway = comp?.homeAway ?? '';
                const linescouresRaw = comp?.linescores;
                const linescores = Array.isArray(linescouresRaw) ? linescouresRaw : [];
                const scores = linescores.map((ls) => {
                    const raw = ls?.displayValue ?? ls?.value;
                    return Number(raw) || 0;
                });
                if (homeAway === 'home')
                    homeScores = scores;
                else if (homeAway === 'away')
                    awayScores = scores;
            }
            if (!homeScores.length && !awayScores.length)
                return null;
            return { homeScores, awayScores };
        }
        catch (e) {
            this.logger.warn(`ESPN event linescores error for event ${eventId}: ${String(e)}`);
            return null;
        }
    }
    async enrichMatchDivisionsFromEspn(sportName, leagueCode, matchesForEnrichment, rateMs = 200) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        let enriched = 0;
        let skipped = 0;
        let errors = 0;
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        try {
            for (const m of matchesForEnrichment) {
                try {
                    const existing = await pool.query(`SELECT COALESCE(SUM(home_score + away_score), 0)::int AS total FROM match_divisions WHERE match_id = $1`, [m.matchId]);
                    if (Number(existing.rows[0]?.total ?? 0) > 0) {
                        skipped++;
                        continue;
                    }
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
                        await pool.query(`UPDATE match_divisions SET home_score = $1, away_score = $2 WHERE match_id = $3 AND division_number = $4`, [homeScore, awayScore, m.matchId, div]);
                    }
                    enriched++;
                }
                catch (e) {
                    this.logger.warn(`ESPN enrichment error for match ${m.matchId}: ${String(e)}`);
                    errors++;
                }
                await sleep(rateMs);
            }
            this.logger.log(`ESPN enrichment complete: enriched=${enriched}, skipped=${skipped}, errors=${errors}`);
        }
        finally {
            await pool.end();
        }
        return { enriched, skipped, errors };
    }
    async applyFirstRowToApp(id, options = {}) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS api_import_log (
                id SERIAL PRIMARY KEY,
                transitional_id INTEGER,
                message TEXT,
                details JSONB,
                created_at TIMESTAMPTZ DEFAULT now()
                );
            `);
            const parsed = await this.parseTransitional(id, options.roundOverrides);
            if (!parsed || !parsed.found) {
                return {
                    applied: false,
                    reason: parsed?.reason ?? 'not_found',
                    error: parsed?.error ?? null,
                    details: parsed?.details ?? null,
                };
            }
            let transitionalDbRow = {};
            try {
                const tRes = await client.query(`SELECT season_status, flg_season_default, flg_season_same_years, league_schedule_type, flg_league_default, flg_has_divisions, flg_run_in_background FROM api_transitional WHERE id = $1 LIMIT 1`, [id]);
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
                transitionalDbRow.sameYears = transitionalDbRow.sameYears ?? transitionalDbRow.flg_season_same_years;
            }
            catch (e) {
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
            if (!rows.length)
                return { applied: false, reason: 'no_rows' };
            const first = rows[0];
            const requiredFirst = ['league.name', 'league.season', 'league.country'];
            const missing = [];
            for (const k of requiredFirst) {
                const v = first[k] ?? first[k.replace('league.', '')];
                if (v === null || v === undefined || String(v).trim() === '')
                    missing.push(k);
            }
            if (missing.length) {
                const logRes = await client.query(`INSERT INTO api_import_log (transitional_id, message, details) VALUES ($1,$2,$3) RETURNING id`, [id, 'format_invalid_first_row', { missing, parsedColumns: parsed.columns }]);
                return { applied: false, reason: 'format_invalid', missing, logId: logRes.rows[0].id };
            }
            const getVal = (key) => {
                return first[key] ?? null;
            };
            const leagueName = String(getVal('league.name') ?? getVal('league') ?? '').trim();
            const leagueSeason = getVal('league.season') ?? getVal('season') ?? null;
            const leagueCountry = String(getVal('league.country') ?? getVal('country') ?? '').trim();
            const leagueFlag = getVal('league.flag') ?? null;
            const leagueImage = getVal('league.image') ?? null;
            await client.query('BEGIN');
            let countryId = null;
            if (leagueCountry) {
                const nameClean = String(leagueCountry).trim();
                let cRes = await client.query(`SELECT id FROM countries WHERE lower(name) = lower($1) OR lower(code) = lower($1) LIMIT 1`, [nameClean]);
                if (!cRes.rows.length) {
                    cRes = await client.query(`SELECT id FROM countries WHERE name ILIKE $1 LIMIT 1`, [`%${nameClean}%`]);
                }
                if (!cRes.rows.length) {
                    const aliases = {
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
                }
                else {
                    const code = nameClean.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || null;
                    const ins = await client.query(`INSERT INTO countries (name, code, flag, continent) VALUES ($1,$2,$3,$4) RETURNING id`, [nameClean, code, leagueFlag || null, 'Europe']);
                    countryId = ins.rows[0].id;
                }
            }
            let leagueId = null;
            if (leagueName) {
                const sportId = options.sportId ?? 36;
                let espnLeagueId = null;
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
                                if (leagueImage) {
                                    try {
                                        await client.query(`UPDATE leagues SET image_url = COALESCE(image_url, $1) WHERE id = $2`, [leagueImage, leagueId]);
                                    }
                                    catch (e) {
                                        this.logger.debug(`Failed to update league image for league id=${leagueId}: ${String(e)}`);
                                    }
                                }
                            }
                        }
                    }
                }
                catch (e) {
                    this.logger.debug(`Failed espn_id lookup for transitional id=${id}: ${String(e)}`);
                }
                if (!leagueId) {
                    const q = `SELECT id FROM leagues WHERE (original_name = $1 OR secondary_name = $1)` + (countryId ? ' AND country_id = $2' : '') + (sportId ? ' AND sport_id = $3' : '') + ' LIMIT 1';
                    const params = [leagueName];
                    if (countryId)
                        params.push(countryId);
                    if (sportId)
                        params.push(sportId);
                    const lRes = await client.query(q, params);
                    if (lRes.rows.length) {
                        leagueId = lRes.rows[0].id;
                        if (leagueImage) {
                            try {
                                await client.query(`UPDATE leagues SET image_url = COALESCE(image_url, $1) WHERE id = $2`, [leagueImage, leagueId]);
                            }
                            catch (e) {
                                this.logger.debug(`Failed to update league image for league id=${leagueId}: ${String(e)}`);
                            }
                        }
                    }
                    else {
                        try {
                            const incomingNorm = normalizeLookupKey(leagueName);
                            const candParams = [];
                            let candQ = `SELECT id, original_name, secondary_name FROM leagues`;
                            const whereParts = [];
                            if (countryId) {
                                whereParts.push(`country_id = $${candParams.length + 1}`);
                                candParams.push(countryId);
                            }
                            if (sportId) {
                                whereParts.push(`sport_id = $${candParams.length + 1}`);
                                candParams.push(sportId);
                            }
                            if (whereParts.length)
                                candQ += ' WHERE ' + whereParts.join(' AND ');
                            candQ += ' LIMIT 200';
                            const candRes = await client.query(candQ, candParams);
                            for (const c of candRes.rows) {
                                const on = normalizeLookupKey(c.original_name ?? '');
                                const sn = normalizeLookupKey(c.secondary_name ?? '');
                                if (on === incomingNorm || sn === incomingNorm ||
                                    on.includes(incomingNorm) || incomingNorm.includes(on) ||
                                    sn.includes(incomingNorm) || incomingNorm.includes(sn)) {
                                    leagueId = c.id;
                                    break;
                                }
                            }
                            if (leagueId && leagueImage) {
                                try {
                                    await client.query(`UPDATE leagues SET image_url = COALESCE(image_url, $1) WHERE id = $2`, [leagueImage, leagueId]);
                                }
                                catch (e) {
                                    this.logger.debug(`Failed to update league image for league id=${leagueId}: ${String(e)}`);
                                }
                            }
                        }
                        catch (e) {
                            this.logger.debug(`Normalized league fallback failed: ${String(e)}`);
                        }
                        if (!leagueId) {
                            const ins = await client.query(`INSERT INTO leagues (sport_id, country_id, espn_id, image_url, original_name, secondary_name, city_id, number_of_rounds_matches, min_divisions_number, max_divisions_number, division_time, has_ascends, ascends_quantity, has_descends, descends_quantity, number_of_sub_leagues, flg_default, flg_round_automatic, type_of_schedule) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`, [
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
                            ]);
                            leagueId = ins.rows[0].id;
                        }
                    }
                }
            }
            let seasonId = null;
            if (leagueSeason && leagueId) {
                const sportId = options.sportId ?? 36;
                const sRes = await client.query(`SELECT id FROM seasons WHERE sport_id = $1 AND league_id = $2 AND start_year = $3 LIMIT 1`, [sportId, leagueId, leagueSeason]);
                if (sRes.rows.length) {
                    seasonId = sRes.rows[0].id;
                }
                else {
                    const startYearNum = Number(leagueSeason);
                    const startYear = Number.isFinite(startYearNum) ? Math.trunc(startYearNum) : leagueSeason;
                    const endYear = transitionalDbRow.sameYears ? startYear : Number.isFinite(startYearNum) ? startYearNum + 1 : startYear;
                    const ins = await client.query(`INSERT INTO seasons (sport_id, league_id, status, flg_default, number_of_groups, start_year, end_year) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [sportId, leagueId, transitionalDbRow.season_status, transitionalDbRow.flg_season_default, 0, startYear, endYear]);
                    seasonId = ins.rows[0].id;
                }
            }
            await client.query('COMMIT');
            return { applied: true, countryId, leagueId, seasonId };
        }
        catch (e) {
            try {
                await client.query('ROLLBACK');
            }
            catch (_) { }
            this.logger.error('applyFirstRowToApp error', e);
            return { applied: false, error: String(e) };
        }
        finally {
            client.release();
            await pool.end();
        }
    }
    extractLeagueMetadata(row) {
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
        const get = (obj, path) => path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
        let arr = null;
        if (Array.isArray(payload))
            arr = payload;
        else if (payload?.response && Array.isArray(payload.response))
            arr = payload.response;
        else if (payload?.data && Array.isArray(payload.data))
            arr = payload.data;
        const sample = arr?.[0] ?? payload;
        return {
            leagueName: get(sample, 'league.name') ?? null,
            leagueSeason: get(sample, 'league.season') ?? null,
            leagueCountry: get(sample, 'league.country') ?? null,
        };
    }
    parseTransitionalEspnLightweight(row) {
        const payload = row.payload ?? row;
        const events = payload?.events ?? [];
        if (!Array.isArray(events) || events.length === 0) {
            return { found: false, reason: 'no_events_array' };
        }
        const firstEvent = events[0];
        const seasonInfo = firstEvent?.season ?? {};
        const leagueInfo = payload?.leagues?.[0] ?? {};
        const rows = [];
        for (const event of events) {
            const competition = event?.competitions?.[0];
            if (!competition)
                continue;
            const competitors = competition?.competitors ?? [];
            const homeTeam = competitors.find((c) => c.homeAway === 'home');
            const awayTeam = competitors.find((c) => c.homeAway === 'away');
            if (!homeTeam || !awayTeam)
                continue;
            const venue = competition?.venue ?? {};
            const status = competition?.status?.type ?? {};
            rows.push({
                'league.name': leagueInfo?.name ?? leagueInfo?.abbreviation ?? seasonInfo?.slug?.replace(/-/g, ' ') ?? 'Unknown',
                'league.season': seasonInfo?.year ?? new Date().getFullYear(),
                'league.country': venue?.address?.country ?? 'England',
                'league.flag': null,
                'league.image': leagueInfo?.logos?.[0]?.href ?? null,
                'league.round': null,
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
        if (rows.length === 0)
            return { found: false, reason: 'no_valid_events' };
        const columns = Array.from(new Set(rows.flatMap(Object.keys)));
        return { found: true, columns, rows };
    }
    async applyAllRowsToApp(id, options = {}) {
        if (!process.env.DATABASE_URL)
            throw new Error('Missing DATABASE_URL environment variable');
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        const origQueryAll = client.query.bind(client);
        let lastSqlAll = null;
        let lastParamsAll = null;
        client.query = (async (sql, params) => {
            lastSqlAll = typeof sql === 'string' ? sql : JSON.stringify(sql);
            lastParamsAll = params ?? null;
            return origQueryAll(sql, params);
        });
        try {
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
            const transitionalRow = await this.getTransitional(id);
            if (!transitionalRow)
                return { applied: 0, reason: 'not_found' };
            const flgHasDivisions = transitionalRow.flg_has_divisions !== false;
            const flgRunInBackground = transitionalRow.flg_run_in_background !== false;
            const transitionalLeagueCode = transitionalRow.league ?? null;
            const transitionalOrigin = transitionalRow.origin ?? 'Api-Football';
            const matchesForEnrichment = [];
            const sportId = options.sportId ?? 36;
            let leagueId = options.leagueId ?? null;
            let seasonId = options.seasonId ?? null;
            let isSubsequentLoad = false;
            const meta = this.extractLeagueMetadata(transitionalRow);
            const espnLeagueCode = transitionalRow.league ?? null;
            if (meta.leagueName || espnLeagueCode) {
                const seasonYears = [];
                if (meta.leagueSeason != null && Number.isFinite(Number(meta.leagueSeason))) {
                    seasonYears.push(Number(meta.leagueSeason));
                }
                const rawSeasonStr = String(transitionalRow.season ?? '');
                for (const m of (rawSeasonStr.match(/\d{4}/g) ?? [])) {
                    const y = Number(m);
                    if (Number.isFinite(y) && !seasonYears.includes(y))
                        seasonYears.push(y);
                }
                const lRes = await client.query(`SELECT id FROM leagues WHERE (LOWER(original_name) = LOWER($1) OR LOWER(secondary_name) = LOWER($1) OR ($3::text IS NOT NULL AND espn_id = $3)) AND sport_id = $2 LIMIT 1`, [String(meta.leagueName ?? '').trim(), sportId, espnLeagueCode]);
                if (lRes.rows.length) {
                    const possibleLeagueId = lRes.rows[0].id;
                    let seasonRow = null;
                    for (const year of seasonYears) {
                        const sRes = await client.query(`SELECT id FROM seasons WHERE sport_id = $1 AND league_id = $2 AND (start_year = $3 OR end_year = $3) ORDER BY start_year DESC LIMIT 1`, [sportId, possibleLeagueId, year]);
                        if (sRes.rows.length) {
                            seasonRow = sRes.rows[0];
                            break;
                        }
                    }
                    if (seasonRow) {
                        const roundsRes = await client.query(`SELECT COUNT(*)::int as cnt FROM rounds WHERE league_id = $1 AND season_id = $2`, [possibleLeagueId, seasonRow.id]);
                        if (Number(roundsRes.rows[0]?.cnt ?? 0) > 0) {
                            isSubsequentLoad = true;
                            leagueId = possibleLeagueId;
                            seasonId = seasonRow.id;
                        }
                    }
                }
            }
            let rows;
            if (isSubsequentLoad) {
                const origin = transitionalRow.origin ?? 'Api-Football';
                let parsed;
                if (origin === 'Api-Espn') {
                    parsed = this.parseTransitionalEspnLightweight(transitionalRow);
                }
                else {
                    parsed = await this.parseTransitional(id);
                }
                if (!parsed || !parsed.found) {
                    return { applied: 0, reason: parsed?.reason ?? 'lightweight_parse_failed' };
                }
                rows = parsed.rows || [];
            }
            else {
                const parsed = await this.parseTransitional(id, options.roundOverrides);
                if (!parsed || !parsed.found) {
                    return {
                        applied: 0,
                        reason: parsed?.reason ?? 'not_found',
                        error: parsed?.error ?? null,
                        details: parsed?.details ?? null,
                    };
                }
                rows = parsed.rows || [];
                if (!leagueId || !seasonId) {
                    const firstRowResult = await this.applyFirstRowToApp(id, { sportId, roundOverrides: options.roundOverrides });
                    if (!firstRowResult.applied)
                        return { applied: 0, reason: 'first_row_failed', details: firstRowResult };
                    leagueId = firstRowResult.leagueId;
                    seasonId = firstRowResult.seasonId;
                }
            }
            if (!rows.length)
                return { applied: 0, reason: 'no_rows' };
            const clubCache = {};
            const roundCache = {};
            const cityCache = {};
            const stadiumCache = {};
            const sportClubCache = new Set();
            const seasonClubCache = new Set();
            const clubStadiumCache = new Set();
            const standingsCalculator = new standings_calculator_service_1.StandingsCalculatorService();
            const leagueMetaRes = await client.query(`SELECT country_id FROM leagues WHERE id = $1 LIMIT 1`, [leagueId]);
            const leagueCountryId = leagueMetaRes.rows[0]?.country_id ?? (await client.query(`SELECT id FROM countries LIMIT 1`)).rows[0]?.id ?? null;
            const ensureSportClub = async (clubId, clubNameRaw) => {
                if (!clubId)
                    return;
                const clubName = normalizeText(clubNameRaw);
                const cacheKey = `${sportId}:${clubId}`;
                if (sportClubCache.has(cacheKey))
                    return;
                const existing = await client.query(`SELECT id FROM sport_clubs WHERE sport_id = $1 AND club_id = $2 LIMIT 1`, [sportId, clubId]);
                if (!existing.rows.length) {
                    await client.query(`INSERT INTO sport_clubs (sport_id, club_id, name, flg_active) VALUES ($1, $2, $3, $4)`, [sportId, clubId, clubName || null, true]);
                }
                sportClubCache.add(cacheKey);
            };
            const ensureSeasonClub = async (clubId) => {
                if (!clubId)
                    return;
                const cacheKey = `${sportId}:${leagueId}:${seasonId}:${clubId}`;
                if (seasonClubCache.has(cacheKey))
                    return;
                const existing = await client.query(`SELECT id FROM season_clubs WHERE sport_id = $1 AND league_id = $2 AND season_id = $3 AND club_id = $4 AND group_id IS NULL LIMIT 1`, [sportId, leagueId, seasonId, clubId]);
                if (!existing.rows.length) {
                    await client.query(`INSERT INTO season_clubs (sport_id, league_id, season_id, club_id, group_id) VALUES ($1, $2, $3, $4, $5)`, [sportId, leagueId, seasonId, clubId, null]);
                }
                seasonClubCache.add(cacheKey);
            };
            const ensureCity = async (cityNameRaw) => {
                const cityName = normalizeText(cityNameRaw).replace(/[;]+$/g, '');
                if (!cityName || !leagueCountryId)
                    return null;
                const baseCityName = cityName.split(',')[0]?.trim() || cityName;
                const cityVariants = Array.from(new Set([cityName, baseCityName].filter(Boolean)));
                for (const variant of cityVariants) {
                    const cacheKey = `${leagueCountryId}:${variant.toLowerCase()}`;
                    if (cityCache[cacheKey])
                        return cityCache[cacheKey];
                }
                for (const variant of cityVariants) {
                    const exact = await client.query(`SELECT id FROM cities WHERE country_id = $1 AND lower(name) = lower($2) LIMIT 1`, [leagueCountryId, variant]);
                    if (exact.rows.length) {
                        for (const cacheVariant of cityVariants) {
                            cityCache[`${leagueCountryId}:${cacheVariant.toLowerCase()}`] = exact.rows[0].id;
                        }
                        return exact.rows[0].id;
                    }
                }
                const flexible = await client.query(`SELECT id, name
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
            LIMIT 1`, [leagueCountryId, cityName, baseCityName, baseCityName, cityName]);
                if (flexible.rows.length) {
                    for (const cacheVariant of cityVariants) {
                        cityCache[`${leagueCountryId}:${cacheVariant.toLowerCase()}`] = flexible.rows[0].id;
                    }
                    return flexible.rows[0].id;
                }
                const inserted = await client.query(`INSERT INTO cities (name, country_id) VALUES ($1, $2) RETURNING id`, [baseCityName, leagueCountryId]);
                for (const cacheVariant of cityVariants) {
                    cityCache[`${leagueCountryId}:${cacheVariant.toLowerCase()}`] = inserted.rows[0].id;
                }
                return inserted.rows[0].id;
            };
            const ensureStadium = async (venueNameRaw, cityId) => {
                const venueName = normalizeText(venueNameRaw);
                if (!venueName || !cityId)
                    return null;
                const normalizedVenueName = normalizeLookupKey(venueName);
                const cacheKey = `${sportId}:${cityId}:${normalizedVenueName}`;
                if (stadiumCache[cacheKey])
                    return stadiumCache[cacheKey];
                const existing = await client.query(`SELECT id FROM stadiums WHERE sport_id = $1 AND city_id = $2 AND lower(name) = lower($3) LIMIT 1`, [sportId, cityId, venueName]);
                if (existing.rows.length) {
                    stadiumCache[cacheKey] = existing.rows[0].id;
                    return existing.rows[0].id;
                }
                const normalizedExisting = await client.query(`SELECT id
             FROM stadiums
            WHERE sport_id = $1
              AND city_id = $2
              AND regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') = $3
            LIMIT 1`, [sportId, cityId, normalizedVenueName]);
                if (normalizedExisting.rows.length) {
                    stadiumCache[cacheKey] = normalizedExisting.rows[0].id;
                    return normalizedExisting.rows[0].id;
                }
                const flexible = await client.query(`SELECT id
             FROM stadiums
            WHERE sport_id = $1
              AND city_id = $2
              AND (
                $3 LIKE '%' || regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') || '%'
                OR regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') LIKE '%' || $3 || '%'
              )
            ORDER BY length(name) ASC
            LIMIT 1`, [sportId, cityId, normalizedVenueName]);
                if (flexible.rows.length) {
                    stadiumCache[cacheKey] = flexible.rows[0].id;
                    return flexible.rows[0].id;
                }
                const inserted = await client.query(`INSERT INTO stadiums (sport_id, name, city_id, capacity, image_url, year_constructed, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [sportId, venueName, cityId, null, null, null, 'stadium']);
                stadiumCache[cacheKey] = inserted.rows[0].id;
                return inserted.rows[0].id;
            };
            const ensureClubStadium = async (clubId, stadiumId) => {
                if (!clubId || !stadiumId)
                    return;
                const cacheKey = `${clubId}:${stadiumId}`;
                if (clubStadiumCache.has(cacheKey))
                    return;
                const existing = await client.query(`SELECT id FROM club_stadiums WHERE club_id = $1 AND stadium_id = $2 LIMIT 1`, [clubId, stadiumId]);
                if (!existing.rows.length) {
                    await client.query(`INSERT INTO club_stadiums (club_id, stadium_id, start_date, end_date) VALUES ($1, $2, $3, $4)`, [clubId, stadiumId, new Date('1902-07-21T00:00:00.000Z'), null]);
                }
                clubStadiumCache.add(cacheKey);
            };
            await client.query('BEGIN');
            let applied = 0;
            let createdClubs = 0;
            const clubsIncluded = [];
            let createdRounds = 0;
            let createdDivisions = 0;
            let createdStandings = 0;
            const sortedRows = [...rows].sort((a, b) => {
                const ra = a['league.round'] != null ? Number(a['league.round']) : Infinity;
                const rb = b['league.round'] != null ? Number(b['league.round']) : Infinity;
                if (ra !== rb)
                    return ra - rb;
                return 0;
            });
            const matchColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, ['matches']);
            const matchCols = matchColsRes.rows.map((c) => c.column_name);
            const hasOriginApiIdCol = matchCols.includes('origin_api_id');
            let skippedUnchanged = 0;
            let updatedMatches = 0;
            for (const r of sortedRows) {
                try {
                    const roundNumber = r['league.round'] ?? r['round'] ?? null;
                    let roundId = null;
                    let roundNumberInt = null;
                    if (roundNumber !== null && roundNumber !== undefined) {
                        roundNumberInt = null;
                        if (typeof roundNumber === 'string') {
                            const m = String(roundNumber).match(/(\d{1,3})\b/);
                            roundNumberInt = m ? Number(m[1]) : null;
                        }
                        else {
                            const parsed = Number(roundNumber);
                            roundNumberInt = Number.isFinite(parsed) ? Math.trunc(parsed) : null;
                        }
                        if (roundNumberInt !== null) {
                            if (roundCache[roundNumberInt]) {
                                roundId = roundCache[roundNumberInt];
                            }
                            else {
                                const rr = await client.query(`SELECT id FROM rounds WHERE league_id = $1 AND season_id = $2 AND round_number = $3 LIMIT 1`, [leagueId, seasonId, roundNumberInt]);
                                if (rr.rows.length) {
                                    roundId = rr.rows[0].id;
                                    roundCache[roundNumberInt] = roundId;
                                }
                                else {
                                    const ins = await client.query(`INSERT INTO rounds (league_id, season_id, round_number) VALUES ($1,$2,$3) RETURNING id`, [leagueId, seasonId, roundNumberInt]);
                                    roundId = ins.rows[0].id;
                                    roundCache[roundNumberInt] = roundId;
                                    createdRounds += 1;
                                }
                            }
                        }
                    }
                    const findOrCreateClub = async (clubNameRaw, clubLogo) => {
                        if (!clubNameRaw)
                            return null;
                        const clubName = String(clubNameRaw).trim();
                        if (!clubName)
                            return null;
                        if (clubCache[clubName])
                            return clubCache[clubName];
                        let cres = { rows: [] };
                        try {
                            cres = await client.query(`SELECT id FROM clubs WHERE (lower(short_name)=lower($1) OR lower(name)=lower($1)) AND country_id = $2 LIMIT 1`, [clubName, leagueCountryId]);
                        }
                        catch (e) {
                            this.logger.debug(`Club lookup exact query failed: ${String(e)}`);
                            cres = { rows: [] };
                        }
                        if (!cres.rows.length) {
                            try {
                                cres = await client.query(`SELECT id FROM clubs WHERE (name ILIKE $1 OR short_name ILIKE $1) AND country_id = $2 LIMIT 1`, [`%${clubName}%`, leagueCountryId]);
                            }
                            catch (e) {
                                this.logger.debug(`Club lookup ILIKE query failed: ${String(e)}`);
                                cres = { rows: [] };
                            }
                        }
                        if (!cres.rows.length) {
                            try {
                                const normalizedIncoming = normalizeLookupKey(clubName);
                                const cands = await client.query(`SELECT id, name, short_name FROM clubs WHERE country_id = $1`, [leagueCountryId]);
                                for (const c of cands.rows) {
                                    const nName = normalizeLookupKey(c.name ?? '');
                                    const nShort = normalizeLookupKey(c.short_name ?? '');
                                    if (nName === normalizedIncoming || nShort === normalizedIncoming) {
                                        cres = { rows: [{ id: c.id }] };
                                        break;
                                    }
                                }
                            }
                            catch (e) {
                                this.logger.debug(`Normalization club lookup failed: ${String(e)}`);
                            }
                        }
                        if (cres.rows.length) {
                            clubCache[clubName] = cres.rows[0].id;
                            return cres.rows[0].id;
                        }
                        const countryId = leagueCountryId;
                        const ins = await client.query(`INSERT INTO clubs (name, short_name, image_url, foundation_year, country_id, city_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [clubName, clubName, clubLogo || null, 2000, countryId, null]);
                        const cid = ins.rows[0].id;
                        clubCache[clubName] = cid;
                        createdClubs += 1;
                        if (!clubsIncluded.includes(clubName))
                            clubsIncluded.push(clubName);
                        return cid;
                    };
                    const homeName = r['teams.home.name'] ?? r['home_team'] ?? null;
                    const awayName = r['teams.away.name'] ?? r['away_team'] ?? null;
                    const homeLogo = r['teams.home.logo'] ?? null;
                    const awayLogo = r['teams.away.logo'] ?? null;
                    const venueCity = r['fixture.venue.city'] ?? null;
                    const venueName = r['fixture.venue.name'] ?? null;
                    const homeClubId = await findOrCreateClub(homeName, homeLogo);
                    const awayClubId = await findOrCreateClub(awayName, awayLogo);
                    await ensureSportClub(homeClubId, homeName);
                    await ensureSportClub(awayClubId, awayName);
                    await ensureSeasonClub(homeClubId);
                    await ensureSeasonClub(awayClubId);
                    const cityId = await ensureCity(venueCity);
                    const stadiumId = await ensureStadium(venueName, cityId);
                    await ensureClubStadium(homeClubId, stadiumId);
                    const dateRaw = r['fixture.date'] ?? r['date'] ?? null;
                    const dateVal = dateRaw ? new Date(String(dateRaw)) : null;
                    const statusShort = r['fixture.status.short'] ?? null;
                    const status = statusShort === 'FT' ? 'Finished' : 'Scheduled';
                    const homeScore = status === 'Finished' && r['goals.home'] !== undefined ? Number(r['goals.home']) : null;
                    const awayScore = status === 'Finished' && r['goals.away'] !== undefined ? Number(r['goals.away']) : null;
                    const originApiIdRaw = r['origin_api_id'] ?? r['espn_event_id'] ?? r['fixture.id'] ?? null;
                    const originApiId = originApiIdRaw != null && String(originApiIdRaw).trim() !== ''
                        ? String(originApiIdRaw).trim()
                        : null;
                    let matchId;
                    let isExistingMatch = false;
                    if (hasOriginApiIdCol && originApiId) {
                        const existingRes = await client.query(`SELECT id, status, home_score, away_score, round_id FROM matches WHERE origin_api_id = $1 AND league_id = $2 AND season_id = $3 LIMIT 1`, [originApiId, leagueId, seasonId]);
                        if (existingRes.rows.length > 0) {
                            const existing = existingRes.rows[0];
                            if (roundId == null && existing.round_id != null) {
                                roundId = existing.round_id;
                            }
                            if (existing.status === 'Finished') {
                                skippedUnchanged += 1;
                                applied += 1;
                                continue;
                            }
                            if (status === 'Finished' && homeScore != null && awayScore != null) {
                                await client.query(`UPDATE matches SET status = $1, home_score = $2, away_score = $3, round_id = COALESCE($4, round_id), date = COALESCE($5, date), updated_at = now() WHERE id = $6`, [status, homeScore, awayScore, roundId, dateVal, existing.id]);
                                matchId = existing.id;
                                isExistingMatch = true;
                                updatedMatches += 1;
                                await client.query(`DELETE FROM match_divisions WHERE match_id = $1`, [matchId]);
                                try {
                                    const divRes = await this.createMatchDivisions(client, sportId, matchId, r, flgHasDivisions);
                                    if (divRes && divRes.created)
                                        createdDivisions += Number(divRes.created) || 0;
                                    if (!flgHasDivisions && transitionalOrigin === 'Api-Espn' && originApiId && status === 'Finished') {
                                        await client.query(`UPDATE match_divisions SET home_score = 0, away_score = 0 WHERE match_id = $1`, [matchId]);
                                        matchesForEnrichment.push({ matchId, originApiId });
                                    }
                                }
                                catch (e) {
                                    throw e;
                                }
                            }
                            else {
                                skippedUnchanged += 1;
                                applied += 1;
                                continue;
                            }
                        }
                    }
                    if (!isExistingMatch) {
                        let matchRes;
                        if (hasOriginApiIdCol) {
                            matchRes = await client.query(`INSERT INTO matches (sport_id, league_id, season_id, round_id, group_id, home_club_id, away_club_id, stadium_id, date, status, home_score, away_score, origin_api_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`, [sportId, leagueId, seasonId, roundId, null, homeClubId, awayClubId, stadiumId, dateVal, status, homeScore, awayScore, originApiId]);
                        }
                        else {
                            matchRes = await client.query(`INSERT INTO matches (sport_id, league_id, season_id, round_id, group_id, home_club_id, away_club_id, stadium_id, date, status, home_score, away_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`, [sportId, leagueId, seasonId, roundId, null, homeClubId, awayClubId, stadiumId, dateVal, status, homeScore, awayScore]);
                        }
                        matchId = matchRes.rows[0].id;
                        try {
                            const divRes = await this.createMatchDivisions(client, sportId, matchId, r, flgHasDivisions);
                            if (divRes && divRes.created)
                                createdDivisions += Number(divRes.created) || 0;
                            if (!flgHasDivisions && transitionalOrigin === 'Api-Espn' && originApiId && status === 'Finished') {
                                await client.query(`UPDATE match_divisions SET home_score = 0, away_score = 0 WHERE match_id = $1`, [matchId]);
                                matchesForEnrichment.push({ matchId, originApiId });
                            }
                        }
                        catch (e) {
                            throw e;
                        }
                    }
                    try {
                        if (status !== 'Finished') {
                            applied += 1;
                            continue;
                        }
                        const existingStandingsRes = await client.query(`SELECT COUNT(*)::int as cnt FROM standings WHERE match_id = $1`, [matchId]);
                        if (Number(existingStandingsRes.rows[0]?.cnt ?? 0) > 0) {
                            applied += 1;
                            continue;
                        }
                        const latestHomeRes = roundId
                            ? await client.query(`SELECT s.* FROM standings s
                     JOIN rounds r ON r.id = s.round_id
                    WHERE s.club_id = $1 AND s.league_id = $2 AND s.season_id = $3
                      AND r.round_number < (SELECT round_number FROM rounds WHERE id = $4)
                    ORDER BY r.round_number DESC LIMIT 1`, [homeClubId, leagueId, seasonId, roundId])
                            : await client.query(`SELECT * FROM standings WHERE club_id = $1 AND league_id = $2 AND season_id = $3 ORDER BY id DESC LIMIT 1`, [homeClubId, leagueId, seasonId]);
                        const latestAwayRes = roundId
                            ? await client.query(`SELECT s.* FROM standings s
                     JOIN rounds r ON r.id = s.round_id
                    WHERE s.club_id = $1 AND s.league_id = $2 AND s.season_id = $3
                      AND r.round_number < (SELECT round_number FROM rounds WHERE id = $4)
                    ORDER BY r.round_number DESC LIMIT 1`, [awayClubId, leagueId, seasonId, roundId])
                            : await client.query(`SELECT * FROM standings WHERE club_id = $1 AND league_id = $2 AND season_id = $3 ORDER BY id DESC LIMIT 1`, [awayClubId, leagueId, seasonId]);
                        const latestHomeStanding = latestHomeRes.rows[0] ?? null;
                        const latestAwayStanding = latestAwayRes.rows[0] ?? null;
                        const mapRowToStanding = (r) => r
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
                        const spn = await client.query(`SELECT name FROM sports WHERE id = $1 LIMIT 1`, [sportId]);
                        const sportName = spn.rows[0]?.name ?? 'default';
                        const md = await client.query(`SELECT id, division_number, division_type, home_score, away_score FROM match_divisions WHERE match_id = $1 ORDER BY division_number ASC`, [matchId]);
                        const matchDivisions = md.rows.map((d) => ({ id: d.id, divisionNumber: d.division_number, divisionType: d.division_type, homeScore: d.home_score, awayScore: d.away_score }));
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
                        const { home: homeStats, away: awayStats } = standingsCalculator.calculate(sportName, matchData, latestHome, latestAway);
                        {
                            const standingsSql = `INSERT INTO standings (sport_id, league_id, season_id, round_id, match_date, group_id, club_id, match_id, points, played, wins, draws, losses, goals_for, goals_against, sets_won, sets_lost, home_games_played, away_games_played, home_points, away_points, home_wins, home_draws, home_losses, home_goals_for, home_goals_against, away_wins, away_draws, away_losses, away_goals_for, away_goals_against, overtime_wins, overtime_losses, penalty_wins, penalty_losses) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)`;
                            let standingsParams = [
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
                                }
                                else {
                                    while (standingsParams.length < placeholders)
                                        standingsParams.push(null);
                                }
                            }
                            await client.query(standingsSql, standingsParams);
                        }
                        {
                            const standingsSql = `INSERT INTO standings (sport_id, league_id, season_id, round_id, match_date, group_id, club_id, match_id, points, played, wins, draws, losses, goals_for, goals_against, sets_won, sets_lost, home_games_played, away_games_played, home_points, away_points, home_wins, home_draws, home_losses, home_goals_for, home_goals_against, away_wins, away_draws, away_losses, away_goals_for, away_goals_against, overtime_wins, overtime_losses, penalty_wins, penalty_losses) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35)`;
                            let standingsParams = [
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
                                }
                                else {
                                    while (standingsParams.length < placeholders)
                                        standingsParams.push(null);
                                }
                            }
                            await client.query(standingsSql, standingsParams);
                        }
                        createdStandings += 2;
                        const cascadeClub = async (clubId) => {
                            if (!roundId)
                                return;
                            const curRndRes = await client.query(`SELECT round_number FROM rounds WHERE id = $1 LIMIT 1`, [roundId]);
                            const currentRoundNumber = curRndRes.rows[0]?.round_number;
                            if (currentRoundNumber == null)
                                return;
                            const futureRes = await client.query(`SELECT s.id AS standings_id, s.match_id, s.round_id, r.round_number,
                        m.home_club_id, m.away_club_id, m.home_score, m.away_score, m.date
                   FROM standings s
                   JOIN rounds r ON r.id = s.round_id
                   JOIN matches m ON m.id = s.match_id
                  WHERE s.club_id = $1 AND s.league_id = $2 AND s.season_id = $3
                    AND r.round_number > $4
                  ORDER BY r.round_number ASC`, [clubId, leagueId, seasonId, currentRoundNumber]);
                            if (futureRes.rows.length === 0)
                                return;
                            for (const futureRow of futureRes.rows) {
                                const prevRes = await client.query(`SELECT s.* FROM standings s
                     JOIN rounds r ON r.id = s.round_id
                    WHERE s.club_id = $1 AND s.league_id = $2 AND s.season_id = $3
                      AND r.round_number < $4
                    ORDER BY r.round_number DESC LIMIT 1`, [clubId, leagueId, seasonId, futureRow.round_number]);
                                const prevStanding = mapRowToStanding(prevRes.rows[0] ?? null);
                                const isHome = futureRow.home_club_id === clubId;
                                const opponentClubId = isHome ? futureRow.away_club_id : futureRow.home_club_id;
                                const opPrevRes = await client.query(`SELECT s.* FROM standings s
                     JOIN rounds r ON r.id = s.round_id
                    WHERE s.club_id = $1 AND s.league_id = $2 AND s.season_id = $3
                      AND r.round_number < $4
                    ORDER BY r.round_number DESC LIMIT 1`, [opponentClubId, leagueId, seasonId, futureRow.round_number]);
                                const opPrevStanding = mapRowToStanding(opPrevRes.rows[0] ?? null);
                                const fmd = await client.query(`SELECT id, division_number, division_type, home_score, away_score FROM match_divisions WHERE match_id = $1 ORDER BY division_number ASC`, [futureRow.match_id]);
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
                                    matchDivisions: fmd.rows.map((d) => ({ id: d.id, divisionNumber: d.division_number, divisionType: d.division_type, homeScore: d.home_score, awayScore: d.away_score })),
                                };
                                const { home: fHomeStats, away: fAwayStats } = standingsCalculator.calculate(sportName, fMatchData, isHome ? prevStanding : opPrevStanding, isHome ? opPrevStanding : prevStanding);
                                const clubStats = isHome ? fHomeStats : fAwayStats;
                                await client.query(`UPDATE standings SET
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
                   WHERE id = $28`, [
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
                                ]);
                            }
                        };
                        await cascadeClub(homeClubId);
                        await cascadeClub(awayClubId);
                    }
                    catch (e) {
                        throw e;
                    }
                    applied += 1;
                }
                catch (e) {
                    const snapshotSql = lastSqlAll;
                    const snapshotParams = lastParamsAll;
                    try {
                        await client.query('ROLLBACK');
                    }
                    catch (_) { }
                    const includeDebug = process.env.DEBUG_ETL === 'true' || process.env.NODE_ENV !== 'production';
                    const details = { error: String(e), row: r };
                    try {
                        let cols = undefined;
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
                            }
                            else {
                                if (snapshotParams && Array.isArray(snapshotParams))
                                    details.paramValues = snapshotParams;
                            }
                        }
                        else {
                            if (snapshotParams && Array.isArray(snapshotParams))
                                details.paramValues = snapshotParams;
                        }
                        if (!details.failing && (String(e).toLowerCase().includes('invalid input syntax for type integer') || String(e).includes('NaN'))) {
                            const offending = [];
                            const numericKeyRegex = /\b(id|score|goals|minute|seconds|number|round|periods|elapsed|timestamp|home|away|points|played|wins|losses|draws)\b/i;
                            for (const k of Object.keys(r || {})) {
                                if (!numericKeyRegex.test(k))
                                    continue;
                                const v = r[k];
                                if (v === 'NaN' || (typeof v === 'number' && Number.isNaN(v)) || (v !== null && v !== undefined && v !== '' && Number.isNaN(Number(v)))) {
                                    const guessedColumn = cols && cols.includes(k) ? k : k.replace(/\./g, '_');
                                    offending.push({ key: k, value: v, guessedColumn });
                                }
                            }
                            if (offending.length)
                                details.offendingFields = offending;
                        }
                    }
                    catch (_) { }
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
            try {
                await client.query(`INSERT INTO api_transitional_audit (transitional_id, action, payload) VALUES ($1,$2,$3)`, [
                    id,
                    options.dryRun ? 'dry_run' : 'applied',
                    { applied, createdClubs, createdRounds, createdDivisions, createdStandings, skippedUnchanged, updatedMatches, clubsIncluded, dryRun: !!options.dryRun },
                ]);
            }
            catch (e) {
                this.logger.error('Failed to write api_transitional_audit', e);
            }
            if (options.dryRun) {
                await client.query('ROLLBACK');
            }
            else {
                await client.query('COMMIT');
                await this.deleteRoundReview(id);
            }
            const result = { applied, createdClubs, createdRounds, createdDivisions, createdStandings, skippedUnchanged, updatedMatches, clubsIncluded, dryRun: !!options.dryRun, isSubsequentLoad, enrichmentQueued: matchesForEnrichment.length };
            if (!options.dryRun && matchesForEnrichment.length > 0 && transitionalLeagueCode) {
                let espnSportName = 'soccer';
                try {
                    const spRes = await pool.query(`SELECT name FROM sports WHERE id = $1 LIMIT 1`, [sportId]);
                    if (spRes.rows.length) {
                        const sn = (spRes.rows[0].name ?? 'football').toLowerCase();
                        espnSportName = (sn === 'football' || sn === 'footaball') ? 'soccer' : sn;
                    }
                }
                catch { }
                this.logger.log(`ESPN enrichment: ${matchesForEnrichment.length} matches queued (background=${flgRunInBackground})`);
                if (flgRunInBackground) {
                    const leagueCode = transitionalLeagueCode;
                    const matches = [...matchesForEnrichment];
                    const sportN = espnSportName;
                    setImmediate(() => {
                        this.enrichMatchDivisionsFromEspn(sportN, leagueCode, matches).catch((e) => this.logger.error(`Background ESPN enrichment failed: ${String(e)}`));
                    });
                }
                else {
                    result.enrichment = await this.enrichMatchDivisionsFromEspn(espnSportName, transitionalLeagueCode, matchesForEnrichment);
                }
            }
            return result;
        }
        catch (e) {
            const snapshotSql = lastSqlAll;
            const snapshotParams = lastParamsAll;
            try {
                await client.query('ROLLBACK');
            }
            catch (_) { }
            const includeDebug = process.env.DEBUG_ETL === 'true' || process.env.NODE_ENV !== 'production';
            const details = { error: String(e) };
            if (includeDebug) {
                details.lastSql = snapshotSql;
                details.lastParams = snapshotParams;
                try {
                    if (snapshotParams && Array.isArray(snapshotParams))
                        details.paramValues = snapshotParams;
                }
                catch (_) { }
            }
            await client.query(`INSERT INTO api_import_log (transitional_id, message, details) VALUES ($1,$2,$3)`, [id, 'apply_all_rows_exception', details]);
            this.logger.error('applyAllRowsToApp error', e);
            return { applied: 0, error: String(e), details: includeDebug ? details : undefined };
        }
        finally {
            client.release();
            await pool.end();
        }
    }
};
exports.ApiService = ApiService;
exports.ApiService = ApiService = ApiService_1 = __decorate([
    (0, common_1.Injectable)()
], ApiService);
//# sourceMappingURL=api.service.js.map