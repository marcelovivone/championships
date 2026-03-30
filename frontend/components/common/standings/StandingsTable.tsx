"use client";

import React from 'react';
import clsx from 'clsx';
import Tooltip from '../ui/Tooltip';

type Row = {
  position: number;
  teamName: string;
  pts: number;
  pl: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pct: number;
  last5: string[];
  last10: { w: number; d: number; l: number };
};

function Last5Chip({ c, tooltip }: { c: string; tooltip?: string | null }) {
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

export default function StandingsTable({ rows, isLoading, error, onRetry, clubsMap, historicalMatches, cutoffDate, currentMatches, viewType }: { rows?: any[]; isLoading?: boolean; error?: string | null; onRetry?: () => void; clubsMap?: Record<string,string>; historicalMatches?: any[]; cutoffDate?: string | undefined; currentMatches?: any[]; viewType?: 'all'|'home'|'away' }) {
  const list = Array.isArray(rows) ? rows : [];
  const getAny = (obj: any, names: string[]) => {
    for (const n of names) {
      if (typeof obj[n] !== 'undefined' && obj[n] !== null) return obj[n];
    }
    return undefined;
  };

  // Columns: 0=#,1=TEAM,2=Pts,3=Pl,4=W,5=D,6=L,7=GF,8=GA,9=GD,10=%,11=LAST5,12=LAST10
  // Apply zebra (shaded) backgrounds starting at Pts (index 2) and alternating
  const shouldShadeCol = (idx: number) => idx >= 2 && idx <= 10 && ((idx - 2) % 2 === 0);

  // Ensure deterministic ordering: points, wins, goal difference, goals for
  const sortedList = [...list].sort((a: any, b: any) => {
    const getEffective = (r: any) => {
      const pts = (viewType === 'home')
        ? Number(getAny(r, ['home_points', 'homePoints', 'home_pts', 'homePts']) ?? getAny(r, ['points', 'pts']) ?? 0)
        : (viewType === 'away')
          ? Number(getAny(r, ['away_points', 'awayPoints', 'away_pts', 'awayPts']) ?? getAny(r, ['points', 'pts']) ?? 0)
          : Number(getAny(r, ['points', 'pts']) ?? 0);

      const w = (viewType === 'home')
        ? Number(getAny(r, ['home_w', 'homeWins', 'home_wins', 'homeWins']) ?? getAny(r, ['w', 'wins']) ?? 0)
        : (viewType === 'away')
          ? Number(getAny(r, ['away_w', 'awayWins', 'away_wins']) ?? getAny(r, ['w', 'wins']) ?? 0)
          : Number(getAny(r, ['w', 'wins']) ?? 0);

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

      const gd = Number((getAny(r, ['gd', 'goalDifference']) ?? (gf - ga)) || 0);
      return { pts: Number(pts || 0), w: Number(w || 0), gd: Number(gd || 0), gf: Number(gf || 0) };
    };

    const A = getEffective(a);
    const B = getEffective(b);
    if (B.pts !== A.pts) return B.pts - A.pts;
    if (B.w !== A.w) return B.w - A.w;
    if (B.gd !== A.gd) return B.gd - A.gd;
    if (B.gf !== A.gf) return B.gf - A.gf;
    return 0;
  });

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
        <table className="min-w-[900px] w-full table-fixed">
        <thead>
          <tr className="text-left text-sm text-gray-600 border-b border-gray-200">
            <th className={clsx('w-10 px-5 py-5 font-normal', shouldShadeCol(0) && 'bg-gray-50')}>#</th>
            <th className={clsx('px-3 py-3 font-normal', shouldShadeCol(1) && 'bg-gray-50')}>TEAM</th>
            <th className={clsx('w-16 px-3 py-3 text-center font-normal', shouldShadeCol(2) && 'bg-gray-50')}><Tooltip label="Points">Pts</Tooltip></th>
            <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(3) && 'bg-gray-50')}><Tooltip label="Played">Pl</Tooltip></th>
            <th className={clsx('w-10 px-3 py-3 text-center font-normal', shouldShadeCol(4) && 'bg-gray-50')}><Tooltip label="Won">W</Tooltip></th>
            <th className={clsx('w-10 px-3 py-3 text-center font-normal', shouldShadeCol(5) && 'bg-gray-50')}><Tooltip label="Drawn">D</Tooltip></th>
            <th className={clsx('w-10 px-3 py-3 text-center font-normal', shouldShadeCol(6) && 'bg-gray-50')}><Tooltip label="Lost">L</Tooltip></th>
            <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(7) && 'bg-gray-50')}><Tooltip label="Goals For">GF</Tooltip></th>
            <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(8) && 'bg-gray-50')}><Tooltip label="Goals Against">GA</Tooltip></th>
            <th className={clsx('w-12 px-3 py-3 text-center font-normal', shouldShadeCol(9) && 'bg-gray-50')}><Tooltip label="Goal Difference">GD</Tooltip></th>
            <th className={clsx('w-14 px-3 py-3 text-center font-normal', shouldShadeCol(10) && 'bg-gray-50')}><Tooltip label="Percentage">%</Tooltip></th>
            <th className={clsx('w-40 px-3 py-3 text-center font-normal', shouldShadeCol(11) && 'bg-gray-50')}><Tooltip label="Last 5 results">LAST 5</Tooltip></th>
            <th className={clsx('w-28 px-3 py-3 text-center font-normal', shouldShadeCol(12) && 'bg-gray-50')}><Tooltip label="Last 10 results">LAST 10</Tooltip></th>
          </tr>
        </thead>
        <tbody>
          {sortedList.map((r: any, idx: number) => {
            const position = r.position ?? r.rank ?? idx + 1;
            const inferredClubId = r.clubId ?? r.club_id ?? r.club?.id ?? r.teamId ?? r.team_id ?? r.team?.id;
            const teamName = clubsMap?.[String(inferredClubId ?? '')]
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
              ?? (inferredClubId ? `#${inferredClubId}` : '—');
            const getAny = (obj: any, names: string[]) => {
              for (const n of names) {
                if (typeof obj[n] !== 'undefined' && obj[n] !== null) return obj[n];
              }
              return undefined;
            };

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
              ? Number(getAny(r, ['home_w', 'homeWins', 'home_wins', 'homeWins']) ?? getAny(r, ['w', 'wins']) ?? 0)
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
            const gd = r.gd ?? r.goalDifference ?? (gf - ga);
            // Percentage: points earned against maximum possible points (played * pointsPerWin)
            const rawPct = r.pct ?? r.percentage;
            const inferredPointsPerWin = r.pointsPerWin ?? r.winPoints ?? r.points_for_win ?? 3;
            const pct = (typeof rawPct === 'number' && rawPct >= 0)
              ? rawPct
              : (pl > 0 ? Math.round((pts / (pl * Number(inferredPointsPerWin || 3))) * 100) : 0);
            let last5: string[] = Array.isArray(r.last5) ? r.last5.map((x: any) => String(x)) : (Array.isArray(r.last5?.history) ? r.last5.history.map((x: any) => String(x)) : (r.last5String ? String(r.last5).split('') : []));
            // compute last10 from historicalMatches if provided
            let last10 = r.last10 ?? { w: r.winsLast10 ?? 0, d: r.drawsLast10 ?? 0, l: r.lossesLast10 ?? 0 };
            try {
              if (inferredClubId) {
                const clubId = Number(inferredClubId);
                const isFinished = (m: any) => {
                  const s = String(m.status ?? m.matchStatus ?? '').toLowerCase();
                  return s === 'finished' || s === 'ft' || s === 'complete' || s === 'completed';
                };
                const hasScore = (m: any) => isFinished(m) && Number.isFinite(Number(m.homeScore)) && Number.isFinite(Number(m.awayScore));
                const combined: any[] = [];
                if (Array.isArray(historicalMatches)) combined.push(...historicalMatches);
                if (Array.isArray(currentMatches)) combined.push(...currentMatches);

                // dedupe by id or composite key
                const byKey: Record<string, any> = {};
                combined.forEach((m: any) => {
                  const id = m.id ?? m.matchId ?? m.match_id;
                  const home = m.homeClubId ?? m.homeClub?.id ?? m.homeClubId;
                  const away = m.awayClubId ?? m.awayClub?.id ?? m.awayClubId;
                  const date = m.date ?? m.matchDate ?? m.datetime ?? m.dateTime ?? '';
                  const key = id ? `id:${id}` : `k:${home || ''}-${away || ''}-${date}`;
                  if (!byKey[key]) byKey[key] = m;
                });

                const allForClub = Object.values(byKey).filter((m: any) => {
                  const hid = m.homeClubId ?? m.homeClub?.id ?? m.homeClubId;
                  const aid = m.awayClubId ?? m.awayClub?.id ?? m.awayClubId;
                  return Number(hid) === clubId || Number(aid) === clubId;
                });

                const currentIds = new Set((Array.isArray(currentMatches) ? currentMatches : []).map((m: any) => m.id ?? m.matchId ?? m.match_id).filter(Boolean));

                const filteredByDate = allForClub.filter((m: any) => {
                  const d = m.date ?? m.matchDate ?? m.datetime ?? m.dateTime;
                  if (!d) {
                    // include if it's part of currentMatches
                    const mid = m.id ?? m.matchId ?? m.match_id;
                    return mid ? currentIds.has(mid) : true;
                  }
                  if (!cutoffDate) return true;
                  try {
                    if (currentIds.has(m.id ?? m.matchId ?? m.match_id)) return true;
                    return new Date(d) <= new Date(cutoffDate);
                  } catch (e) { return false; }
                });

                // only consider matches with scores
                const scored = filteredByDate.filter((m: any) => hasScore(m));
                // sort by date ascending
                const sorted = scored.slice().sort((a: any, b: any) => {
                  const da = new Date(a.date ?? a.matchDate ?? a.datetime ?? a.dateTime).getTime() || 0;
                  const db = new Date(b.date ?? b.matchDate ?? b.datetime ?? b.dateTime).getTime() || 0;
                  return da - db;
                });
                const last = sorted.slice(-10);
                let w10 = 0; let d10 = 0; let l10 = 0;
                last.forEach((m: any) => {
                  const home = Number(m.homeClubId ?? m.homeClub?.id ?? m.homeClubId);
                  const away = Number(m.awayClubId ?? m.awayClub?.id ?? m.awayClubId);
                  const hs = Number(m.homeScore);
                  const as = Number(m.awayScore);
                  if (hs === as) d10++;
                  else {
                    const isWin = (clubId === home && hs > as) || (clubId === away && as > hs);
                    if (isWin) w10++; else l10++;
                  }
                });
                last10 = { w: w10, d: d10, l: l10 };
                // compute last5: take up to 5 most recent scored matches (oldest->newest), map to W/D/L, pad to length 5
                try {
                  const last5Candidates = sorted.slice(-5);
                  const last5Chars = last5Candidates.map((m: any) => {
                    const home = Number(m.homeClubId ?? m.homeClub?.id ?? m.homeClubId);
                    const away = Number(m.awayClubId ?? m.awayClub?.id ?? m.awayClubId);
                    const hs = Number(m.homeScore);
                    const as = Number(m.awayScore);
                    if (!Number.isFinite(hs) || !Number.isFinite(as)) return '';
                    if (hs === as) return 'D';
                    const isWin = (clubId === home && hs > as) || (clubId === away && as > hs);
                    return isWin ? 'W' : 'L';
                  });
                  const pad = Math.max(0, 5 - last5Chars.length);
                  last5 = Array(pad).fill('').concat(last5Chars);
                } catch (e) {
                  // fallback to any provided last5
                  last5 = Array.isArray(r.last5) ? r.last5.map((x: any) => String(x)) : last5;
                }
              }
            } catch (e) {
              // fallback to provided values on error
            }

            return (
              <tr key={position} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className={clsx('px-3 py-3 text-sm text-gray-700', shouldShadeCol(0) && 'bg-gray-50')}>{position}</td>
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
                  <Tooltip label={Array.isArray(last5) && last5.length ? `Last 5: ${last5.join(' ')}` : ''}>
                    <div className="flex gap-2">
                      {(last5 || []).map((c: any, i: number) => {
                        // c may be a simple char 'W'/'D'/'L' or a detailed object with match info
                        let char = String(c);
                        let tooltipLabel: string | null = null;
                        if (typeof c === 'object' && c !== null) {
                          // try to extract match info
                          const home = c.homeShortName ?? c.home?.short_name ?? c.home?.shortName ?? c.homeName ?? c.home?.name;
                          const away = c.awayShortName ?? c.away?.short_name ?? c.away?.shortName ?? c.awayName ?? c.away?.name;
                          const homeScore = c.homeScore ?? c.home_score ?? c.home?.score ?? c.home?.goals ?? '';
                          const awayScore = c.awayScore ?? c.away_score ?? c.away?.score ?? c.away?.goals ?? '';
                          char = (c.result ?? c.outcome ?? c.label ?? String(c.resultSymbol ?? c.symbol ?? char)).toString().charAt(0) || String(char);
                          if (home || away || homeScore !== '' || awayScore !== '') {
                            tooltipLabel = `${home ?? ''} ${homeScore ?? ''}-${awayScore ?? ''} ${away ?? ''}`.trim();
                          }
                        } else if (typeof c === 'string' && c.length === 1) {
                          char = c;
                        }

                        return (
                          <div key={i} className="w-5 h-5"> <Last5Chip c={char} tooltip={tooltipLabel ?? undefined} /> </div>
                        );
                      })}
                    </div>
                  </Tooltip>
                </td>
                <td className="px-3 py-3 text-sm text-gray-700 text-center">{`${last10?.w ?? 0}-${last10?.d ?? 0}-${last10?.l ?? 0}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
