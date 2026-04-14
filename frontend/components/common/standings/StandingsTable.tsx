"use client";

import React from 'react';
import clsx from 'clsx';
import Tooltip from '../ui/Tooltip';

type LooseObject = Record<string, unknown>;

type ViewType = 'all' | 'home' | 'away';

type Last10Record = {
  w: number;
  d: number;
  l: number;
};

type Last5Entry =
  | string
  | (LooseObject & {
      result?: unknown;
      outcome?: unknown;
      label?: unknown;
      resultSymbol?: unknown;
      symbol?: unknown;
      homeShortName?: unknown;
      awayShortName?: unknown;
      homeScore?: unknown;
      awayScore?: unknown;
      roundNumber?: unknown;
      stadiumName?: unknown;
      date?: unknown;
      homeImage?: unknown;
      awayImage?: unknown;
      home?: LooseObject;
      away?: LooseObject;
      round?: LooseObject;
      stadium?: LooseObject;
      homeClub?: LooseObject;
      awayClub?: LooseObject;
    });

type MatchLike = LooseObject & {
  id?: unknown;
  matchId?: unknown;
  match_id?: unknown;
  homeClubId?: unknown;
  awayClubId?: unknown;
  homeClub?: LooseObject;
  awayClub?: LooseObject;
  homeScore?: unknown;
  awayScore?: unknown;
  status?: unknown;
  matchStatus?: unknown;
  date?: unknown;
  matchDate?: unknown;
  datetime?: unknown;
  dateTime?: unknown;
  round?: LooseObject;
  stadium?: LooseObject;
};

type RawStandingRow = LooseObject & {
  position?: unknown;
  rank?: unknown;
  clubId?: unknown;
  club_id?: unknown;
  club?: LooseObject;
  teamId?: unknown;
  team_id?: unknown;
  team?: LooseObject;
  short_name?: unknown;
  shortName?: unknown;
  teamName?: unknown;
  clubName?: unknown;
  gd?: unknown;
  goalDifference?: unknown;
  last5?: unknown;
  last5String?: unknown;
  last10?: unknown;
  winsLast10?: unknown;
  drawsLast10?: unknown;
  lossesLast10?: unknown;
};

type EnrichedRow = {
  raw: RawStandingRow;
  position: number;
  inferredClubId: unknown;
  teamName: string;
  pts: number;
  pl: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pct: string;
  last5: Last5Entry[];
  last10: Last10Record;
  streakDisplay: string;
  basketball: {
    homeRecord: string;
    awayRecord: string;
    otRecord: string;
  };
};

const toNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const toLast10Record = (value: unknown, fallbackSource?: RawStandingRow): Last10Record => {
  const record = (value && typeof value === 'object' ? value : {}) as LooseObject;
  return {
    w: toNumber(record.w ?? fallbackSource?.winsLast10, 0),
    d: toNumber(record.d ?? fallbackSource?.drawsLast10, 0),
    l: toNumber(record.l ?? fallbackSource?.lossesLast10, 0),
  };
};

const toDateInput = (value: unknown): string | number | Date | undefined => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return undefined;
};

const toDisplayString = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

const toDisplayNode = (value: unknown, fallback = ''): React.ReactNode => {
  if (typeof value === 'string' || typeof value === 'number') return value;
  return fallback;
};

type StandingsTableProps = {
  rows?: RawStandingRow[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  clubsMap?: Record<string, string>;
  historicalMatches?: MatchLike[];
  cutoffDate?: string;
  currentMatches?: MatchLike[];
  viewType?: ViewType;
  teamHeaderLabel?: string;
  positionColorMap?: Record<number, string>;
  sportKey?: string;
};

function Last5Chip({ c, tooltip }: { c: string; tooltip?: React.ReactNode | null }) {
  const isLetter = c === 'W' || c === 'D' || c === 'L';
  if (!isLetter) {
    const empty = <div className="w-6 h-6" />;
    if (tooltip) return <Tooltip label={tooltip}>{empty}</Tooltip>;
    return empty;
  }
  const bg = c === 'W' ? 'bg-green-600' : c === 'D' ? 'bg-gray-400' : 'bg-red-600';
  const chip = (
    <div className={clsx('w-6 h-6 rounded flex items-center justify-center text-xs text-white', bg)}>
      {c}
    </div>
  );
  if (tooltip) {
    return <Tooltip label={tooltip}>{chip}</Tooltip>;
  }
  return chip;
}

function Last5Header() {
  return (
    <Tooltip label="Oldest to newest, left to right">
      <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
        <span>LAST 5</span>
        <span aria-hidden="true">→</span>
      </span>
    </Tooltip>
  );
}

export default function StandingsTable({ rows, isLoading, error, onRetry, clubsMap, historicalMatches, cutoffDate, currentMatches, viewType, teamHeaderLabel, positionColorMap, sportKey }: StandingsTableProps) {
  const list = Array.isArray(rows) ? rows : [];
  const isBasketball = String(sportKey ?? '').toLowerCase() === 'basketball';
  // (no debug logs)
  const getAny = (obj: LooseObject | null | undefined, names: string[]) => {
    if (!obj) return undefined;
    for (const n of names) {
      if (typeof obj[n] !== 'undefined' && obj[n] !== null) return obj[n];
    }
    return undefined;
  };

  const formatBasketballPct = (rawPct: unknown, wins: number, played: number) => {
    let normalized: number | null = null;
    const numericRaw = Number(rawPct);
    if (Number.isFinite(numericRaw)) {
      normalized = numericRaw > 1 ? numericRaw / 100 : numericRaw;
    } else if (played > 0) {
      normalized = wins / played;
    }
    if (normalized === null) return '.000';
    return normalized.toFixed(3).replace(/^0(?=\.)/, '');
  };

  const formatStandardPct = (rawPct: unknown, wins: number, played: number) => {
    let percentage: number | null = null;
    const numericRaw = Number(rawPct);
    if (Number.isFinite(numericRaw)) {
      percentage = numericRaw <= 1 ? numericRaw * 100 : numericRaw;
    } else if (played > 0) {
      percentage = (wins / played) * 100;
    }
    if (percentage === null) return '0';
    return String(Math.round(percentage));
  };

  const formatBasketballRecord = (wins: number, losses: number) => `${wins}-${losses}`;

  const toBasketballResult = (clubId: number, match: MatchLike) => {
    const home = Number(match.homeClubId ?? match.homeClub?.id ?? match.homeClubId);
    const away = Number(match.awayClubId ?? match.awayClub?.id ?? match.awayClubId);
    const hs = Number(match.homeScore);
    const as = Number(match.awayScore);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) return '';
    if (hs === as) return 'D';
    return (clubId === home && hs > as) || (clubId === away && as > hs) ? 'W' : 'L';
  };

  // Columns: football shared default. Basketball overrides below.
  // Apply zebra (shaded) backgrounds starting at Pts (index 2) and alternating
  const shouldShadeCol = (idx: number) => idx >= 2 && idx <= 12 && ((idx - 2) % 2 === 0);

  const enrichedRows: EnrichedRow[] = list.map((r, idx: number) => {
    const position = toNumber(r.position ?? r.rank ?? idx + 1, idx + 1);
    const inferredClubId = r.clubId ?? r.club_id ?? r.club?.id ?? r.teamId ?? r.team_id ?? r.team?.id;
    const teamName = String(
      clubsMap?.[String(inferredClubId ?? '')]
      ?? r.short_name
      ?? r.shortName
      ?? r.teamName
      ?? r.team?.shortName
      ?? r.team?.name
      ?? r.team?.fullName
      ?? r.clubName
      ?? r.club?.shortName
      ?? r.club?.short_name
      ?? r.club?.name
      ?? r.club?.originalName
      ?? r.club?.fullName
      ?? r.club?.longName
      ?? r.club?.officialName
      ?? r.team
      ?? r.club
      ?? (inferredClubId ? `#${inferredClubId}` : '—')
    );

    const pts = (viewType === 'home')
      ? Number(getAny(r, ['home_points', 'homePoints', 'home_pts', 'homePts', 'homePointsTotal', 'home_points_total']) ?? getAny(r, ['points', 'pts']) ?? 0)
      : (viewType === 'away')
        ? Number(getAny(r, ['away_points', 'awayPoints', 'away_pts', 'awayPts', 'awayPointsTotal', 'away_points_total']) ?? getAny(r, ['points', 'pts']) ?? 0)
        : Number(getAny(r, ['points', 'pts']) ?? 0);

    const pl = (viewType === 'home')
      ? Number(getAny(r, ['home_games_played', 'homeGamesPlayed', 'home_games', 'home_played', 'homePlayed', 'homePl']) ?? getAny(r, ['pl', 'played', 'playedGames']) ?? 0)
      : (viewType === 'away')
        ? Number(getAny(r, ['away_games_played', 'awayGamesPlayed', 'away_games', 'away_played', 'awayPlayed', 'awayPl']) ?? getAny(r, ['pl', 'played', 'playedGames']) ?? 0)
        : Number(getAny(r, ['pl', 'played', 'playedGames']) ?? 0);

    const w = (viewType === 'home')
      ? Number(getAny(r, ['home_w', 'homeWins', 'home_wins']) ?? getAny(r, ['w', 'wins']) ?? 0)
      : (viewType === 'away')
        ? Number(getAny(r, ['away_w', 'awayWins', 'away_wins']) ?? getAny(r, ['w', 'wins']) ?? 0)
        : Number(getAny(r, ['w', 'wins']) ?? 0);

    const d = (viewType === 'home')
      ? Number(getAny(r, ['home_d', 'homeDraws', 'home_draws']) ?? getAny(r, ['d', 'draws']) ?? 0)
      : (viewType === 'away')
        ? Number(getAny(r, ['away_d', 'awayDraws', 'away_draws']) ?? getAny(r, ['d', 'draws']) ?? 0)
        : Number(getAny(r, ['d', 'draws']) ?? 0);

    const l = (viewType === 'home')
      ? Number(getAny(r, ['home_l', 'homeLosses', 'home_losses']) ?? getAny(r, ['l', 'losses']) ?? 0)
      : (viewType === 'away')
        ? Number(getAny(r, ['away_l', 'awayLosses', 'away_losses']) ?? getAny(r, ['l', 'losses']) ?? 0)
        : Number(getAny(r, ['l', 'losses']) ?? 0);

    const gf = (viewType === 'home')
      ? Number(getAny(r, ['home_gf', 'homeGoalsFor', 'home_goals_for', 'homeGoals']) ?? getAny(r, ['gf', 'goalsFor']) ?? 0)
      : (viewType === 'away')
        ? Number(getAny(r, ['away_gf', 'awayGoalsFor', 'away_goals_for', 'awayGoals']) ?? getAny(r, ['gf', 'goalsFor']) ?? 0)
        : Number(getAny(r, ['gf', 'goalsFor']) ?? 0);

    const ga = (viewType === 'home')
      ? Number(getAny(r, ['home_ga', 'homeGoalsAgainst', 'home_goals_against']) ?? getAny(r, ['ga', 'goalsAgainst']) ?? 0)
      : (viewType === 'away')
        ? Number(getAny(r, ['away_ga', 'awayGoalsAgainst', 'away_goals_against']) ?? getAny(r, ['ga', 'goalsAgainst']) ?? 0)
        : Number(getAny(r, ['ga', 'goalsAgainst']) ?? 0);

    const gd = toNumber(r.gd ?? r.goalDifference ?? (gf - ga), gf - ga);
    const rawPct = getAny(r, ['pct', 'percentage', 'winPercent', 'winningPercentage', 'win_percentage', 'winPct']);
    const pct = isBasketball
      ? formatBasketballPct(rawPct, w, pl)
      : formatStandardPct(rawPct, w, pl);
    const last5History = Array.isArray((r.last5 as LooseObject | undefined)?.history)
      ? ((r.last5 as LooseObject).history as unknown[])
      : [];
    let last5: Last5Entry[] = Array.isArray(r.last5)
      ? r.last5.map((x: unknown) => ({ result: String(x) }))
      : (last5History.length > 0
        ? last5History.map((x: unknown) => ({ result: String(x) }))
        : (r.last5String ? String(r.last5).split('').map((x: string) => ({ result: String(x) })) : []));
    let last10 = toLast10Record(r.last10, r);
    let streakDisplay = String(getAny(r, ['streak', 'currentStreak', 'strk', 'streakDisplay']) ?? '').trim();

    try {
      if (inferredClubId) {
        const clubId = Number(inferredClubId);
        const isFinished = (m: MatchLike) => {
          const s = String(m.status ?? m.matchStatus ?? '').toLowerCase();
          return s === 'finished' || s === 'ft' || s === 'complete' || s === 'completed';
        };
        const hasScore = (m: MatchLike) => isFinished(m) && Number.isFinite(Number(m.homeScore)) && Number.isFinite(Number(m.awayScore));
        const combined: MatchLike[] = [];
        if (Array.isArray(historicalMatches)) combined.push(...historicalMatches);
        if (Array.isArray(currentMatches)) combined.push(...currentMatches);
        const byKey: Record<string, MatchLike> = {};
        combined.forEach((m: MatchLike) => {
          const id = m.id ?? m.matchId ?? m.match_id;
          const home = m.homeClubId ?? m.homeClub?.id ?? m.homeClubId;
          const away = m.awayClubId ?? m.awayClub?.id ?? m.awayClubId;
          const date = m.date ?? m.matchDate ?? m.datetime ?? m.dateTime ?? '';
          const key = id ? `id:${id}` : `k:${home || ''}-${away || ''}-${date}`;
          if (!byKey[key]) byKey[key] = m;
        });
        const allForClub = Object.values(byKey).filter((m: MatchLike) => {
          const hid = m.homeClubId ?? m.homeClub?.id ?? m.homeClubId;
          const aid = m.awayClubId ?? m.awayClub?.id ?? m.awayClubId;
          return Number(hid) === clubId || Number(aid) === clubId;
        });
        const currentIds = new Set((Array.isArray(currentMatches) ? currentMatches : []).map((m: MatchLike) => m.id ?? m.matchId ?? m.match_id).filter(Boolean));
        const filteredByDate = allForClub.filter((m: MatchLike) => {
          const dte = m.date ?? m.matchDate ?? m.datetime ?? m.dateTime;
          if (!dte) {
            const mid = m.id ?? m.matchId ?? m.match_id;
            return mid ? currentIds.has(mid) : true;
          }
          if (!cutoffDate) return true;
          try {
            if (currentIds.has(m.id ?? m.matchId ?? m.match_id)) return true;
            const matchDateInput = toDateInput(dte);
            const cutoffDateInput = toDateInput(cutoffDate);
            if (!matchDateInput || !cutoffDateInput) return false;
            return new Date(matchDateInput) <= new Date(cutoffDateInput);
          } catch {
            return false;
          }
        });
        const scored = filteredByDate.filter((m: MatchLike) => hasScore(m));
        const sorted = scored.slice().sort((a: MatchLike, b: MatchLike) => {
          const aDate = toDateInput(a.date ?? a.matchDate ?? a.datetime ?? a.dateTime);
          const bDate = toDateInput(b.date ?? b.matchDate ?? b.datetime ?? b.dateTime);
          const da = aDate ? new Date(aDate).getTime() || 0 : 0;
          const db = bDate ? new Date(bDate).getTime() || 0 : 0;
          return da - db;
        });
        const last = sorted.slice(-10);
        let w10 = 0; let d10 = 0; let l10 = 0;
        last.forEach((m: MatchLike) => {
          const result = toBasketballResult(clubId, m);
          if (result === 'W') w10 += 1;
          else if (result === 'L') l10 += 1;
          else if (result === 'D') d10 += 1;
        });
        last10 = { w: w10, d: d10, l: l10 };

        const last5Candidates = sorted.slice(-5);
        const last5Objs: Last5Entry[] = last5Candidates.map((m: MatchLike) => {
          const hs = Number(m.homeScore);
          const as = Number(m.awayScore);
          const homeObj = (m.home && typeof m.home === 'object' ? m.home : undefined) as LooseObject | undefined;
          const awayObj = (m.away && typeof m.away === 'object' ? m.away : undefined) as LooseObject | undefined;
          const homeClubObj = (m.homeClub && typeof m.homeClub === 'object' ? m.homeClub : undefined) as LooseObject | undefined;
          const awayClubObj = (m.awayClub && typeof m.awayClub === 'object' ? m.awayClub : undefined) as LooseObject | undefined;
          const roundObj = (m.round && typeof m.round === 'object' ? m.round : undefined) as LooseObject | undefined;
          const stadiumObj = (m.stadium && typeof m.stadium === 'object' ? m.stadium : undefined) as LooseObject | undefined;
          return {
            result: toBasketballResult(clubId, m),
            homeShortName: m.homeShortName ?? getAny(homeObj, ['short_name', 'shortName', 'name']) ?? m.homeName ?? m.homeClubName ?? getAny(homeClubObj, ['name']),
            awayShortName: m.awayShortName ?? getAny(awayObj, ['short_name', 'shortName', 'name']) ?? m.awayName ?? m.awayClubName ?? getAny(awayClubObj, ['name']),
            homeScore: hs,
            awayScore: as,
            roundNumber: m.roundNumber ?? getAny(roundObj, ['roundNumber']) ?? m.round ?? m.roundName ?? null,
            stadiumName: m.stadiumName ?? getAny(stadiumObj, ['name']) ?? null,
            date: m.date ?? m.matchDate ?? m.datetime ?? m.dateTime ?? null,
            homeImage: m.homeImage ?? getAny(homeObj, ['imageUrl', 'image_url', 'logoUrl']) ?? getAny(homeClubObj, ['imageUrl', 'logo']),
            awayImage: m.awayImage ?? getAny(awayObj, ['imageUrl', 'image_url', 'logoUrl']) ?? getAny(awayClubObj, ['imageUrl', 'logo']),
          };
        });
        const pad = Math.max(0, 5 - last5Objs.length);
        last5 = Array(pad).fill({ result: '' }).concat(last5Objs);

        if (!streakDisplay && sorted.length > 0) {
          const reversed = sorted.slice().reverse();
          const firstResult = toBasketballResult(clubId, reversed[0]);
          if (firstResult === 'W' || firstResult === 'L') {
            let streakCount = 0;
            for (const match of reversed) {
              const result = toBasketballResult(clubId, match);
              if (result !== firstResult) break;
              streakCount += 1;
            }
            streakDisplay = `${firstResult}${streakCount}`;
          }
        }
      }
    } catch {
      // fallback to provided values on error
    }

    const homeWins = Number(getAny(r, ['home_w', 'homeWins', 'home_wins']) ?? 0);
    const homeLosses = Number(getAny(r, ['home_l', 'homeLosses', 'home_losses']) ?? 0);
    const awayWins = Number(getAny(r, ['away_w', 'awayWins', 'away_wins']) ?? 0);
    const awayLosses = Number(getAny(r, ['away_l', 'awayLosses', 'away_losses']) ?? 0);
    const overtimeWins = Number(getAny(r, ['overtime_wins', 'overtimeWins']) ?? 0);
    const overtimeLosses = Number(getAny(r, ['overtime_losses', 'overtimeLosses']) ?? 0);

    return {
      raw: r,
      position,
      inferredClubId,
      teamName,
      pts,
      pl,
      w,
      d,
      l,
      gf,
      ga,
      gd,
      pct,
      last5,
      last10,
      streakDisplay,
      basketball: {
        homeRecord: formatBasketballRecord(homeWins, homeLosses),
        awayRecord: formatBasketballRecord(awayWins, awayLosses),
        otRecord: formatBasketballRecord(overtimeWins, overtimeLosses),
      },
    };
  });

  const sortedList = enrichedRows;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden p-4">
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden p-4">
        <div className="text-sm text-red-600">{error}</div>
        {onRetry && (
          <button onClick={onRetry} className="mt-3 inline-block px-3 py-1 bg-blue-600 text-white rounded">Retry</button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto overflow-visible">
        <table className={clsx('w-full table-fixed', isBasketball ? 'min-w-[900px]' : 'min-w-[900px]')}>
        <thead>
          {isBasketball ? (
            <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
              <th className={clsx('w-10 px-5 py-5 font-normal', shouldShadeCol(0) && 'bg-gray-50')}>#</th>
              <th className={clsx('px-3 py-3 font-normal', shouldShadeCol(1) && 'bg-gray-50')}>{teamHeaderLabel ?? 'TEAM'}</th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(2) && 'bg-gray-50')}><Tooltip label="Played">Pl</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(3) && 'bg-gray-50')}><Tooltip label="Wins">W</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(4) && 'bg-gray-50')}><Tooltip label="Losses">L</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(5) && 'bg-gray-50')}><Tooltip label="Winning percentage">%</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(6) && 'bg-gray-50')}><Tooltip label="Games behind">GB</Tooltip></th>
              <th className={clsx('w-16 px-3 py-3 text-center font-normal', shouldShadeCol(7) && 'bg-gray-50')}><Tooltip label="Home record">HOME</Tooltip></th>
              <th className={clsx('w-16 px-3 py-3 text-center font-normal', shouldShadeCol(8) && 'bg-gray-50')}><Tooltip label="Away record">AWAY</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(9) && 'bg-gray-50')}><Tooltip label="Overtime record">OT</Tooltip></th>
              <th className={clsx('w-40 px-3 py-3 text-center font-normal', shouldShadeCol(10) && 'bg-gray-50')}><Last5Header /></th>
              <th className={clsx('w-20 px-3 py-3 text-center font-normal', shouldShadeCol(11) && 'bg-gray-50')}><Tooltip label="Record in the last 10 games">LAST 10</Tooltip></th>
              <th className={clsx('w-16 px-3 py-3 text-center font-normal', shouldShadeCol(12) && 'bg-gray-50')}><Tooltip label="Streak">STRK</Tooltip></th>
            </tr>
          ) : (
            <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
              <th className={clsx('w-10 px-5 py-5 font-normal', shouldShadeCol(0) && 'bg-gray-50')}>#</th>
              <th className={clsx('px-3 py-3 font-normal', shouldShadeCol(1) && 'bg-gray-50')}>{teamHeaderLabel ?? 'TEAM'}</th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(2) && 'bg-gray-50')}><Tooltip label="Points">Pts</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(3) && 'bg-gray-50')}><Tooltip label="Played">Pl</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(4) && 'bg-gray-50')}><Tooltip label="Won">W</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(5) && 'bg-gray-50')}><Tooltip label="Drawn">D</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(6) && 'bg-gray-50')}><Tooltip label="Lost">L</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(7) && 'bg-gray-50')}><Tooltip label="Goals For">GF</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(8) && 'bg-gray-50')}><Tooltip label="Goals Against">GA</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(9) && 'bg-gray-50')}><Tooltip label="Goal Difference">GD</Tooltip></th>
              <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(10) && 'bg-gray-50')}><Tooltip label="Percentage">%</Tooltip></th>
              <th className={clsx('w-40 px-3 py-3 text-center font-normal', shouldShadeCol(11) && 'bg-gray-50')}><Last5Header /></th>
              <th className={clsx('w-28 px-3 py-3 text-center font-normal', shouldShadeCol(12) && 'bg-gray-50')}><Tooltip label="Last 10 results">LAST 10</Tooltip></th>
            </tr>
          )}
        </thead>
        <tbody>
          {sortedList.map((r: EnrichedRow, idx: number) => {
            const position = idx + 1;
            const teamName = r.teamName;
            const pts = r.pts;
            const pl = r.pl;
            const w = r.w;
            const d = r.d;
            const l = r.l;
            const gf = r.gf;
            const ga = r.ga;
            const gd = r.gd;
            const pct = r.pct;
            const last5 = r.last5;
            const last10 = r.last10;
            const firstPlaceWins = Math.max(...sortedList.map((row: EnrichedRow) => Number(row.w ?? 0)), 0);
            const gb = Math.max(0, firstPlaceWins - Number(w ?? 0));

            const rowKey = String(r.inferredClubId ?? r.teamName ?? position);

            return (
              <tr key={rowKey} className="border-b border-gray-100 hover:bg-gray-50">
                {isBasketball ? (
                  <>
                    <td className={clsx('px-3 py-3 text-sm text-gray-800 text-center', shouldShadeCol(0) && 'bg-gray-50')} style={ positionColorMap && positionColorMap[position] ? { borderLeftStyle: 'solid', borderLeftWidth: '3px', borderLeftColor: positionColorMap[position] } : undefined }>{position}</td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-800', shouldShadeCol(1) && 'bg-gray-50')}>{teamName}</td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(2) && 'bg-gray-50')}>{pl}</td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(3) && 'bg-gray-50')}>{w}</td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(4) && 'bg-gray-50')}>{l}</td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(5) && 'bg-gray-50')}>{pct}</td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(6) && 'bg-gray-50')}>{gb}</td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(7) && 'bg-gray-50')}>{r.basketball.homeRecord}</td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(8) && 'bg-gray-50')}>{r.basketball.awayRecord}</td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(9) && 'bg-gray-50')}>{r.basketball.otRecord}</td>
                    <td className={clsx('px-3 py-3', shouldShadeCol(10) && 'bg-gray-50')}>
                      <div className="flex gap-2">
                        {(last5 || []).map((c: Last5Entry, i: number) => {
                          let char = String(c);
                          let tooltipNode: React.ReactNode | null = null;
                          if (typeof c === 'object' && c !== null) {
                            const homeObj = (c.home && typeof c.home === 'object' ? c.home : undefined) as LooseObject | undefined;
                            const awayObj = (c.away && typeof c.away === 'object' ? c.away : undefined) as LooseObject | undefined;
                            const homeClubObj = (c.homeClub && typeof c.homeClub === 'object' ? c.homeClub : undefined) as LooseObject | undefined;
                            const awayClubObj = (c.awayClub && typeof c.awayClub === 'object' ? c.awayClub : undefined) as LooseObject | undefined;
                            const roundObj = (c.round && typeof c.round === 'object' ? c.round : undefined) as LooseObject | undefined;
                            const stadiumObj = (c.stadium && typeof c.stadium === 'object' ? c.stadium : undefined) as LooseObject | undefined;
                            const home = toDisplayString(c.homeShortName ?? getAny(homeObj, ['short_name', 'shortName', 'name']) ?? c.homeName ?? c.homeClubName ?? getAny(homeClubObj, ['name']));
                            const away = toDisplayString(c.awayShortName ?? getAny(awayObj, ['short_name', 'shortName', 'name']) ?? c.awayName ?? c.awayClubName ?? getAny(awayClubObj, ['name']));
                            const homeScore = toDisplayString(c.homeScore ?? c.home_score ?? getAny(homeObj, ['score', 'goals']) ?? c.homeGoals, '');
                            const awayScore = toDisplayString(c.awayScore ?? c.away_score ?? getAny(awayObj, ['score', 'goals']) ?? c.awayGoals, '');
                            const roundNum = toDisplayString(c.roundNumber ?? getAny(roundObj, ['roundNumber']) ?? c.round ?? c.roundName, '');
                            const stadium = toDisplayString(c.stadiumName ?? getAny(stadiumObj, ['name']) ?? c.stadium, '');
                            const dateInput = toDateInput(c.date ?? c.matchDate ?? c.datetime ?? c.dateTime);
                            const homeImage = toDisplayString(c.homeImage ?? getAny(homeObj, ['imageUrl', 'image_url', 'logoUrl']) ?? getAny(homeClubObj, ['imageUrl', 'logo']));
                            const awayImage = toDisplayString(c.awayImage ?? getAny(awayObj, ['imageUrl', 'image_url', 'logoUrl']) ?? getAny(awayClubObj, ['imageUrl', 'logo']));
                            char = (c.result ?? c.outcome ?? c.label ?? String(c.resultSymbol ?? c.symbol ?? char)).toString().charAt(0) || String(char);
                            tooltipNode = (
                              <div className="text-center">
                                <div className="text-xs text-gray-600">
                                  {roundNum ? `R${roundNum}` : ''}{roundNum && stadium ? ' · ' : ''}{stadium}{(roundNum || stadium) && dateInput ? ' · ' : ''}{dateInput ? new Date(dateInput).toLocaleString() : ''}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{toDisplayNode(home)}</span>
                                    {homeImage ? <img src={homeImage} alt={home || 'home'} className="w-4 h-4 object-cover rounded"/> : null}
                                  </div>
                                  <div className="text-sm font-medium">{toDisplayNode(homeScore)}</div>
                                  <div className="text-sm">-</div>
                                  <div className="text-sm font-medium">{toDisplayNode(awayScore)}</div>
                                  <div className="flex items-center gap-2">
                                    {awayImage ? <img src={awayImage} alt={away || 'away'} className="w-4 h-4 object-cover rounded"/> : null}
                                    <span className="text-sm">{toDisplayNode(away)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          } else if (typeof c === 'string' && c.length === 1) {
                            char = c;
                          }
                          const fallbackTooltip = `Last 5: ${(Array.isArray(last5) ? last5.map((entry: Last5Entry) => (typeof entry === 'object' ? (entry.result ?? '') : String(entry))).join(' ') : '')}`;
                          return <div key={i} className="w-5 h-5"><Last5Chip c={char} tooltip={tooltipNode ?? (fallbackTooltip || undefined)} /></div>;
                        })}
                      </div>
                    </td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(11) && 'bg-gray-50')}>{Number(last10?.d ?? 0) > 0 ? `${last10?.w ?? 0}-${last10?.d ?? 0}-${last10?.l ?? 0}` : `${last10?.w ?? 0}-${last10?.l ?? 0}`}</td>
                    <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(12) && 'bg-gray-50')}>{r.streakDisplay || '—'}</td>
                  </>
                ) : (
                  <>
                  <td className={clsx('px-3 py-3 text-sm text-gray-800 text-center', shouldShadeCol(0) && 'bg-gray-50')} style={ positionColorMap && positionColorMap[position] ? { borderLeftStyle: 'solid', borderLeftWidth: '3px', borderLeftColor: positionColorMap[position] } : undefined }>{position}</td>
                  <td className={clsx('px-3 py-3 text-sm text-gray-800', shouldShadeCol(1) && 'bg-gray-50')}>{teamName}</td>
                  <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(2) && 'bg-gray-50')}>{pts}</td>
                  <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(3) && 'bg-gray-50')}>{pl}</td>
                  <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(4) && 'bg-gray-50')}>{w}</td>
                  <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(5) && 'bg-gray-50')}>{d}</td>
                  <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(6) && 'bg-gray-50')}>{l}</td>
                  <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(7) && 'bg-gray-50')}>{gf}</td>
                  <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(8) && 'bg-gray-50')}>{ga}</td>
                  <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(9) && 'bg-gray-50')}>{gd}</td>
                  <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(10) && 'bg-gray-50')}>{pct}%</td>
                  <td className={clsx('px-3 py-3', shouldShadeCol(11) && 'bg-gray-50')}>
                    <div className="flex gap-2">
                      {(last5 || []).map((c: Last5Entry, i: number) => {
                        // c may be a simple char 'W'/'D'/'L' or a detailed object with match info
                        let char = String(c);
                        let tooltipNode: React.ReactNode | null = null;
                        if (typeof c === 'object' && c !== null) {
                          // try to extract match info
                          const homeObj = (c.home && typeof c.home === 'object' ? c.home : undefined) as LooseObject | undefined;
                          const awayObj = (c.away && typeof c.away === 'object' ? c.away : undefined) as LooseObject | undefined;
                          const homeClubObj = (c.homeClub && typeof c.homeClub === 'object' ? c.homeClub : undefined) as LooseObject | undefined;
                          const awayClubObj = (c.awayClub && typeof c.awayClub === 'object' ? c.awayClub : undefined) as LooseObject | undefined;
                          const roundObj = (c.round && typeof c.round === 'object' ? c.round : undefined) as LooseObject | undefined;
                          const stadiumObj = (c.stadium && typeof c.stadium === 'object' ? c.stadium : undefined) as LooseObject | undefined;
                          const home = toDisplayString(c.homeShortName ?? getAny(homeObj, ['short_name', 'shortName', 'name']) ?? c.homeName ?? c.homeClubName ?? getAny(homeClubObj, ['name']));
                          const away = toDisplayString(c.awayShortName ?? getAny(awayObj, ['short_name', 'shortName', 'name']) ?? c.awayName ?? c.awayClubName ?? getAny(awayClubObj, ['name']));
                          const homeScore = toDisplayString(c.homeScore ?? c.home_score ?? getAny(homeObj, ['score', 'goals']) ?? c.homeGoals, '');
                          const awayScore = toDisplayString(c.awayScore ?? c.away_score ?? getAny(awayObj, ['score', 'goals']) ?? c.awayGoals, '');
                          const roundNum = toDisplayString(c.roundNumber ?? getAny(roundObj, ['roundNumber']) ?? c.round ?? c.roundName, '');
                          const stadium = toDisplayString(c.stadiumName ?? getAny(stadiumObj, ['name']) ?? c.stadium, '');
                          const dateInput = toDateInput(c.date ?? c.matchDate ?? c.datetime ?? c.dateTime);
                          const homeImage = toDisplayString(c.homeImage ?? getAny(homeObj, ['imageUrl', 'image_url', 'logoUrl']) ?? getAny(homeClubObj, ['imageUrl', 'logo']));
                          const awayImage = toDisplayString(c.awayImage ?? getAny(awayObj, ['imageUrl', 'image_url', 'logoUrl']) ?? getAny(awayClubObj, ['imageUrl', 'logo']));

                          char = (c.result ?? c.outcome ?? c.label ?? String(c.resultSymbol ?? c.symbol ?? char)).toString().charAt(0) || String(char);

                          // Build a two-line tooltip: first line (round / stadium / date), second line (home img, home short, score - score, away img, away short)
                          tooltipNode = (
                            <div className="text-center">
                              <div className="text-xs text-gray-600">
                                {roundNum ? `R${roundNum}` : ''}{roundNum && stadium ? ' · ' : ''}{stadium}{(roundNum || stadium) && dateInput ? ' · ' : ''}{dateInput ? new Date(dateInput).toLocaleString() : ''}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{toDisplayNode(home)}</span>
                                  {homeImage ? <img src={homeImage} alt={home || 'home'} className="w-4 h-4 object-cover rounded"/> : null}
                                </div>
                                <div className="text-sm font-medium">{toDisplayNode(homeScore)}</div>
                                <div className="text-sm">-</div>
                                <div className="text-sm font-medium">{toDisplayNode(awayScore)}</div>
                                <div className="flex items-center gap-2">
                                  {awayImage ? <img src={awayImage} alt={away || 'away'} className="w-4 h-4 object-cover rounded"/> : null}
                                  <span className="text-sm">{toDisplayNode(away)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        } else if (typeof c === 'string' && c.length === 1) {
                          char = c;
                        }

                        const fallbackTooltip = `Last 5: ${(Array.isArray(last5) ? last5.map((entry: Last5Entry) => (typeof entry === 'object' ? (entry.result ?? '') : String(entry))).join(' ') : '')}`;
                        return (
                          <div key={i} className="w-5 h-5"> <Last5Chip c={char} tooltip={tooltipNode ?? (fallbackTooltip || undefined)} /> </div>
                        );
                      })}
                    </div>
                </td>
                <td className={clsx('px-3 py-3 text-sm text-gray-700 text-center', shouldShadeCol(12) && 'bg-gray-50')}>{`${last10?.w ?? 0}-${last10?.d ?? 0}-${last10?.l ?? 0}`}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
