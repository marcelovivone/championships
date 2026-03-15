import { Injectable, Logger } from '@nestjs/common';
import { StandingsCalculatorService } from '../standings/standings-calculator.service';
import { Pool } from 'pg';
import { matches } from 'class-validator/types/decorator/string/Matches';
import { eq } from 'drizzle-orm/sql/expressions/conditions';

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
          league INTEGER,
          season INTEGER,
          sport INTEGER,
          origin TEXT,
          source_url TEXT,
          payload JSONB,
          status BOOLEAN DEFAULT false,
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

  // Fetch from external API and store full JSON response
  // origin: 'Api-Football' (default) or 'Api-Espn'
  async fetchAndStore(
    league: number,
    season: number,
    sport?: number,
    origin?: string,
    startDate?: string,
    endDate?: string,
  ) {
    if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const effectiveOrigin = origin || 'Api-Football';
    const effectiveSeason = startDate ? Number(String(startDate).slice(0, 4)) : season;
    try {
      let url: URL;
      let headers: Record<string, string> = {};

      if (effectiveOrigin === 'Api-Espn') {
        // ESPN API doesn't require API key for public endpoints
        // Build URL for ESPN scoreboard
        // url = new URL('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard');
        url = new URL('https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1/scoreboard');
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
        url = new URL('https://v3.football.api-sports.io/fixtures');
        if (season) url.searchParams.set('season', String(season));
        if (league) url.searchParams.set('league', String(league));
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
          league INTEGER,
          season INTEGER,
          sport INTEGER,
          source_url TEXT,
          payload JSONB,
          status BOOLEAN DEFAULT false,
          fetched_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      const insertRes = await pool.query(
        `INSERT INTO api_transitional (league, season, sport, source_url, payload, origin) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, fetched_at;`,
        [league || null, effectiveSeason || null, sport || null, url.toString(), json, effectiveOrigin],
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
        `SELECT id, league, season, sport, source_url, status, fetched_at, COALESCE(origin, 'Api-Football') as origin FROM api_transitional ORDER BY fetched_at DESC LIMIT $1`,
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
  async parseTransitional(id: number) {
    const row = await this.getTransitional(id);
    if (!row) return { found: false };
    
    // Check the origin and route to appropriate parser
    const origin = row.origin ?? 'Api-Football';
    if (origin === 'Api-Espn') {
      return this.parseTransitionalEspn(row);
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
  private parseTransitionalEspn(row: any) {
    const payload = row.payload ?? row;
    
    // ESPN data structure: { events: [...] }
    const events = payload?.events ?? [];
    if (!Array.isArray(events) || events.length === 0) {
      return { found: false, reason: 'no_events_array' };
    }
    
    // Extract league info from the first event's season
    const firstEvent = events[0];
    const seasonInfo = firstEvent?.season ?? {};
    const leagueInfo = payload?.leagues?.[0] ?? {};

    const getEspnRoundNumbers = (items: any[]) => {
      const roundByEventId = new Map<string, number>();
      const uniqueClubIds = new Set<string>();
      const reservedEventIds = new Set<string>();

      const getTeamId = (competitor: any) => {
        const teamId = competitor?.team?.id ?? competitor?.id;
        return teamId !== undefined && teamId !== null ? String(teamId) : null;
      };

      const getTeamName = (competitor: any) =>
        competitor?.team?.displayName ?? competitor?.team?.shortDisplayName ?? competitor?.team?.name ?? null;

      for (const event of items) {
        const competition = event?.competitions?.[0];
        const competitors = competition?.competitors ?? [];
        for (const competitor of competitors) {
          const teamId = getTeamId(competitor);
          if (teamId) uniqueClubIds.add(teamId);
        }
      }

      const allTeamIds = Array.from(uniqueClubIds);
      const maxMatchesPerRound = uniqueClubIds.size >= 2 ? Math.floor(uniqueClubIds.size / 2) : null;
      const toUtcDay = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
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
          };
        })
        .filter((item) => item.date !== null)
        .sort((left, right) => left.date!.getTime() - right.date!.getTime());

      let currentRound = 1;
      let previousDate: Date | null = null;
      let matchesInCurrentRound = 0;
      let currentRoundTeamIds = new Set<string>();
      let index = 0;

      while (index < sortableEvents.length) {
        const item = sortableEvents[index];
        const currentDate = item.date!;
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

        const roundReachedExpectedSize = maxMatchesPerRound !== null && matchesInCurrentRound >= maxMatchesPerRound;
        if (roundReachedExpectedSize) {
          currentRound += 1;
          matchesInCurrentRound = 0;
          currentRoundTeamIds = new Set<string>();
          previousDate = null;
          continue;
        }

        if (previousDate) {
          const diffInDays = Math.floor((toUtcDay(currentDate) - toUtcDay(previousDate)) / (24 * 60 * 60 * 1000));
          const hasRestDayBetweenMatches = diffInDays > 1;
          const shouldSplitByGap = maxMatchesPerRound === null && hasRestDayBetweenMatches;
          if (shouldSplitByGap) {
            currentRound += 1;
            matchesInCurrentRound = 0;
            currentRoundTeamIds = new Set<string>();
            previousDate = null;
            continue;
          }
        }

        const teamAlreadyInRound = currentRoundTeamIds.has(item.homeId) || currentRoundTeamIds.has(item.awayId);
        if (teamAlreadyInRound && maxMatchesPerRound !== null) {
          const missingTeamIds = allTeamIds.filter((teamId) => !currentRoundTeamIds.has(teamId));
          const teamNamesById = new Map<string, string>();
          for (const entry of sortableEvents) {
            if (entry.homeId && entry.homeName && !teamNamesById.has(entry.homeId)) teamNamesById.set(entry.homeId, entry.homeName);
            if (entry.awayId && entry.awayName && !teamNamesById.has(entry.awayId)) teamNamesById.set(entry.awayId, entry.awayName);
          }

          if (missingTeamIds.length > 2) {
            return {
              roundByEventId,
              reservedEventIds,
              conflict: {
                reason: 'round_assignment_conflict',
                message: `Round ${currentRound} is missing ${missingTeamIds.length / 2} matches; automatic lookup only supports one missing match.`,
                details: {
                  round: currentRound,
                  expectedMatches: maxMatchesPerRound,
                  assignedMatches: matchesInCurrentRound,
                  currentEvent: {
                    id: item.event?.id ?? null,
                    date: item.event?.date ?? currentDate.toISOString(),
                    homeTeam: item.homeName,
                    awayTeam: item.awayName,
                  },
                  missingTeams: missingTeamIds.map((teamId) => ({ id: teamId, name: teamNamesById.get(teamId) ?? teamId })),
                },
              },
            };
          }

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

            if (!foundReplacement) {
              return {
                roundByEventId,
                reservedEventIds,
                conflict: {
                  reason: 'round_assignment_conflict',
                  message: `Round ${currentRound} is missing one postponed match, but no future fixture was found for the two missing teams.`,
                  details: {
                    round: currentRound,
                    expectedMatches: maxMatchesPerRound,
                    assignedMatches: matchesInCurrentRound,
                    currentEvent: {
                      id: item.event?.id ?? null,
                      date: item.event?.date ?? currentDate.toISOString(),
                      homeTeam: item.homeName,
                      awayTeam: item.awayName,
                    },
                    missingTeams: missingTeamIds.map((teamId) => ({ id: teamId, name: teamNamesById.get(teamId) ?? teamId })),
                  },
                },
              };
            }

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

        if (eventId) roundByEventId.set(eventId, currentRound);
        matchesInCurrentRound += 1;
        currentRoundTeamIds.add(item.homeId);
        currentRoundTeamIds.add(item.awayId);
        previousDate = currentDate;
        index += 1;
      }

      return { roundByEventId, reservedEventIds, conflict: null };
    };

    const roundResult = getEspnRoundNumbers(events);
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
        
        // Additional ESPN-specific fields that might be useful
        'espn.event.id': event?.id ?? null,
        'espn.competition.id': competition?.id ?? null,
        'espn.attendance': competition?.attendance ?? null,
      };
      
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
        if (parsed?.reason === 'round_assignment_conflict') {
          const details = parsed?.details ?? {};
          const message = parsed?.error ?? 'Round assignment conflict while deriving ESPN rounds';
          const logRes = await client.query(
            `INSERT INTO api_import_log (transitional_id, message, details) VALUES ($1,$2,$3) RETURNING id`,
            [id, 'round_assignment_conflict', { message, ...details }],
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
          } catch (_) {}
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
          } catch (_) {}
          if (includeDebug) {
            details.lastSql = snapshotSql;
            details.lastParams = snapshotParams;
            try {
              if (snapshotParams && Array.isArray(snapshotParams) && insertCols && insertCols.length) {
                details.paramColumnMap = Object.fromEntries(insertCols.map((col, idx) => [col, snapshotParams[idx]]));
              }
            } catch (_) {}
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
      } catch (_) {}
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
        } catch (_) {}
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
  ) {
    // Read sport defaults
    const sp = await client.query(
      `SELECT min_match_divisions_number AS min_divisions, max_match_divisions_number AS max_divisions, has_overtime, has_penalties FROM sports WHERE id = $1 LIMIT 1`,
      [sportId],
    );
    let maxDivisions = 2;
    let hasOvertime = false;
    let hasPenalties = false;
    if (sp.rows && sp.rows.length) {
      const r = sp.rows[0];
      if (r.max_divisions !== undefined && r.max_divisions !== null) maxDivisions = Number(r.max_divisions) || maxDivisions;
      hasOvertime = !!r.has_overtime;
      hasPenalties = !!r.has_penalties;
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

      // Ensure integers and guard against NaN by coercing non-finite values to 0
      homeScore = homeScore == null || !Number.isFinite(Number(homeScore)) ? 0 : Math.max(0, Math.trunc(Number(homeScore)));
      awayScore = awayScore == null || !Number.isFinite(Number(awayScore)) ? 0 : Math.max(0, Math.trunc(Number(awayScore)));

      await client.query(
        `INSERT INTO match_divisions (match_id, division_number, division_type, home_score, away_score) VALUES ($1,$2,$3,$4,$5)`,
        [matchId, div, divisionType, homeScore, awayScore],
      );
    }

    // If sport indicates overtime/penalties, caller may insert extra rows accordingly (not implemented here)
    return { created: maxDivisions };
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

      const parsed = await this.parseTransitional(id) as any;
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
            `INSERT INTO leagues (sport_id, country_id, image_url, original_name, secondary_name, city_id, number_of_rounds_matches, min_divisions_number, max_divisions_number, division_time, has_ascends, ascends_quantity, has_descends, descends_quantity, number_of_sub_leagues, flg_default, flg_round_automatic, type_of_schedule) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
            [
              sportId,
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
          const endYear = Number.isFinite(startYearNum) ? startYearNum + 1 : startYear;
          const ins = await client.query(
            `INSERT INTO seasons (sport_id, league_id, status, flg_default, number_of_groups, start_year, end_year) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
            [sportId, leagueId, 'Finished', false, 0, startYear, endYear],
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

  // Apply all rows: create rounds, clubs, and matches (atomic)
  async applyAllRowsToApp(id: number, options: { sportId?: number; leagueId?: number; seasonId?: number; dryRun?: boolean } = {}) {
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

      const parsed = await this.parseTransitional(id) as any;
      if (!parsed || !parsed.found) return { applied: 0, reason: 'not_found' };
      const rows = parsed.rows || [];
      if (!rows.length) return { applied: 0, reason: 'no_rows' };

      // Ensure we have leagueId & seasonId (use applyFirstRowToApp if necessary)
      let leagueId = options.leagueId ?? null;
      let seasonId = options.seasonId ?? null;
      const sportId = options.sportId ?? 36;
      if (!leagueId || !seasonId) {
        const firstRowResult = await this.applyFirstRowToApp(id, { sportId });
        if (!firstRowResult.applied) return { applied: 0, reason: 'first_row_failed', details: firstRowResult };
        leagueId = firstRowResult.leagueId;
        seasonId = firstRowResult.seasonId;
      }

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

      const normalizeText = (value: any) => String(value ?? '').trim();
      const normalizeLookupKey = (value: any) =>
        normalizeText(value)
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '')
          .trim();

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

      const ensureStadium = async (venueNameRaw: any, cityId: number | null) => {
        const venueName = normalizeText(venueNameRaw);
        if (!venueName || !cityId) return null;

        const normalizedVenueName = normalizeLookupKey(venueName);
        const cacheKey = `${sportId}:${cityId}:${normalizedVenueName}`;
        if (stadiumCache[cacheKey]) return stadiumCache[cacheKey];

        const existing = await client.query(
          `SELECT id FROM stadiums WHERE sport_id = $1 AND city_id = $2 AND lower(name) = lower($3) LIMIT 1`,
          [sportId, cityId, venueName],
        );
        if (existing.rows.length) {
          stadiumCache[cacheKey] = existing.rows[0].id;
          return existing.rows[0].id;
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
          stadiumCache[cacheKey] = normalizedExisting.rows[0].id;
          return normalizedExisting.rows[0].id;
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
          stadiumCache[cacheKey] = flexible.rows[0].id;
          return flexible.rows[0].id;
        }

        const inserted = await client.query(
          `INSERT INTO stadiums (sport_id, name, city_id, capacity, image_url, year_constructed, type) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [sportId, venueName, cityId, null, null, null, 'stadium'],
        );
        stadiumCache[cacheKey] = inserted.rows[0].id;
        return inserted.rows[0].id;
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

          // Helper to find or create club
          const findOrCreateClub = async (clubNameRaw: any, clubLogo: any) => {
            if (!clubNameRaw) return null;
            const clubName = String(clubNameRaw).trim();
            if (!clubName) return null;
            if (clubCache[clubName]) return clubCache[clubName];

            // Try exact short_name or name (restrict to current country)
            let cres = await client.query(
              `SELECT id FROM clubs WHERE (lower(short_name)=lower($1) OR lower(name)=lower($1)) AND country_id = $2 LIMIT 1`,
              [clubName, leagueCountryId],
            );
            if (!cres.rows.length) {
              cres = await client.query(
                `SELECT id FROM clubs WHERE (name ILIKE $1 OR short_name ILIKE $1) AND country_id = $2 LIMIT 1`,
                [`%${clubName}%`, leagueCountryId],
              );
            }
            if (cres.rows.length) {
              clubCache[clubName] = cres.rows[0].id;
              return cres.rows[0].id;
            }

            // Create club
            const countryId = leagueCountryId;
            const ins = await client.query(
              `INSERT INTO clubs (name, short_name, image_url, foundation_year, country_id, city_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
              [clubName, clubName, clubLogo || null, 2000, countryId, null],
            );
            const cid = ins.rows[0].id;
            clubCache[clubName] = cid;
            createdClubs += 1;
            // only track clubs that were actually created during this run
            if (!clubsIncluded.includes(clubName)) clubsIncluded.push(clubName);
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

          // Venue data is attached to the fixture, which in football corresponds to the home club context.
          const cityId = await ensureCity(venueCity);
          const stadiumId = await ensureStadium(venueName, cityId);
          await ensureClubStadium(homeClubId, stadiumId);

          // Prepare match insert
          const dateRaw = r['fixture.date'] ?? r['date'] ?? null;
          const dateVal = dateRaw ? new Date(String(dateRaw)) : null;
          const statusShort = r['fixture.status.short'] ?? null;
          const status = statusShort === 'FT' ? 'Finished' : 'Scheduled';
          const homeScore = r['goals.home'] !== undefined ? Number(r['goals.home']) : null;
          const awayScore = r['goals.away'] !== undefined ? Number(r['goals.away']) : null;

          // Insert match
          const matchRes = await client.query(
            `INSERT INTO matches (sport_id, league_id, season_id, round_id, group_id, home_club_id, away_club_id, stadium_id, date, status, home_score, away_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
            [sportId, leagueId, seasonId, roundId, null, homeClubId, awayClubId, stadiumId, dateVal, status, homeScore, awayScore],
          );
          const matchId = matchRes.rows[0].id;
          // create match_divisions rows according to sport defaults and parsed row data
          try {
            const divRes = await this.createMatchDivisions(client, sportId, matchId, r);
            if (divRes && divRes.created) createdDivisions += Number(divRes.created) || 0;
          } catch (e) {
            // if creating divisions fails, treat as fatal for this transaction
            throw e;
          }

          // Build standings only for finished matches: fetch previous standings and match_divisions, compute stats, insert two rows
          try {
            if (status !== 'Finished') {
              // skip standings update for non-finished matches
              applied += 1;
              continue;
            }
            // fetch latest standings entries for both clubs
            const latestHomeRes = await client.query(
              `SELECT * FROM standings WHERE club_id = $1 AND league_id = $2 AND season_id = $3 ORDER BY id DESC LIMIT 1`,
            //   match_date, sport_id, match_id, group_id, club_id, points, played, wins, draws, losses, goals_for, goals_against, updated_at, league_id, season_id, round_id, overtime_wins, overtime_losses, penalty_wins, penalty_losses, sets_won, sets_lost
              [homeClubId, leagueId, seasonId],
            );

            const latestAwayRes = await client.query(
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
          } catch (_) {}
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
          } catch (_) {}
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

      // Insert audit record summarizing the run
      try {
        await client.query(
          `INSERT INTO api_transitional_audit (transitional_id, action, payload) VALUES ($1,$2,$3)`,
          [
            id,
            options.dryRun ? 'dry_run' : 'applied',
            { applied, createdClubs, createdRounds, createdDivisions, createdStandings, clubsIncluded, dryRun: !!options.dryRun },
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
      }

      return { applied, createdClubs, createdRounds, createdDivisions, createdStandings, clubsIncluded, dryRun: !!options.dryRun };
    } catch (e) {
      const snapshotSql = lastSqlAll;
      const snapshotParams = lastParamsAll;
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      const includeDebug = process.env.DEBUG_ETL === 'true' || process.env.NODE_ENV !== 'production';
      const details: any = { error: String(e) };
      if (includeDebug) {
        details.lastSql = snapshotSql;
        details.lastParams = snapshotParams;
        try {
          if (snapshotParams && Array.isArray(snapshotParams)) details.paramValues = snapshotParams;
        } catch (_) {}
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
