require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// This maintenance script fixes overtime_wins / overtime_losses without deleting
// any rows from matches, match_divisions, or standings.
//
// Source of truth for identifying overtime games in this repair:
// 1. Call the ESPN NBA scoreboard endpoint day by day for the target date range.
// 2. Detect overtime directly from the ESPN origin response using either:
//    - linescores length > regulation periods, or
//    - status text containing OT.
// 3. Collect the ESPN event ids for those overtime games.
// 4. Match those ids against matches.origin_api_id in our database.
// 5. Use the corresponding internal match ids to recompute cumulative
//    overtime_wins / overtime_losses in standings.
//
// This avoids trying to infer the overtime game set from local derived data.
// We still use local match_divisions to determine who won in overtime because
// those OT partial scores are already stored correctly in the database.

function parseArgs(argv) {
  const result = {
    sportId: null,
    leagueId: null,
    seasonId: null,
    startDate: '2025-10-21',
    endDate: '2026-04-10',
    sportSlug: 'basketball',
    leagueSlug: 'nba',
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
    if (arg === '--startDate') {
      result.startDate = String(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--endDate') {
      result.endDate = String(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--sportSlug') {
      result.sportSlug = String(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--leagueSlug') {
      result.leagueSlug = String(argv[index + 1]);
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
  node scripts/recompute_overtime_standings.js [--sportId N] [--leagueId N] [--seasonId N] [--startDate YYYY-MM-DD] [--endDate YYYY-MM-DD] [--sportSlug basketball] [--leagueSlug nba] [--execute]

Purpose:
  Fetches ESPN scoreboard day by day to identify overtime games from the origin API ids,
  maps those ids to matches.origin_api_id in our database, and recomputes cumulative
  overtime_wins / overtime_losses in standings.

Rules:
  - Basketball overtime starts at division 5
  - Ice hockey overtime starts at division 4
  - Other sports use sports.max_match_divisions_number
  - No rows are deleted from matches, match_divisions, or standings

Examples:
  node scripts/recompute_overtime_standings.js --leagueId 57 --seasonId 80
  node scripts/recompute_overtime_standings.js --leagueId 57 --seasonId 80 --execute
`);
}

function formatEspnDate(date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function getRegulationPeriodsFromSportSlug(sportSlug) {
  const normalized = String(sportSlug ?? '').trim().toLowerCase();
  if (normalized === 'basketball') return 4;
  if (normalized === 'ice-hockey' || normalized === 'ice hockey' || normalized === 'hockey') return 3;
  return null;
}

async function fetchEspnOvertimeEventIds(options) {
  const start = new Date(`${options.startDate}T00:00:00Z`);
  const end = new Date(`${options.endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid --startDate or --endDate');
  }
  if (start > end) {
    throw new Error('--startDate cannot be after --endDate');
  }

  const regulationPeriods = getRegulationPeriodsFromSportSlug(options.sportSlug);
  const overtimeEvents = [];
  const current = new Date(start);

  while (current <= end) {
    const dateParam = formatEspnDate(current);
    const url = `https://site.api.espn.com/apis/site/v2/sports/${options.sportSlug}/${options.leagueSlug}/scoreboard?dates=${dateParam}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ESPN scoreboard fetch failed for ${dateParam}: HTTP ${response.status}`);
    }

    const json = await response.json();
    const events = Array.isArray(json.events) ? json.events : [];
    for (const event of events) {
      const competition = event?.competitions?.[0] ?? {};
      const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
      const home = competitors.find((entry) => entry.homeAway === 'home') ?? competitors[0] ?? {};
      const away = competitors.find((entry) => entry.homeAway === 'away') ?? competitors[1] ?? {};
      const homeLinescores = Array.isArray(home.linescores) ? home.linescores : [];
      const awayLinescores = Array.isArray(away.linescores) ? away.linescores : [];
      const maxPeriods = Math.max(homeLinescores.length, awayLinescores.length);
      const statusText = String(
        competition?.status?.type?.shortDetail
        ?? competition?.status?.type?.detail
        ?? event?.status?.type?.shortDetail
        ?? event?.status?.type?.detail
        ?? '',
      );
      const hasOvertimeByPeriods = regulationPeriods != null ? maxPeriods > regulationPeriods : false;
      const hasOvertimeByStatus = /OT/i.test(statusText);
      if (!hasOvertimeByPeriods && !hasOvertimeByStatus) continue;

      overtimeEvents.push({
        originApiId: String(event.id),
        date: event.date,
        homeName: home?.team?.displayName ?? home?.team?.name ?? null,
        awayName: away?.team?.displayName ?? away?.team?.name ?? null,
        maxPeriods,
        statusText,
      });
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return overtimeEvents;
}

function getRegulationDivisions(sportName, maxMatchDivisionsNumber) {
  const normalized = String(sportName ?? '').trim().toLowerCase();
  if (normalized.includes('basketball')) return 4;
  if (normalized.includes('ice hockey')) return 3;
  return Number(maxMatchDivisionsNumber ?? 0) || 0;
}

function compareStandingRows(left, right) {
  const leftRound = left.round_number == null ? null : Number(left.round_number);
  const rightRound = right.round_number == null ? null : Number(right.round_number);

  if (leftRound != null && rightRound != null && leftRound !== rightRound) {
    return leftRound - rightRound;
  }
  if (leftRound != null && rightRound == null) return -1;
  if (leftRound == null && rightRound != null) return 1;

  const leftDate = new Date(left.effective_match_date).getTime();
  const rightDate = new Date(right.effective_match_date).getTime();
  if (leftDate !== rightDate) return leftDate - rightDate;

  return Number(left.standing_id) - Number(right.standing_id);
}

async function getCandidateMatches(filters) {
  const overtimeEvents = await fetchEspnOvertimeEventIds(filters);
  const originApiIds = overtimeEvents.map((event) => event.originApiId);
  if (originApiIds.length === 0) {
    return {
      espnOvertimeEvents: overtimeEvents,
      candidateMatches: [],
      missingOriginApiIds: [],
    };
  }

  const sql = `
    SELECT
      m.id AS match_id,
      m.sport_id,
      m.league_id,
      m.season_id,
      m.home_club_id,
      m.away_club_id,
      m.home_score,
      m.away_score,
      m.origin_api_id,
      s.name AS sport_name,
      s.max_match_divisions_number,
      hc.short_name AS home_name,
      ac.short_name AS away_name,
      ARRAY_AGG(
        CONCAT(md.division_number, ':', md.division_type, ':', COALESCE(md.home_score, 0), '-', COALESCE(md.away_score, 0))
        ORDER BY md.division_number
      ) AS division_map,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'divisionNumber', md.division_number,
          'divisionType', md.division_type,
          'homeScore', md.home_score,
          'awayScore', md.away_score
        )
        ORDER BY md.division_number
      ) AS divisions
    FROM matches m
    JOIN sports s ON s.id = m.sport_id
    JOIN clubs hc ON hc.id = m.home_club_id
    JOIN clubs ac ON ac.id = m.away_club_id
    JOIN match_divisions md ON md.match_id = m.id
    WHERE m.status = 'Finished'
      AND m.origin_api_id = ANY($4::text[])
      AND ($1::int IS NULL OR m.sport_id = $1)
      AND ($2::int IS NULL OR m.league_id = $2)
      AND ($3::int IS NULL OR m.season_id = $3)
    GROUP BY
      m.id,
      m.sport_id,
      m.league_id,
      m.season_id,
      m.home_club_id,
      m.away_club_id,
      m.home_score,
      m.away_score,
      m.origin_api_id,
      s.name,
      s.max_match_divisions_number,
      hc.short_name,
      ac.short_name
    ORDER BY m.id ASC
  `;

  const result = await pool.query(sql, [filters.sportId, filters.leagueId, filters.seasonId, originApiIds]);
  const overtimeEventById = new Map(overtimeEvents.map((event) => [event.originApiId, event]));

  const matchedOriginApiIds = new Set(result.rows.map((row) => String(row.origin_api_id)));
  const missingOriginApiIds = overtimeEvents
    .map((event) => event.originApiId)
    .filter((originApiId) => !matchedOriginApiIds.has(originApiId));

  const candidateMatches = result.rows
    .map((row) => {
      const regulationDivisions = getRegulationDivisions(row.sport_name, row.max_match_divisions_number);
      const divisions = Array.isArray(row.divisions) ? row.divisions : [];
      const overtimeDivisions = divisions.filter((division) => {
        const divisionNumber = Number(division.divisionNumber ?? 0);
        const homeScore = Number(division.homeScore ?? 0);
        const awayScore = Number(division.awayScore ?? 0);
        return divisionNumber > regulationDivisions && (homeScore !== 0 || awayScore !== 0);
      });

      if (overtimeDivisions.length === 0) return null;

      const homeExtraTotal = overtimeDivisions.reduce((sum, division) => sum + Number(division.homeScore ?? 0), 0);
      const awayExtraTotal = overtimeDivisions.reduce((sum, division) => sum + Number(division.awayScore ?? 0), 0);
      if (homeExtraTotal === awayExtraTotal) return null;

      const overtimeEvent = overtimeEventById.get(String(row.origin_api_id));

      return {
        matchId: Number(row.match_id),
        sportId: Number(row.sport_id),
        leagueId: Number(row.league_id),
        seasonId: Number(row.season_id),
        homeClubId: Number(row.home_club_id),
        awayClubId: Number(row.away_club_id),
        homeName: row.home_name,
        awayName: row.away_name,
        homeScore: Number(row.home_score ?? 0),
        awayScore: Number(row.away_score ?? 0),
        originApiId: row.origin_api_id,
        espnDate: overtimeEvent?.date ?? null,
        espnStatusText: overtimeEvent?.statusText ?? null,
        sportName: row.sport_name,
        regulationDivisions,
        overtimeDivisions,
        homeExtraTotal,
        awayExtraTotal,
        homeWonOvertime: homeExtraTotal > awayExtraTotal,
        awayWonOvertime: awayExtraTotal > homeExtraTotal,
        divisionMap: row.division_map || [],
      };
    })
    .filter(Boolean);

  return {
    espnOvertimeEvents: overtimeEvents,
    candidateMatches,
    missingOriginApiIds,
  };
}

async function getStandingsRowsForClubs(leagueId, seasonId, clubIds) {
  if (clubIds.length === 0) return [];

  const sql = `
    SELECT
      s.id AS standing_id,
      s.club_id,
      s.match_id,
      s.match_date,
      s.round_id,
      s.overtime_wins,
      s.overtime_losses,
      m.date AS match_date_source,
      m.home_club_id,
      m.away_club_id,
      COALESCE(r.round_number, NULL) AS round_number,
      COALESCE(s.match_date, m.date) AS effective_match_date
    FROM standings s
    JOIN matches m ON m.id = s.match_id
    LEFT JOIN rounds r ON r.id = s.round_id
    WHERE s.league_id = $1
      AND s.season_id = $2
      AND s.club_id = ANY($3::int[])
    ORDER BY s.club_id ASC, s.id ASC
  `;

  const result = await pool.query(sql, [leagueId, seasonId, clubIds]);
  return result.rows;
}

function buildPlannedUpdates(candidateMatches, standingsRows) {
  const candidateByMatchId = new Map(candidateMatches.map((match) => [match.matchId, match]));
  const standingsByClub = new Map();

  for (const row of standingsRows) {
    const clubId = Number(row.club_id);
    if (!standingsByClub.has(clubId)) standingsByClub.set(clubId, []);
    standingsByClub.get(clubId).push({
      standing_id: Number(row.standing_id),
      club_id: clubId,
      match_id: Number(row.match_id),
      overtime_wins: Number(row.overtime_wins ?? 0),
      overtime_losses: Number(row.overtime_losses ?? 0),
      round_number: row.round_number == null ? null : Number(row.round_number),
      effective_match_date: row.effective_match_date,
    });
  }

  const plannedUpdates = [];

  for (const [clubId, clubRows] of standingsByClub.entries()) {
    clubRows.sort(compareStandingRows);

    let cumulativeWins = 0;
    let cumulativeLosses = 0;

    for (const row of clubRows) {
      const candidateMatch = candidateByMatchId.get(row.match_id);
      if (candidateMatch) {
        if (candidateMatch.homeClubId === clubId && candidateMatch.homeWonOvertime) cumulativeWins += 1;
        if (candidateMatch.awayClubId === clubId && candidateMatch.awayWonOvertime) cumulativeWins += 1;
        if (candidateMatch.homeClubId === clubId && candidateMatch.awayWonOvertime) cumulativeLosses += 1;
        if (candidateMatch.awayClubId === clubId && candidateMatch.homeWonOvertime) cumulativeLosses += 1;
      }

      if (row.overtime_wins !== cumulativeWins || row.overtime_losses !== cumulativeLosses) {
        plannedUpdates.push({
          standingId: row.standing_id,
          clubId,
          matchId: row.match_id,
          currentWins: row.overtime_wins,
          currentLosses: row.overtime_losses,
          nextWins: cumulativeWins,
          nextLosses: cumulativeLosses,
        });
      }
    }
  }

  return plannedUpdates;
}

function buildSummary(candidateMatches, plannedUpdates) {
  const overtimeMatchIds = new Set(candidateMatches.map((match) => match.matchId));
  const directMatchUpdates = plannedUpdates.filter((update) => overtimeMatchIds.has(update.matchId));
  const propagatedUpdates = plannedUpdates.filter((update) => !overtimeMatchIds.has(update.matchId));

  return {
    directMatchUpdateCount: directMatchUpdates.length,
    propagatedUpdateCount: propagatedUpdates.length,
  };
}

async function applyUpdates(updates) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const update of updates) {
      await client.query(
        `UPDATE standings
            SET overtime_wins = $1,
                overtime_losses = $2,
                updated_at = now()
          WHERE id = $3`,
        [update.nextWins, update.nextLosses, update.standingId],
      );
    }
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
  const { espnOvertimeEvents, candidateMatches, missingOriginApiIds } = await getCandidateMatches(options);

  if (espnOvertimeEvents.length === 0) {
    console.log('No finished matches with saved overtime scores were found for the provided filters.');
    return;
  }

  const impactedClubIds = Array.from(new Set(candidateMatches.flatMap((match) => [match.homeClubId, match.awayClubId])));
  const leagueSeasonKeys = Array.from(new Set(candidateMatches.map((match) => `${match.leagueId}:${match.seasonId}`)));
  if (leagueSeasonKeys.length !== 1) {
    throw new Error('This script expects one league/season scope at a time. Please filter by --leagueId and --seasonId.');
  }

  const [leagueIdRaw, seasonIdRaw] = leagueSeasonKeys[0].split(':');
  const leagueId = Number(leagueIdRaw);
  const seasonId = Number(seasonIdRaw);
  const standingsRows = await getStandingsRowsForClubs(leagueId, seasonId, impactedClubIds);
  const plannedUpdates = buildPlannedUpdates(candidateMatches, standingsRows);
  const summary = buildSummary(candidateMatches, plannedUpdates);

  console.log(`ESPN overtime events found: ${espnOvertimeEvents.length}`);
  console.log(`Database matches found by origin_api_id: ${candidateMatches.length}`);
  if (missingOriginApiIds.length > 0) {
    console.log(`Missing origin_api_id values in local matches table: ${missingOriginApiIds.join(', ')}`);
  }
  for (const match of candidateMatches.slice(0, 25)) {
    console.log(
      [
        `matchId=${match.matchId}`,
        `originApiId=${match.originApiId ?? 'null'}`,
        `espnStatus=${match.espnStatusText ?? 'n/a'}`,
        `${match.homeName} ${match.homeScore}-${match.awayScore} ${match.awayName}`,
        `OT=${match.homeExtraTotal}-${match.awayExtraTotal}`,
        `divisions=${match.divisionMap.join(',')}`,
      ].join(' | '),
    );
  }
  if (candidateMatches.length > 25) {
    console.log(`... ${candidateMatches.length - 25} more overtime matches omitted from preview`);
  }

  console.log(`Impacted clubs: ${impactedClubIds.length}`);
  console.log(`Standings rows for the OT matches themselves: ${summary.directMatchUpdateCount}`);
  console.log(`Later cumulative standings rows also affected: ${summary.propagatedUpdateCount}`);
  console.log(`Total standings rows to update cumulatively: ${plannedUpdates.length}`);
  for (const update of plannedUpdates.slice(0, 25)) {
    console.log(
      [
        `standingId=${update.standingId}`,
        `clubId=${update.clubId}`,
        `matchId=${update.matchId}`,
        `overtimeWins ${update.currentWins} -> ${update.nextWins}`,
        `overtimeLosses ${update.currentLosses} -> ${update.nextLosses}`,
      ].join(' | '),
    );
  }
  if (plannedUpdates.length > 25) {
    console.log(`... ${plannedUpdates.length - 25} more standings updates omitted from preview`);
  }

  if (!options.execute) {
    console.log('\nDry run only. Re-run with --execute to update overtime_wins and overtime_losses in standings.');
    return;
  }

  await applyUpdates(plannedUpdates);
  console.log(`Updated ${plannedUpdates.length} standings row(s).`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });