"use client";
import React from 'react';
import { apiClient } from '@/lib/api/client';

type BracketMatch = {
  id: number;
  homeClubId?: number | null;
  awayClubId?: number | null;
  homeClubPlaceholder?: string | null;
  awayClubPlaceholder?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string | null;
  date?: string | null;
  groupId?: number | null;
//   homeClub?: { shortName?: string | null; name?: string | null } | null;
  homeClub?: { shortName?: string | null; name?: string | null; imageUrl?: string | null } | null;
  awayClub?: { shortName?: string | null; name?: string | null; imageUrl?: string | null } | null;
};

type BracketPhase = {
  phase: string;
  detail: string;
  matches: BracketMatch[];
};

type BracketPayload = {
  regularSeasonStandings?: Array<{
    clubId: number;
    groupId?: number | null;
    position: number;
  }>;
  phases?: BracketPhase[];
  groups?: Array<{
    id: number;
    name: string;
  }>;
};

type Props = {
  bracket: BracketPayload | undefined;
  activePhase: string;
  activePhaseDetail: string;
  sportKey?: string;
};

const PHASE_ORDER = ['Play-ins', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals'];

/** Get NBA-specific display name for playoff phase detail */
export function getNbaPhaseDisplayName(phaseDetail: string): string {
  const mapping: Record<string, string> = {
    'Round of 16': 'First Round',
    'Quarterfinals': 'Conf. Semifinals',
    'Semifinals': 'Conf. Finals',
    'Finals': 'Finals',
  };
  return mapping[phaseDetail] || phaseDetail;
}

/** Get conference name from groupId using the groups data */
function getConferenceName(groupId: number | null, groups?: Array<{ id: number; name: string }>): string {
  if (groupId === null || !groups) return '';
  const group = groups.find((g) => g.id === groupId);
  return group ? group.name.toUpperCase().substring(0, 4) : '';
}

const PHASE_SLOT_COUNTS: Record<string, number | undefined> = {
  'Finals': 1,
  'Semifinals': 2,
  'Quarterfinals': 4,
  'Round of 16': 8,
  'Round of 32': 16,
  'Round of 64': 32,
  // Play-ins: variable, keep as-is (undefined)
};

function getClubLabel(club?: any | null, fallback?: number | null, placeholder?: string | null) {
  if (typeof placeholder === 'string' && placeholder.trim().toUpperCase() === 'TBD') return 'TBD';
  if (!club) return placeholder || (fallback ? `Club ${fallback}` : 'TBD');

  // Prefer short name variants, then display/name variants
  const shortName = club.shortName ?? club.short_name ?? club.short ?? club.reducedName ?? club.reduced_name;
  const displayName = club.displayName ?? club.display_name ?? club.name ?? club.fullName ?? club.full_name ?? club.originalName ?? club.original_name;

  return shortName || displayName || placeholder || (fallback ? `Club ${fallback}` : 'TBD');
}

function getClubDisplayWithSeed(
  club?: { shortName?: string | null; name?: string | null } | null,
  fallback?: number | null,
  placeholder?: string | null,
  seed?: number | undefined,
) {
  const label = getClubLabel(club, fallback, placeholder);
  // If this is a placeholder (e.g., 'TBD'), show only the placeholder without a seed prefix.
  if (typeof label === 'string' && label.trim().toUpperCase() === 'TBD') return 'TBD';
  if (typeof placeholder === 'string' && placeholder.trim().toUpperCase() === 'TBD') return 'TBD';
  return seed != null ? `${seed} ${label}` : label;
}

type Series = {
  id: string;
  homeClubId?: number | null;
  awayClubId?: number | null;
  homePlaceholder?: string | null;
  awayPlaceholder?: string | null;
  matches: BracketMatch[];
  winsById?: Record<string, number>;
  groupId?: number | null;
  earliestDate: string;
};

/** Build series list from a phase's matches. */
function buildSeries(matches: BracketMatch[]): Series[] {
  const seriesMap = new Map<string, Series>();

  const makeKey = (m: BracketMatch) => {
    const a = m.homeClubId ?? null;
    const b = m.awayClubId ?? null;
    if (a != null && b != null) {
      const [min, max] = a < b ? [a, b] : [b, a];
      return `id:${min}_${max}`;
    }
    const aLabel = (m.homeClubPlaceholder ?? m.homeClub?.shortName ?? m.homeClub?.name ?? `club_${m.homeClubId ?? 'tbd'}`) as string;
    const bLabel = (m.awayClubPlaceholder ?? m.awayClub?.shortName ?? m.awayClub?.name ?? `club_${m.awayClubId ?? 'tbd'}`) as string;
    const parts = [aLabel, bLabel].slice().sort();
    return `ph:${parts.join('|')}`;
  };

  (matches || []).forEach((m) => {
    const key = makeKey(m);
    const existing = seriesMap.get(key);
    if (!existing) {
      seriesMap.set(key, {
        id: key,
        homeClubId: m.homeClubId,
        awayClubId: m.awayClubId,
        homePlaceholder: m.homeClubPlaceholder,
        awayPlaceholder: m.awayClubPlaceholder,
        matches: [m],
        winsById: {},
        groupId: (m as any).groupId ?? null,
        earliestDate: m.date ?? '',
      });
    } else {
      existing.matches.push(m);
      if (m.date && m.date < existing.earliestDate) existing.earliestDate = m.date;
    }
  });

  for (const s of seriesMap.values()) {
    s.winsById = s.winsById || {};
    s.matches.forEach((mm) => {
      const hs = typeof mm.homeScore === 'number' ? mm.homeScore : null;
      const as2 = typeof mm.awayScore === 'number' ? mm.awayScore : null;
      if (hs != null && as2 != null) {
        let winnerId: number | null = null;
        if (hs > as2) winnerId = mm.homeClubId ?? null;
        else if (as2 > hs) winnerId = mm.awayClubId ?? null;
        if (winnerId != null) {
          const k = String(winnerId);
          s.winsById![k] = (s.winsById![k] ?? 0) + 1;
        }
      }
    });
  }

  return Array.from(seriesMap.values());
}

/** Get all club ids in a series */
function seriesClubIds(s: Series): number[] {
  const ids: number[] = [];
  if (s.homeClubId != null) ids.push(s.homeClubId);
  if (s.awayClubId != null) ids.push(s.awayClubId);
  return ids;
}

/** Try to find a club display object for a given clubId by scanning series matches */
function findClubInSeries(s: Series, clubId?: number | null) {
  if (clubId == null) return undefined;
  for (const m of s.matches) {
    if (m.homeClubId === clubId && m.homeClub) return m.homeClub;
    if (m.awayClubId === clubId && m.awayClub) return m.awayClub;
  }
  return undefined;
}

/** Search across all phases' matches for a club object with the given id */
function findClubAcrossPhases(phases: BracketPhase[], clubId?: number | null) {
  if (clubId == null) return undefined;
  for (const phase of phases) {
    for (const m of phase.matches || []) {
      if (m.homeClubId === clubId && m.homeClub) return m.homeClub;
      if (m.awayClubId === clubId && m.awayClub) return m.awayClub;
    }
  }
  return undefined;
}

/** Reusable series card */
function SeriesCard({
  s,
  seedMap,
  isSingleMatch,
}: {
  s: Series;
  seedMap: Map<number, number>;
  isSingleMatch?: boolean;
}) {
  const rep = s.matches.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).at(-1)!;
  const homeSeed = rep.homeClubId ? seedMap.get(Number(rep.homeClubId)) : undefined;
  const awaySeed = rep.awayClubId ? seedMap.get(Number(rep.awayClubId)) : undefined;
  const shouldFlip = homeSeed != null && awaySeed != null && awaySeed < homeSeed;
  const single = isSingleMatch ?? s.matches.length === 1;

  let top = shouldFlip
    ? { club: rep.awayClub, seed: awaySeed, score: rep.awayScore, fallbackId: rep.awayClubId, placeholder: rep.awayClubPlaceholder, winsIdx: 1 }
    : { club: rep.homeClub, seed: homeSeed, score: rep.homeScore, fallbackId: rep.homeClubId, placeholder: rep.homeClubPlaceholder, winsIdx: 0 };
  let bottom = shouldFlip
    ? { club: rep.homeClub, seed: homeSeed, score: rep.homeScore, fallbackId: rep.homeClubId, placeholder: rep.homeClubPlaceholder, winsIdx: 0 }
    : { club: rep.awayClub, seed: awaySeed, score: rep.awayScore, fallbackId: rep.awayClubId, placeholder: rep.awayClubPlaceholder, winsIdx: 1 };

  // If the payload for the representative match lacks a club object, try to
  // recover a display name by scanning all matches in the series for any
  // match that includes the desired club object.
  if ((!top.club || (typeof top.club === 'object' && Object.keys(top.club).length === 0)) && top.fallbackId) {
    const found = findClubInSeries(s, top.fallbackId);
    if (found) top = { ...top, club: found };
  }
  if ((!bottom.club || (typeof bottom.club === 'object' && Object.keys(bottom.club).length === 0)) && bottom.fallbackId) {
    const found = findClubInSeries(s, bottom.fallbackId);
    if (found) bottom = { ...bottom, club: found };
  }

  const nextGame = s.matches
    .filter((m) => m.status !== 'Finished')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0] ?? null;
  const lastPlayed = s.matches
    .filter((m) => m.status === 'Finished' || (m.homeScore != null && m.awayScore != null))
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] ?? null;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-0">
      <div className="space-y-2">
        {[top, bottom].map((entry, i) => (
          <div key={`${s.id}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
            <div className="min-w-0 flex items-center gap-1">
              {/* <p className="text-xs text-gray-500">Seed {entry.seed ?? '-'}</p> */}
                  {(() => {
                    const label = getClubLabel(entry.club, entry.fallbackId, entry.placeholder);
                    const showImage = label !== 'TBD' && !!entry.club?.imageUrl;
                    return (
                      <>
                        {showImage && (
                          <img
                            src={entry.club?.imageUrl ?? undefined}
                            alt=""
                            className="w-6 h-6 object-contain flex-shrink-0"
                          />
                        )}
                        <p className="truncate text-sm font-medium text-gray-900">{getClubDisplayWithSeed(entry.club, entry.fallbackId, entry.placeholder, entry.seed)}</p>
                      </>
                    );
                  })()}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{single ? 'Score' : 'Series'}</p>
              <p className="text-lg font-semibold text-gray-900">
                {single
                  ? (entry.score ?? '-')
                  : (getClubLabel(entry.club, entry.fallbackId, entry.placeholder) === 'TBD'
                      ? '-'
                      : (entry.fallbackId != null ? (s.winsById?.[String(entry.fallbackId)] ?? 0) : 0))}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-gray-500 px-3 pb-2">
        {nextGame ? (
          <>
            <span>Next game</span>
            <span>{nextGame.date ? new Date(nextGame.date).toLocaleDateString() : 'TBD'}</span>
          </>
        ) : lastPlayed ? (
          <>
            <span>Last game</span>
            <span>{lastPlayed.date ? new Date(lastPlayed.date).toLocaleDateString() : '—'}</span>
          </>
        ) : (
          <>
            <span>&#8212;</span>
            <span>&#8212;</span>
          </>
        )}
      </div>
    </article>
  );
}

/** Placeholder card */
function PlaceholderCard() {
  return (
    <article className="rounded-xl border border-gray-200 bg-white">
      <div className="space-y-2">
        {[0, 1].map((j) => (
        //   <div className="mt-2 flex items-center justify-between text-xs text-gray-500 px-2">
          <div key={j} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-2 py-2">
            <div className="min-w-0">
              {/* <p className="text-xs text-gray-500">Seed -</p> */}
              <p className="truncate text-sm font-medium text-gray-900 pl-2">TBD</p>
            </div>
            <div className="text-right pr-1">
              <p className="text-xs text-gray-500">Series</p>
              <p className="text-lg font-semibold text-gray-900">-</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-gray-500 px-3 pb-2">
        <span>—</span>
        <span>—</span>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────
// NBA-style mirrored bracket
// ─────────────────────────────────────────────
function NbaBracket({
  displayPhases,
  seedMap,
  activePhaseDetail,
  regularSeasonStandings,
  groups,
}: {
  displayPhases: BracketPhase[];
  seedMap: Map<number, number>;
  activePhaseDetail: string;
  regularSeasonStandings?: Array<{ clubId: number; groupId?: number | null; position: number }>;
  groups?: Array<{ id: number; name: string }>;
}) {
  const FIRST_ROUND_SLOT_TOP_SEEDS = [1, 4, 3, 2] as const;
  const FIRST_ROUND_SLOT_SEED_PAIRS: Array<[number, number]> = [
    [1, 8],
    [4, 5],
    [3, 6],
    [2, 7],
  ];

  const finalsPhase = displayPhases.find((p) => p.detail === 'Finals');
  const bracketPhases = displayPhases.filter((p) => p.detail !== 'Finals');

  const clubToConf = new Map<number, number>();
  (regularSeasonStandings || []).forEach((standing) => {
    if (standing.groupId != null) clubToConf.set(Number(standing.clubId), Number(standing.groupId));
  });

  // Build conference-specific seed maps: confId -> (clubId -> conferenceRank)
  const confSeedMaps = new Map<number, Map<number, number>>();
  // Group standings by groupId then sort by the provided position and map to 1..n
  const byGroup: Record<number, Array<{ clubId: number; position: number }>> = {};
  (regularSeasonStandings || []).forEach((st) => {
    if (st.groupId == null) return;
    const gid = Number(st.groupId);
    if (!byGroup[gid]) byGroup[gid] = [];
    byGroup[gid].push({ clubId: Number(st.clubId), position: Number(st.position ?? 9999) });
  });
  Object.entries(byGroup).forEach(([gidStr, arr]) => {
    const gid = Number(gidStr);
    arr.sort((a, b) => a.position - b.position);
    const m = new Map<number, number>();
    arr.forEach((item, idx) => m.set(item.clubId, idx + 1));
    confSeedMaps.set(gid, m);
  });

  const getRawSeedForClub = (clubId?: number | null, preferredConfId?: number | null): number | undefined => {
    if (clubId == null) return undefined;
    const preferredMap = preferredConfId != null ? confSeedMaps.get(preferredConfId) : undefined;
    const preferredValue = preferredMap?.get(clubId);
    if (preferredValue != null) return preferredValue;

    const conf = clubToConf.get(clubId);
    if (conf != null) {
      const cm = confSeedMaps.get(conf);
      const v = cm?.get(clubId);
      if (v != null) return v;
    }
    return seedMap.get(clubId);
  };

  const getSeriesConf = (series: Series): number | null => {
    if (series.groupId != null) return series.groupId;
    const clubs = seriesClubIds(series);
    for (const clubId of clubs) {
      const conf = clubToConf.get(clubId);
      if (conf != null) return conf;
    }
    return null;
  };

  const matchGroupIds = new Set<number>();
  bracketPhases.forEach((phase) => {
    (phase.matches || []).forEach((match) => {
      if (match.groupId != null) matchGroupIds.add(match.groupId);
    });
  });
  const standingGroupIds = new Set<number>(clubToConf.values());
  const rawGroupIds = matchGroupIds.size >= 2 ? Array.from(matchGroupIds) : Array.from(standingGroupIds);

  // If we couldn't build `confSeedMaps` from `regularSeasonStandings` groupId
  // values (common when standings omit group info), try deriving a conference
  // -> club position map by observing which clubs appear in matches for each
  // `groupId` and mapping those clubs to their regular-season positions.
  if (confSeedMaps.size === 0 && rawGroupIds.length > 0) {
    const clubObservedGroup = new Map<number, number>();
    bracketPhases.forEach((phase) => {
      (phase.matches || []).forEach((match) => {
        const gid = match.groupId;
        if (gid == null) return;
        if (match.homeClubId) clubObservedGroup.set(Number(match.homeClubId), gid);
        if (match.awayClubId) clubObservedGroup.set(Number(match.awayClubId), gid);
      });
    });

    // Build maps per rawGroupIds from regularSeasonStandings positions for clubs
    (rawGroupIds || []).forEach((gid) => {
      const items = (regularSeasonStandings || []).filter((st) => Number(clubObservedGroup.get(Number(st.clubId))) === Number(gid));
      if (!items || items.length === 0) return;
      items.sort((a, b) => (Number(a.position ?? 9999) - Number(b.position ?? 9999)));
      const m = new Map<number, number>();
      items.forEach((it, idx) => m.set(Number(it.clubId), idx + 1));
      confSeedMaps.set(Number(gid), m);
      // Also populate clubToConf so downstream helpers can use it
      items.forEach((it) => clubToConf.set(Number(it.clubId), Number(gid)));
    });
  }

  // Ensure NBA always shows WEST on the left and EAST on the right when possible.
  // Strategy: prefer explicit conference names first (WEST/EAST), otherwise
  // prefer the conference that contains the regular-season #1 seed on the left.
  let leftConf: number | null = null;
  let rightConf: number | null = null;
  if (rawGroupIds.length >= 2) {
    // Detect WEST/EAST by name across all rawGroupIds
    let westId: number | null = null;
    let eastId: number | null = null;
    for (const gid of rawGroupIds) {
      const name = getConferenceName(gid, groups).toUpperCase();
      if (name.includes('WEST')) westId = gid;
      else if (name.includes('EAST')) eastId = gid;
    }

    if (westId != null && eastId != null) {
      leftConf = westId;
      rightConf = eastId;
    } else {
      // Fallback: if we have seed maps, place the conference containing seed #1 on the left
      if (confSeedMaps.size > 0) {
        let gidWithSeed1: number | null = null;
        for (const [gid, m] of confSeedMaps.entries()) {
          for (const pos of m.values()) {
            if (pos === 1) {
              gidWithSeed1 = gid;
              break;
            }
          }
          if (gidWithSeed1 != null) break;
        }
        if (gidWithSeed1 != null) {
          leftConf = gidWithSeed1;
          rightConf = rawGroupIds.find((id) => id !== gidWithSeed1) ?? null;
        } else {
          leftConf = rawGroupIds[0] ?? null;
          rightConf = rawGroupIds[1] ?? null;
        }
      } else {
        leftConf = rawGroupIds[0] ?? null;
        rightConf = rawGroupIds[1] ?? null;
      }
    }
  }

  /**
   * Build slots for all phases of one conference side, ordered by bracket structure.
   *
   * Strategy:
   * 1. Find the highest phase that actually has series data (the "anchor").
   * 2. Sort the anchor phase's series by earliestDate (stable initial order).
   * 3. Phases ABOVE the anchor (no data yet) → fill with placeholders.
   * 4. Phases BELOW the anchor → derive order by looking up which parent
   *    series each team in the anchor/child series came from (club-id matching).
   *
   * This handles both finished seasons (anchor = Conf Finals) and in-progress
   * seasons (anchor = Round of 16, where higher phases have no data yet).
   */
  const buildBracketOrderedSlots = (
    phases: BracketPhase[],
    confId: number | null,
    side: 'left' | 'right'
  ): Record<string, Array<{ key: string; series: Series | null; isPlaceholder: boolean }>> => {
    // Build series per phase, filtered by conference
    const seriesByPhase: Record<string, Series[]> = {};
    phases.forEach((phase) => {
      const all = buildSeries(phase.matches || []);
      seriesByPhase[phase.detail] = confId == null
        ? all
        : all.filter((s) => getSeriesConf(s) === confId);
    });

    const findSeedForClub = (clubId: number, preferredConfId?: number | null): number | undefined => {
      return getRawSeedForClub(clubId, preferredConfId);
    };

    const topSeedForSeries = (series: Series): number | undefined => {
      const numericSeeds = seriesClubIds(series)
        .map((id) => findSeedForClub(id, confId))
        .filter((seed): seed is number => typeof seed === 'number');

      if (numericSeeds.length === 0) return undefined;

      const topFourSeed = numericSeeds.find((seed) => seed >= 1 && seed <= 4);
      return topFourSeed ?? Math.min(...numericSeeds);
    };

    // phases is in PHASE_ORDER (lowest → highest); reverse gives highest → lowest
    const highToLow = [...phases].reverse();

    if (highToLow.length === 0) return {};

    const orderedByPhase: Record<string, (Series | null)[]> = {};

    // Find the highest phase index (in highToLow) that has actual series data
    let topDataIdx = -1;
    for (let i = 0; i < highToLow.length; i++) {
      if (seriesByPhase[highToLow[i].detail].length > 0) {
        topDataIdx = i;
        break;
      }
    }

    // If no phase has data at all, fall back to all placeholders
    if (topDataIdx === -1) {
      const result: Record<string, Array<{ key: string; series: Series | null; isPlaceholder: boolean }>> = {};
      phases.forEach((phase) => {
        const totalExpected = PHASE_SLOT_COUNTS[phase.detail];
        const expectedPerSide = totalExpected != null ? Math.floor(totalExpected / 2) : 0;
        result[phase.detail] = Array.from({ length: expectedPerSide }, (_, i) => ({
          key: `${side}-${phase.detail}-${i}`,
          series: null,
          isPlaceholder: true,
        }));
      });
      return result;
    }

    // Phases ABOVE the anchor (higher round, no data yet) → placeholders
    for (let i = 0; i < topDataIdx; i++) {
      const detail = highToLow[i].detail;
      const totalExpected = PHASE_SLOT_COUNTS[detail];
      const expectedPerSide = totalExpected != null ? Math.floor(totalExpected / 2) : 0;
      orderedByPhase[detail] = Array(expectedPerSide).fill(null);
    }

    // Anchor phase: determine ordering.
    const anchorDetail = highToLow[topDataIdx].detail;
    // If the anchor is the NBA First Round (Round of 16), order series by
    // the best (lowest) seed present so the series containing seed 1 is top.
    if (anchorDetail === 'Round of 16') {
        // NBA canonical first-round ordering by seed pairs (accounting for play-ins)
        // Desired visual order per conference:
        // 0: 1 vs (7-10)
        // 1: 4 vs 5
        // 2: 3 vs 6
        // 3: 2 vs (7-10)

        // Build a conference-specific seed map (position within conference).
        // The data in `regularSeasonStandings` may not include `groupId` for
        // some seasons; prefer using the already-built `confSeedMaps` which
        // maps groupId -> (clubId -> position). If a direct map for `confId`
        // is unavailable, fall back to searching across `confSeedMaps` for
        // seed positions for the clubs in a series.
        const pairIndexForSeries = (s: Series) => {
          const seeds = seriesClubIds(s).map((id) => findSeedForClub(id, confId));
          const has = (v: number) => seeds.some((s) => typeof s === 'number' && s === v);
          const hasAny = (arr: number[]) => arr.some((v) => has(v));

          // 1 vs play-in (7..10)
          if (has(1) && hasAny([7,8,9,10])) return 0;
          // 4 vs 5
          if (has(4) && has(5)) return 1;
          // 3 vs 6
          if (has(3) && has(6)) return 2;
          // 2 vs play-in (7..10)
          if (has(2) && hasAny([7,8,9,10])) return 3;

          // Fallbacks: prefer series that include top seeds in order 1,4,3,2
          const seedOrder = [1,4,3,2];
          for (let i = 0; i < seedOrder.length; i++) {
            if (has(seedOrder[i])) return i;
          }
          // Last resort: use minimum seed numeric (ignore unknowns)
          const numericSeeds = seeds.filter((x): x is number => typeof x === 'number');
          if (numericSeeds.length === 0) return 1000;
          const minSeed = Math.min(...numericSeeds);
          return 100 + minSeed;
        };

      orderedByPhase[anchorDetail] = seriesByPhase[anchorDetail]
        .slice()
        .sort((a, b) => {
          const ai = pairIndexForSeries(a);
          const bi = pairIndexForSeries(b);
          if (ai !== bi) return ai - bi;
          return a.earliestDate.localeCompare(b.earliestDate);
        });
    } else {
      orderedByPhase[anchorDetail] = seriesByPhase[anchorDetail]
        .slice()
        .sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));
    }

    // Phases BELOW the anchor: derive order via club-id matching
    for (let i = topDataIdx + 1; i < highToLow.length; i++) {
      const childDetail = highToLow[i - 1].detail;  // higher round (fewer matchups)
      const parentDetail = highToLow[i].detail;      // lower round (more matchups)

      const childOrder = orderedByPhase[childDetail] || [];
      const parentPool = [...(seriesByPhase[parentDetail] || [])];
      const usedIds = new Set<string>();
      const ordered: (Series | null)[] = [];

      for (const child of childOrder) {
        if (!child) {
          // Placeholder child → 2 placeholder parent slots
          ordered.push(null, null);
          continue;
        }

        // Sort clubs by seed (lower seed number = better seeded = top = first)
        const clubs = seriesClubIds(child);
        const sortedClubs = clubs.slice().sort((a, b) => {
          const sa = seedMap.get(a) ?? 9999;
          const sb = seedMap.get(b) ?? 9999;
          return sa - sb;
        });

        // For each team in the child series, find which parent series they came from
        for (let ci = 0; ci < 2; ci++) {
          const clubId = sortedClubs[ci];
          if (clubId == null) {
            ordered.push(null);
            continue;
          }
          const idx = parentPool.findIndex(
            (s) => !usedIds.has(s.id) && seriesClubIds(s).includes(clubId)
          );
          if (idx >= 0) {
            usedIds.add(parentPool[idx].id);
            ordered.push(parentPool[idx]);
          } else {
            ordered.push(null);
          }
        }
      }

      // Fill remaining expected slots with placeholders
      const totalExpected = PHASE_SLOT_COUNTS[parentDetail];
      const expectedPerSide = totalExpected != null ? Math.floor(totalExpected / 2) : ordered.length;
      while (ordered.length < expectedPerSide) ordered.push(null);

      orderedByPhase[parentDetail] = ordered;
    }

    // Propagate decided winners only one phase forward (immediate next phase).
    // Mapping strategy: each pair of child slots feeds one parent slot at index floor(childIndex/2).
    for (let p = 0; p < phases.length - 1; p++) {
      const curDetail = phases[p].detail;
      const nextDetail = phases[p + 1].detail;
      const curArr = orderedByPhase[curDetail] || [];
      const nextArr = orderedByPhase[nextDetail] || [];

      for (let ci = 0; ci < curArr.length; ci++) {
        const child = curArr[ci];
        if (!child) continue;
        // Ignore synthetic series we just created to avoid cascading propagation
        if (child.id && String(child.id).startsWith('prop:')) continue;
        const wb = child.winsById || {};
        const winnerEntry = Object.entries(wb).find(([, v]) => (v || 0) >= 4);
        if (!winnerEntry) continue;
        const winnerId = Number(winnerEntry[0]);

        const parentIndex = Math.floor(ci / 2);
        while (nextArr.length <= parentIndex) nextArr.push(null);

          if (nextArr[parentIndex] == null) {
          // Determine both children that feed this parent so connectors link
          // to both rectangles. Use the first club id observed for each child
          // where available.
          const leftChild = curArr[parentIndex * 2] ?? null;
          const rightChild = curArr[parentIndex * 2 + 1] ?? null;
          const leftClub = leftChild ? seriesClubIds(leftChild)[0] : undefined;
          const rightClub = rightChild ? seriesClubIds(rightChild)[0] : undefined;

          // Representative match: prefer the child that contains the winner
          const repSource = (leftChild && seriesClubIds(leftChild).includes(winnerId)) ? leftChild : ((rightChild && seriesClubIds(rightChild).includes(winnerId)) ? rightChild : child);
          const rep = repSource?.matches.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''))?.at(-1) ?? null;

          const syntheticMatch: BracketMatch = {
            id: -(parentIndex + 1),
            homeClubId: leftClub ?? (rep && rep.homeClubId) ?? undefined,
            awayClubId: rightClub ?? (rep && rep.awayClubId) ?? undefined,
            // Attempt to populate club objects by preferring the rep's club
            // when it matches, otherwise search across all phases for any
            // match that includes the club object.
            homeClub: (rep && rep.homeClubId === leftClub) ? rep.homeClub : findClubAcrossPhases(phases, leftClub) ?? undefined,
            awayClub: (rep && rep.awayClubId === rightClub) ? rep.awayClub : findClubAcrossPhases(phases, rightClub) ?? undefined,
            // Use placeholder for the non-winner side so it renders as TBD
            homeClubPlaceholder: (leftClub && leftClub !== winnerId) ? 'TBD' : undefined,
            awayClubPlaceholder: (rightClub && rightClub !== winnerId) ? 'TBD' : undefined,
            date: rep?.date,
            status: 'Finished',
          };

          const syntheticSeries: Series = {
            id: `prop:${nextDetail}:${parentIndex}`,
            homeClubId: syntheticMatch.homeClubId,
            awayClubId: syntheticMatch.awayClubId,
            homePlaceholder: syntheticMatch.homeClubPlaceholder ?? null,
            awayPlaceholder: syntheticMatch.awayClubPlaceholder ?? null,
            matches: [syntheticMatch],
            winsById: { [String(winnerId)]: wb[String(winnerId)] ?? 4 },
            groupId: child.groupId ?? null,
            earliestDate: child.earliestDate,
          };

          nextArr[parentIndex] = syntheticSeries;
        }
      }

      orderedByPhase[nextDetail] = nextArr;
    }

    

    // Convert to slot format
    const result: Record<string, Array<{ key: string; series: Series | null; isPlaceholder: boolean }>> = {};
    phases.forEach((phase) => {
      const totalExpected = PHASE_SLOT_COUNTS[phase.detail];
      const expectedPerSide = totalExpected != null ? Math.floor(totalExpected / 2) : 0;
      const slots: Array<{ key: string; series: Series | null; isPlaceholder: boolean }> = [];

      // Special deterministic ordering for Round of 16 (First Round)
      if (phase.detail === 'Round of 16') {
        const pool = (orderedByPhase[phase.detail] || []).slice();
        const used = new Set<string>();

        const preferredSlotByTopSeed = new Map<number, number>([
          [1, 0],
          [4, 1],
          [3, 2],
          [2, 3],
        ]);

        const poolSorted = pool
          .slice()
          .filter(Boolean)
          .sort((A, B) => {
            const topA = topSeedForSeries(A!);
            const topB = topSeedForSeries(B!);
            const slotA = preferredSlotByTopSeed.get(topA ?? -1) ?? 999;
            const slotB = preferredSlotByTopSeed.get(topB ?? -1) ?? 999;
            if (slotA !== slotB) return slotA - slotB;
            const minA = topA ?? 9999;
            const minB = topB ?? 9999;
            if (minA !== minB) return minA - minB;
            return A!.earliestDate.localeCompare(B!.earliestDate);
          });

        for (let slotIdx = 0; slotIdx < expectedPerSide; slotIdx++) {
          let found: Series | null = null;
          const desiredTopSeed = FIRST_ROUND_SLOT_TOP_SEEDS[slotIdx];

          const idxByTopSeed = pool.findIndex((s) => {
            if (!s || used.has(s.id)) return false;
            return topSeedForSeries(s) === desiredTopSeed;
          });
          if (idxByTopSeed >= 0) {
            const candidate = pool[idxByTopSeed]!;
            found = candidate;
            used.add(candidate.id);
          }

          // fallback: take next unused series from the seed-sorted pool
          if (!found) {
            const idx = poolSorted.findIndex((s) => s && !used.has(s.id));
            if (idx >= 0) {
              const candidate = poolSorted[idx]!;
              found = candidate;
              used.add(candidate.id);
            }
          }

          slots.push({ key: `${side}-${phase.detail}-${slotIdx}`, series: found, isPlaceholder: found == null });
        }

        result[phase.detail] = slots;
        return;
      }

      // Default conversion for other phases
      let ordered = orderedByPhase[phase.detail] || [];
      const maxCount = expectedPerSide || ordered.length;
      for (let i = 0; i < Math.max(ordered.length, maxCount); i++) {
        const series = ordered[i] ?? null;
        slots.push({ key: `${side}-${phase.detail}-${i}`, series, isPlaceholder: series == null });
      }
      result[phase.detail] = slots;
    });

    return result;
  };

  const leftSlotsByPhase = React.useMemo(
    () => buildBracketOrderedSlots(bracketPhases, leftConf, 'left'),
    [displayPhases, leftConf]
  );

  const rightSlotsByPhase = React.useMemo(
    () => buildBracketOrderedSlots(bracketPhases, rightConf, 'right'),
    [displayPhases, rightConf]
  );

  const inferredPostseasonSeedMaps = React.useMemo(() => {
    const byConference = new Map<number, Map<number, number>>();

    const assignSeedsForConference = (
      confId: number | null,
      slots: Array<{ key: string; series: Series | null; isPlaceholder: boolean }>,
    ) => {
      if (confId == null || !slots || slots.length === 0) return;

      const confMap = new Map<number, number>();

      slots.forEach((slot, index) => {
        const pair = FIRST_ROUND_SLOT_SEED_PAIRS[index];
        if (!pair || !slot?.series) return;

        const clubs = seriesClubIds(slot.series)
          .map((clubId) => ({
            clubId,
            rawSeed: getRawSeedForClub(clubId, confId) ?? 9999,
          }))
          .sort((a, b) => a.rawSeed - b.rawSeed || a.clubId - b.clubId);

        if (clubs[0]) confMap.set(clubs[0].clubId, pair[0]);
        if (clubs[1]) confMap.set(clubs[1].clubId, pair[1]);
      });

      byConference.set(confId, confMap);
    };

    assignSeedsForConference(leftConf, leftSlotsByPhase['Round of 16'] || []);
    assignSeedsForConference(rightConf, rightSlotsByPhase['Round of 16'] || []);

    return byConference;
  }, [leftConf, rightConf, leftSlotsByPhase, rightSlotsByPhase]);

  const getDisplaySeedForClub = (clubId?: number | null, preferredConfId?: number | null): number | undefined => {
    if (clubId == null) return undefined;

    if (preferredConfId != null) {
      const preferredValue = inferredPostseasonSeedMaps.get(preferredConfId)?.get(clubId);
      if (preferredValue != null) return preferredValue;
    }

    for (const seedMapForConf of inferredPostseasonSeedMaps.values()) {
      const inferred = seedMapForConf.get(clubId);
      if (inferred != null) return inferred;
    }

    return getRawSeedForClub(clubId, preferredConfId);
  };

  const finalsSeries = finalsPhase ? buildSeries(finalsPhase.matches || []) : [];
  const finalSlot = finalsSeries[0]
    ? { key: 'finals-0', series: finalsSeries[0], isPlaceholder: false }
    : { key: 'finals-0', series: null, isPlaceholder: true };
  const isFinalActive = finalsPhase?.detail === activePhaseDetail;

  // Calculate total columns and column width
  const totalColumns = bracketPhases.length * 2 + 1; // left + finals + right
  const minColumnWidth = 160; // Minimum width per column in pixels

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const cardRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const [nbaOffsets, setNbaOffsets] = React.useState<Record<string, number>>({});
  const [nbaPaths, setNbaPaths] = React.useState<Array<{ id: string; d: string }>>([]);
  const nbaOffsetsRef = React.useRef<Record<string, number>>({});

  React.useEffect(() => {
    nbaOffsetsRef.current = nbaOffsets;
  }, [nbaOffsets]);

  React.useEffect(() => {
    let raf = 0;
    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const nextOffsets: Record<string, number> = {};
      const nextPaths: Array<{ id: string; d: string }> = [];

      const getMetrics = (key: string) => {
        const element = cardRefs.current[key];
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const currentAppliedOffset = nbaOffsetsRef.current[key] ?? 0;
        const nextOffset = nextOffsets[key] ?? 0;
        return {
        //   left: rect.left - containerRect.left,
        //   right: rect.right - containerRect.left,
          left: rect.left - containerRect.left + 16,
          right: rect.right - containerRect.left + 16,
          centerY: rect.top + rect.height / 2 - containerRect.top - currentAppliedOffset + nextOffset,
        };
      };

      const pushPath = (fromKey: string, toKey: string, direction: 'ltr' | 'rtl') => {
        const from = getMetrics(fromKey);
        const to = getMetrics(toKey);
        if (!from || !to) return;
        const x1 = direction === 'ltr' ? from.right : from.left;
        const x2 = direction === 'ltr' ? to.left : to.right;
        const y1 = from.centerY;
        const y2 = to.centerY;
        const midX = (x1 + x2) / 2;
        nextPaths.push({
          id: `${fromKey}->${toKey}`,
          d: `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`,
        });
      };

      for (let index = 0; index < bracketPhases.length - 1; index++) {
        const parentDetail = bracketPhases[index].detail;
        const childDetail = bracketPhases[index + 1].detail;
        const parentPhaseName = bracketPhases[index].phase;
        const childPhaseName = bracketPhases[index + 1].phase;

        if (parentPhaseName !== childPhaseName) {
          continue;
        }

        const leftParents = leftSlotsByPhase[parentDetail] || [];
        const leftChildren = leftSlotsByPhase[childDetail] || [];
        leftChildren.forEach((childSlot) => {
          if (!childSlot) return;
          let parentSlots: Array<{ key: string; series: Series | null; isPlaceholder: boolean }> = [];

          // If the child has a series, prefer to match parents by club-id
          if (childSlot.series) {
            const childClubs = seriesClubIds(childSlot.series);
            parentSlots = leftParents.filter((ps) => ps && ps.series && seriesClubIds(ps.series).some((id) => childClubs.includes(id)));
          }

          // If no parents found by club-id (or child is a placeholder), fall back to index pairing
          if (parentSlots.length === 0) {
            const childIndex = leftChildren.indexOf(childSlot);
            parentSlots = [leftParents[childIndex * 2], leftParents[childIndex * 2 + 1]].filter(Boolean) as Array<{
              key: string; series: Series | null; isPlaceholder: boolean
            }>;
          }

          const parentCenters = parentSlots
            .map((slot) => getMetrics(slot.key)?.centerY)
            .filter((value): value is number => value != null);
          if (parentCenters.length === 0) return;
          const childMetrics = getMetrics(childSlot.key);
          if (!childMetrics) return;
          nextOffsets[childSlot.key] = parentCenters.reduce((sum, value) => sum + value, 0) / parentCenters.length - childMetrics.centerY;
          parentSlots.forEach((slot) => pushPath(slot.key, childSlot.key, 'ltr'));
        });

        const rightParents = rightSlotsByPhase[parentDetail] || [];
        const rightChildren = rightSlotsByPhase[childDetail] || [];
        rightChildren.forEach((childSlot) => {
          if (!childSlot) return;
          let parentSlots: Array<{ key: string; series: Series | null; isPlaceholder: boolean }> = [];

          if (childSlot.series) {
            const childClubs = seriesClubIds(childSlot.series);
            parentSlots = rightParents.filter((ps) => ps && ps.series && seriesClubIds(ps.series).some((id) => childClubs.includes(id)));
          }

          if (parentSlots.length === 0) {
            const childIndex = rightChildren.indexOf(childSlot);
            parentSlots = [rightParents[childIndex * 2], rightParents[childIndex * 2 + 1]].filter(Boolean) as Array<{
              key: string; series: Series | null; isPlaceholder: boolean
            }>;
          }

          const parentCenters = parentSlots
            .map((slot) => getMetrics(slot.key)?.centerY)
            .filter((value): value is number => value != null);
          if (parentCenters.length === 0) return;
          const childMetrics = getMetrics(childSlot.key);
          if (!childMetrics) return;
          nextOffsets[childSlot.key] = parentCenters.reduce((sum, value) => sum + value, 0) / parentCenters.length - childMetrics.centerY;
          parentSlots.forEach((slot) => pushPath(slot.key, childSlot.key, 'rtl'));
        });
      }

      const leftFinalParent = bracketPhases.length > 0 ? leftSlotsByPhase[bracketPhases[bracketPhases.length - 1].detail]?.[0] : null;
      const rightFinalParent = bracketPhases.length > 0 ? rightSlotsByPhase[bracketPhases[bracketPhases.length - 1].detail]?.[0] : null;
      const finalParentCenters = [leftFinalParent, rightFinalParent]
        .map((slot) => slot ? getMetrics(slot.key)?.centerY : null)
        .filter((value): value is number => value != null);

      if (finalParentCenters.length > 0) {
        const finalMetrics = getMetrics(finalSlot.key);
        if (finalMetrics) {
          nextOffsets[finalSlot.key] = finalParentCenters.reduce((sum, value) => sum + value, 0) / finalParentCenters.length - finalMetrics.centerY;
          if (leftFinalParent) pushPath(leftFinalParent.key, finalSlot.key, 'ltr');
          if (rightFinalParent) pushPath(rightFinalParent.key, finalSlot.key, 'rtl');
        }
      }

      setNbaOffsets((prev) => JSON.stringify(prev) === JSON.stringify(nextOffsets) ? prev : nextOffsets);
      setNbaPaths((prev) => JSON.stringify(prev) === JSON.stringify(nextPaths) ? prev : nextPaths);
    };

    const schedule = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(compute);
      }, 60);
    };

    schedule();

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (resizeObserver && containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', schedule);

    return () => {
      if (resizeObserver && containerRef.current) resizeObserver.unobserve(containerRef.current);
      window.removeEventListener('resize', schedule);
      if (debounceId) clearTimeout(debounceId);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [bracketPhases, leftSlotsByPhase, rightSlotsByPhase, finalSlot.key]);

  const renderSlot = (slot: { key: string; series: Series | null; isPlaceholder: boolean }) => (
    <div
      key={slot.key}
      ref={(element) => { cardRefs.current[slot.key] = element; }}
      style={{ transform: `translateY(${nbaOffsets[slot.key] ?? 0}px)`, transition: 'transform 160ms ease' }}
    >
      {slot.isPlaceholder || !slot.series ? <PlaceholderCard /> : (() => {
        // Build a local seed map that prefers conference-specific seeds for the series' clubs
        const localSeedMap = new Map<number, number>();
        const slotConfId = getSeriesConf(slot.series!);
        seriesClubIds(slot.series!).forEach((cid) => {
          const s = getDisplaySeedForClub(cid, slotConfId);
          if (s != null) localSeedMap.set(cid, s);
          else {
            const g = seedMap.get(cid);
            if (g != null) localSeedMap.set(cid, g);
          }
        });
        return <SeriesCard s={slot.series!} seedMap={localSeedMap} />;
      })()}
    </div>
  );

  // PLAYOFFS BRACKET
  return (
    <div className="overflow-x-auto pb-4">
      {/* <div className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"> */}
      <div className="relative p-3">
        <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" style={{ overflow: 'visible', zIndex: 1 }}>
          {nbaPaths.map((path) => (
            <path
              key={path.id}
              d={path.d}
              fill="none"
              stroke="#CBD5E1"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        <div
          ref={containerRef}
          className="relative flex gap-4 items-start"
          style={{ zIndex: 2, minWidth: `${totalColumns * minColumnWidth + (totalColumns - 1) * 16}px` }}
        >
        {bracketPhases.map((phase) => (
          <section
            key={`left-${phase.detail}`}
            className="px-2"
            style={{ flex: '1 1 0', minWidth: `${minColumnWidth}px` }}
          >
            <header className={`mb-4 rounded-lg px-2 py-1 ${phase.detail === activePhaseDetail ? 'bg-blue-50' : ''}`}>
              <p className="mjv text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{getConferenceName(leftConf, groups)}</p>
              <h3 className="text-base font-semibold text-gray-900">{getNbaPhaseDisplayName(phase.detail)}</h3>
            </header>
            <div className="space-y-3">
              {(leftSlotsByPhase[phase.detail] || []).map(renderSlot)}
            </div>
          </section>
        ))}

        <section
          className="px-2"
          style={{ flex: '1 1 0', minWidth: `${minColumnWidth}px` }}
        >
          <header className={`mb-4 rounded-lg px-2 py-1 ${isFinalActive ? 'bg-blue-50' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{finalsPhase?.phase ?? 'Finals'}</p>
            <h3 className="text-base font-semibold text-gray-900">Finals</h3>
          </header>
          <div className="space-y-3">
            {renderSlot(finalSlot)}
          </div>
        </section>

        {[...bracketPhases].reverse().map((phase) => (
          <section
            key={`right-${phase.detail}`}
            className="px-2"
            style={{ flex: '1 1 0', minWidth: `${minColumnWidth}px` }}
          >
            <header className={`mb-4 rounded-lg px-2 py-1 ${phase.detail === activePhaseDetail ? 'bg-blue-50' : ''}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{getConferenceName(rightConf, groups)}</p>
              <h3 className="text-base font-semibold text-gray-900">{getNbaPhaseDisplayName(phase.detail)}</h3>
            </header>
            <div className="space-y-3">
              {(rightSlotsByPhase[phase.detail] || []).map(renderSlot)}
            </div>
          </section>
        ))}
        </div>
      </div>
    </div>
  );
}

/** 
 * NBA Play-ins bracket with conference-specific two-column layout
 * WEST: First Round → Second Round (left to right)
 * EAST: Second Round → First Round (left to right, inverted for symmetry)
 */
function NbaPlayInsBracket({
  playInsPhase,
  seedMap,
  groups,
  regularSeasonStandings,
}: {
  playInsPhase: BracketPhase;
  seedMap: Map<number, number>;
  groups?: Array<{ id: number; name: string }>;
  regularSeasonStandings?: Array<{ clubId: number; groupId?: number | null; position: number }>;
}) {
  // Build club to conference mapping
  const clubToConf = new Map<number, number>();
  (regularSeasonStandings || []).forEach((standing) => {
    if (standing.groupId != null) clubToConf.set(Number(standing.clubId), Number(standing.groupId));
  });

  // Get conference IDs from matches
  const matchGroupIds = new Set<number>();
  (playInsPhase.matches || []).forEach((match) => {
    if (match.groupId != null) matchGroupIds.add(match.groupId);
    // Also check clubs
    if (match.homeClubId) {
      const conf = clubToConf.get(match.homeClubId);
      if (conf != null) matchGroupIds.add(conf);
    }
    if (match.awayClubId) {
      const conf = clubToConf.get(match.awayClubId);
      if (conf != null) matchGroupIds.add(conf);
    }
  });

  const conferenceIds = Array.from(matchGroupIds).sort();
  // Determine WEST and EAST by name
  let westConf: number | null = null;
  let eastConf: number | null = null;
  conferenceIds.forEach((confId) => {
    const name = getConferenceName(confId, groups).toUpperCase();
    if (name.includes('WEST')) westConf = confId;
    else if (name.includes('EAST')) eastConf = confId;
  });
  // Fallback if names don't match
  if (westConf == null && conferenceIds.length > 0) westConf = conferenceIds[0];
  if (eastConf == null && conferenceIds.length > 1) eastConf = conferenceIds[1];

  // Helper: get match conference
  const getMatchConf = (match: BracketMatch): number | null => {
    if (match.groupId != null) return match.groupId;
    if (match.homeClubId) {
      const conf = clubToConf.get(match.homeClubId);
      if (conf != null) return conf;
    }
    if (match.awayClubId) {
      const conf = clubToConf.get(match.awayClubId);
      if (conf != null) return conf;
    }
    return null;
  };

  // Build a more robust club-to-conference mapping using all matches
  // First pass: matches with explicit groupId help us map clubs
  const enhancedClubToConf = new Map<number, number>(clubToConf);
  (playInsPhase.matches || []).forEach((match) => {
    if (match.groupId != null) {
      if (match.homeClubId && !enhancedClubToConf.has(match.homeClubId)) {
        enhancedClubToConf.set(match.homeClubId, match.groupId);
      }
      if (match.awayClubId && !enhancedClubToConf.has(match.awayClubId)) {
        enhancedClubToConf.set(match.awayClubId, match.groupId);
      }
    }
  });

  // Build conference-specific seed maps for play-ins using regularSeasonStandings
  const confSeedMaps = new Map<number, Map<number, number>>();
  const byGroupPlayins: Record<number, Array<{ clubId: number; position: number }>> = {};
  (regularSeasonStandings || []).forEach((st) => {
    if (st.groupId == null) return;
    const gid = Number(st.groupId);
    if (!byGroupPlayins[gid]) byGroupPlayins[gid] = [];
    byGroupPlayins[gid].push({ clubId: Number(st.clubId), position: Number(st.position ?? 9999) });
  });
  Object.entries(byGroupPlayins).forEach(([gidStr, arr]) => {
    const gid = Number(gidStr);
    arr.sort((a, b) => a.position - b.position);
    const m = new Map<number, number>();
    arr.forEach((item, idx) => m.set(item.clubId, idx + 1));
    confSeedMaps.set(gid, m);
  });

  // Second pass: use enhanced mapping to assign conferences to remaining matches
  const getEnhancedMatchConf = (match: BracketMatch): number | null => {
    if (match.groupId != null) return match.groupId;
    if (match.homeClubId) {
      const conf = enhancedClubToConf.get(match.homeClubId);
      if (conf != null) return conf;
    }
    if (match.awayClubId) {
      const conf = enhancedClubToConf.get(match.awayClubId);
      if (conf != null) return conf;
    }
    return null;
  };

  // Helper: get all club IDs from a match
  const getMatchClubIds = (match: BracketMatch): number[] => {
    const ids: number[] = [];
    if (match.homeClubId) ids.push(match.homeClubId);
    if (match.awayClubId) ids.push(match.awayClubId);
    return ids;
  };

  // Process matches for a conference
  const processConferenceMatches = (confId: number | null) => {
    if (confId == null) return { firstColumn: [], secondColumn: [], clubToFirstMatch: new Map() };

    const confMatches = (playInsPhase.matches || [])
      .filter((m) => getEnhancedMatchConf(m) === confId)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Track which clubs have appeared
    const clubFirstAppearance = new Map<number, BracketMatch>();
    const clubSecondAppearance = new Map<number, BracketMatch>();
    const clubToFirstMatch = new Map<number, number>(); // clubId -> firstColumn index

    confMatches.forEach((match) => {
      const clubIds = getMatchClubIds(match);
      const isFirstAppearance = clubIds.every((id) => !clubFirstAppearance.has(id));

      if (isFirstAppearance) {
        // This is the first appearance for all clubs in this match
        clubIds.forEach((id) => clubFirstAppearance.set(id, match));
      } else {
        // At least one club has appeared before - this is a second round match
        clubIds.forEach((id) => {
          if (!clubSecondAppearance.has(id)) {
            clubSecondAppearance.set(id, match);
          }
        });
      }
    });

    const firstColumn = Array.from(clubFirstAppearance.values())
      .filter((match, index, self) => self.findIndex((m) => m.id === match.id) === index)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const secondColumn = Array.from(clubSecondAppearance.values())
      .filter((match, index, self) => self.findIndex((m) => m.id === match.id) === index)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Build mapping: clubId -> index in firstColumn
    firstColumn.forEach((match, idx) => {
      getMatchClubIds(match).forEach((clubId) => {
        clubToFirstMatch.set(clubId, idx);
      });
    });

    return { firstColumn, secondColumn, clubToFirstMatch };
  };

  const westData = processConferenceMatches(westConf);
  const eastData = processConferenceMatches(eastConf);

  // Refs for measuring positions
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const westCol1Refs = React.useRef<(HTMLDivElement | null)[]>([]);
  const westCol2Refs = React.useRef<(HTMLDivElement | null)[]>([]);
  const eastCol1Refs = React.useRef<(HTMLDivElement | null)[]>([]);
  const eastCol2Refs = React.useRef<(HTMLDivElement | null)[]>([]);

  const [connectorPaths, setConnectorPaths] = React.useState<Array<{ id: string; d: string }>>([]);
  const [westCol2Offsets, setWestCol2Offsets] = React.useState<number[]>([]);
  const [eastCol2Offsets, setEastCol2Offsets] = React.useState<number[]>([]);

  // Calculate alignments and connectors
  React.useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();

      const newWestCol2Offsets: number[] = [];
      const newEastCol2Offsets: number[] = [];
      const newPaths: Array<{ id: string; d: string }> = [];

      // WEST: Connect col1 → col2
      westData.secondColumn.forEach((match, col2Idx) => {
        const clubIds = getMatchClubIds(match);
        const parentIndices = clubIds.map((id) => westData.clubToFirstMatch.get(id)).filter((idx) => idx != null) as number[];
        
        if (parentIndices.length === 0) return;

        // Calculate average Y position of parent matches
        const parentCenters: number[] = [];
        parentIndices.forEach((col1Idx) => {
          const el = westCol1Refs.current[col1Idx];
          if (el) {
            const r = el.getBoundingClientRect();
            const center = r.top + r.height / 2 - cRect.top;
            parentCenters.push(center);
          }
        });

        if (parentCenters.length === 0) return;

        const avgParentY = parentCenters.reduce((a, b) => a + b, 0) / parentCenters.length;
        const childEl = westCol2Refs.current[col2Idx];
        if (!childEl) return;

        const childRect = childEl.getBoundingClientRect();
        const childCenter = childRect.top + childRect.height / 2 - cRect.top;
        const offset = avgParentY - childCenter;
        newWestCol2Offsets[col2Idx] = offset;

        // Draw connector paths
        parentIndices.forEach((col1Idx) => {
          const parentEl = westCol1Refs.current[col1Idx];
          if (!parentEl) return;

          const pr = parentEl.getBoundingClientRect();
          const cr = childEl.getBoundingClientRect();

          const x1 = pr.right - cRect.left;
          const y1 = pr.top + pr.height / 2 - cRect.top;
          const x2 = cr.left - cRect.left;
          const y2 = cr.top + cr.height / 2 - cRect.top + offset;
          const midX = (x1 + x2) / 2;
          const pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
          newPaths.push({ id: `west-${col1Idx}-${col2Idx}`, d: pathD });
        });
      });

      // EAST: Connect col2 → col1 (inverted order)
      // For EAST, col1 (first round) is on the right, col2 (second round) is on the left
      // We move col2 items to align with the average of their parent col1 items
      eastData.secondColumn.forEach((match, col2Idx) => {
        const clubIds = getMatchClubIds(match);
        const parentIndices = clubIds.map((id) => eastData.clubToFirstMatch.get(id)).filter((idx) => idx != null) as number[];
        
        if (parentIndices.length === 0) return;

        // Calculate average Y position of parent matches in col1 (first round)
        const parentCenters: number[] = [];
        parentIndices.forEach((col1Idx) => {
          const el = eastCol1Refs.current[col1Idx];
          if (el) {
            const r = el.getBoundingClientRect();
            const center = r.top + r.height / 2 - cRect.top;
            parentCenters.push(center);
          }
        });

        if (parentCenters.length === 0) return;

        const avgParentY = parentCenters.reduce((a, b) => a + b, 0) / parentCenters.length;
        const childEl = eastCol2Refs.current[col2Idx];
        if (!childEl) return;

        const childRect = childEl.getBoundingClientRect();
        const childCenter = childRect.top + childRect.height / 2 - cRect.top;
        
        // Move the second round match (col2) to align with average of first round matches (col1)
        const offset = avgParentY - childCenter;
        newEastCol2Offsets[col2Idx] = offset;

        // Draw connector paths from col2 to col1
        parentIndices.forEach((col1Idx) => {
          const parentEl = eastCol1Refs.current[col1Idx];
          if (!parentEl) return;

          const pr = parentEl.getBoundingClientRect();
          const cr = childEl.getBoundingClientRect();

          const x1 = cr.right - cRect.left;
          const y1 = cr.top + cr.height / 2 - cRect.top + offset;
          const x2 = pr.left - cRect.left;
          const y2 = pr.top + pr.height / 2 - cRect.top;
          const midX = (x1 + x2) / 2;
          const pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
          newPaths.push({ id: `east-${col2Idx}-${col1Idx}`, d: pathD });
        });
      });

      setWestCol2Offsets(newWestCol2Offsets);
      setEastCol2Offsets(newEastCol2Offsets);
      setConnectorPaths(newPaths);
    };

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(compute);
    });

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(compute) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', compute);

    return () => {
      if (ro && containerRef.current) ro.unobserve(containerRef.current);
      window.removeEventListener('resize', compute);
      cancelAnimationFrame(raf);
    };
  }, [westData.secondColumn.length, eastData.secondColumn.length]);

  // Render a single match card
  const renderMatchCard = (match: BracketMatch, key: string, ref?: (el: HTMLDivElement | null) => void, offset?: number) => {
    const matchConf = getEnhancedMatchConf(match);
    const homeSeed = match.homeClubId
      ? (matchConf != null ? (confSeedMaps.get(matchConf)?.get(match.homeClubId) ?? seedMap.get(match.homeClubId)) : seedMap.get(match.homeClubId))
      : undefined;
    const awaySeed = match.awayClubId
      ? (matchConf != null ? (confSeedMaps.get(matchConf)?.get(match.awayClubId) ?? seedMap.get(match.awayClubId)) : seedMap.get(match.awayClubId))
      : undefined;
      // Only flip ordering for basketball (NBA) where seed-based mirroring is desired.
      // For football and other sports preserve the payload home/away orientation.
      const shouldFlip = homeSeed != null && awaySeed != null && awaySeed < homeSeed;

    const top = shouldFlip
      ? { club: match.awayClub, seed: awaySeed, score: match.awayScore, fallbackId: match.awayClubId, placeholder: match.awayClubPlaceholder }
      : { club: match.homeClub, seed: homeSeed, score: match.homeScore, fallbackId: match.homeClubId, placeholder: match.homeClubPlaceholder };
    const bottom = shouldFlip
      ? { club: match.homeClub, seed: homeSeed, score: match.homeScore, fallbackId: match.homeClubId, placeholder: match.homeClubPlaceholder }
      : { club: match.awayClub, seed: awaySeed, score: match.awayScore, fallbackId: match.awayClubId, placeholder: match.awayClubPlaceholder };

    const isFinished = match.status === 'Finished' || (match.homeScore != null && match.awayScore != null);

    return (
      <article 
        key={key} 
        ref={ref}
        className="rounded-xl border border-gray-200 bg-white p-3"
        style={offset != null ? { transform: `translateY(${offset}px)`, transition: 'transform 160ms ease' } : undefined}
      >
        <div className="space-y-2">
          {[top, bottom].map((entry, i) => (
            <div key={`${match.id}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
              <div className="min-w-0 flex items-center gap-2">
                {entry.club?.imageUrl && (
                  <img 
                    src={entry.club.imageUrl} 
                    alt="" 
                    className="w-6 h-6 object-contain flex-shrink-0"
                  />
                )}
                <p className="truncate text-sm font-medium text-gray-900">{getClubDisplayWithSeed(entry.club, entry.fallbackId, entry.placeholder, entry.seed)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{entry.score ?? '-'}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 px-2">
          {isFinished ? (
            <>
              <span>Played on</span>
              <span>{match.date ? new Date(match.date).toLocaleDateString() : '—'}</span>
            </>
          ) : (
            <>
              <span>Next game</span>
              <span>{match.date ? new Date(match.date).toLocaleDateString() : 'TBD'}</span>
            </>
          )}
        </div>
      </article>
    );
  };

  const minColumnWidth = 200;
  const MAX_COLUMN_WIDTH = 280;
  // PLAY-INS BRACKET
  return (
    <div className="relative overflow-x-auto pb-4">
      {/* SVG overlay for connector lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width="100%"
        height="100%"
        style={{ overflow: 'visible', zIndex: 1 }}
      >
        {connectorPaths.map((cp) => (
          <path
            key={cp.id}
            d={cp.d}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      <div ref={containerRef} className="relative flex gap-8 items-start justify-center" style={{ minWidth: `${4 * MAX_COLUMN_WIDTH + 3 * 16}px`, zIndex: 2 }}>
        {/* WEST Conference: First Round → Second Round */}
        <section className="px-2" style={{ flex: '0 0 auto', width: `${MAX_COLUMN_WIDTH}px` }}>
            <header className="mb-4 rounded-lg px-2 py-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{getConferenceName(westConf, groups)}</p>
              <h3 className="text-base font-semibold text-gray-900">First Round</h3>
            </header>
            <div className="space-y-3">
              {westData.firstColumn.map((match, idx) => 
                renderMatchCard(match, `west-col1-${idx}`, (el) => { westCol1Refs.current[idx] = el; })
              )}
            </div>
          </section>

        <section className="px-2" style={{ flex: '0 0 auto', width: `${MAX_COLUMN_WIDTH}px` }}>
            <header className="mb-4 rounded-lg px-2 py-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{getConferenceName(westConf, groups)}</p>
              <h3 className="text-base font-semibold text-gray-900">Second Round</h3>
            </header>
            <div className="space-y-3">
              {westData.secondColumn.map((match, idx) => 
                renderMatchCard(match, `west-col2-${idx}`, (el) => { westCol2Refs.current[idx] = el; }, westCol2Offsets[idx])
              )}
            </div>
          </section>

        {/* EAST Conference: Second Round → First Round (inverted) */}
        <section className="px-2" style={{ flex: '0 0 auto', width: `${MAX_COLUMN_WIDTH}px` }}>
            <header className="mb-4 rounded-lg px-2 py-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{getConferenceName(eastConf, groups)}</p>
              <h3 className="text-base font-semibold text-gray-900">Second Round</h3>
            </header>
            <div className="space-y-3">
              {eastData.secondColumn.map((match, idx) => 
                renderMatchCard(match, `east-col2-${idx}`, (el) => { eastCol2Refs.current[idx] = el; }, eastCol2Offsets[idx])
              )}
            </div>
          </section>

        <section className="px-2" style={{ flex: '0 0 auto', width: `${MAX_COLUMN_WIDTH}px` }}>
            <header className="mb-4 rounded-lg px-2 py-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{getConferenceName(eastConf, groups)}</p>
              <h3 className="text-base font-semibold text-gray-900">First Round</h3>
            </header>
            <div className="space-y-3">
              {eastData.firstColumn.map((match, idx) => 
                renderMatchCard(match, `east-col1-${idx}`, (el) => { eastCol1Refs.current[idx] = el; })
              )}
            </div>
          </section>
      </div>
    </div>
  );
}

export default function PostseasonBracket({ bracket, activePhase, activePhaseDetail, sportKey }: Props) {
  const seedMap = new Map<number, number>();
  (bracket?.regularSeasonStandings || []).forEach((standing) => {
    seedMap.set(Number(standing.clubId), Number(standing.position));
  });

  // Calculate conference/group information for basketball leagues
  const clubToConf = new Map<number, number>();
  (bracket?.regularSeasonStandings || []).forEach((standing) => {
    if (standing.groupId != null) clubToConf.set(Number(standing.clubId), Number(standing.groupId));
  });
  const standingGroupIds = new Set<number>(clubToConf.values());
  const groupIds = Array.from(standingGroupIds);
  const conferenceId = groupIds.length > 0 ? groupIds[0] : null;

  // Build canonical phases according to rules:
  // - Playoffs (Round of X ... Finals): determine the deepest playoff detail
  //   present in the payload (e.g. Round of 16, Semifinals) and include all
  //   phases from that detail up to Finals. Do NOT synthesize earlier rounds
  //   (Round of 64/32) unless they are present in the payload.
  const payloadPhases = bracket?.phases || [];
  const hasPlayIns = payloadPhases.some((p) => p.detail === 'Play-ins' && Array.isArray(p.matches) && p.matches.length > 0);

  // Find the deepest playoff phase present (ignore Play-ins)
  let deepestIndex: number | null = null;
  payloadPhases.forEach((p) => {
    if (p.detail && p.detail !== 'Play-ins') {
      const idx = PHASE_ORDER.indexOf(p.detail);
      if (idx >= 0) {
        if (deepestIndex === null || idx > deepestIndex) deepestIndex = idx;
      }
    }
  });

  const phases: BracketPhase[] = [];
  // Add Play-ins only if present in payload
  if (hasPlayIns) {
    const found = payloadPhases.find((p) => p.detail === 'Play-ins');
    phases.push(found || { phase: payloadPhases?.[0]?.phase ?? 'Play-ins', detail: 'Play-ins', matches: [] });
  }

  // If we detected any playoff detail, include from that detail -> Finals.
  if (deepestIndex !== null) {
    for (let i = deepestIndex; i < PHASE_ORDER.length; i++) {
      const detail = PHASE_ORDER[i];
      if (detail === 'Play-ins') continue;
      const found = payloadPhases.find((p) => p.detail === detail);
      phases.push(found || { phase: payloadPhases?.[0]?.phase ?? 'Playoffs', detail, matches: [] });
    }
  } else {
    // No playoffs present in payload — nothing to show (but keep Play-ins if any)
  }

  // computedPhases: sometimes the backend payload omits intermediate playoff
  // phases even though DB contains matches for them. Probe the API for
  // missing playoff details and synthesize the canonical phases when needed.
  const [computedPhases, setComputedPhases] = React.useState<BracketPhase[] | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const payloadDetails = new Set((bracket?.phases || []).map((p: any) => p.detail));
        const playoffDetails = PHASE_ORDER.filter((d) => d !== 'Play-ins');

        // Probe DB for earliest playoff detail present (do this even if payload contains some playoff details)
        const seasonId = (bracket as any)?.season?.id;
        const leagueId = (bracket as any)?.season?.leagueId ?? (bracket as any)?.season?.league_id ?? null;
        if (!seasonId || !leagueId) {
          if (mounted) setComputedPhases(phases);
          return;
        }
        let foundDetail: string | null = null;
        for (let i = 0; i < playoffDetails.length; i++) {
          const detail = playoffDetails[i];
          const url = `/v1/matches?leagueId=${encodeURIComponent(String(leagueId))}&seasonId=${encodeURIComponent(String(seasonId))}&seasonPhaseDetail=${encodeURIComponent(detail)}`;
          try {
            const resp = await apiClient.get(url);
            const data = Array.isArray(resp.data) ? resp.data : (Array.isArray(resp) ? resp : []);
            if (data.length > 0) {
              foundDetail = detail;
              break;
            }
          } catch (e) {
            // ignore and continue
          }
        }

        if (!foundDetail) {
          if (mounted) setComputedPhases(phases);
          return;
        }

        const synthesized: BracketPhase[] = [];
        if (hasPlayIns) {
          const found = (bracket?.phases || []).find((p) => p.detail === 'Play-ins');
          synthesized.push(found || { phase: 'Play-ins', detail: 'Play-ins', matches: [] });
        }

        // Start from the foundDetail (e.g. 'Round of 16') and include all phases up to Finals
        const startIndex = PHASE_ORDER.indexOf(foundDetail);
        for (let i = startIndex; i < PHASE_ORDER.length; i++) {
          const detail = PHASE_ORDER[i];
          if (detail === 'Play-ins') continue;
          const found = (bracket?.phases || []).find((p) => p.detail === detail);
          synthesized.push(found || { phase: 'Playoffs', detail, matches: [] });
        }

        if (mounted) setComputedPhases(synthesized);
      } catch (e) {
        if (mounted) setComputedPhases(phases);
      }
    })();
    return () => { mounted = false; };
  }, [bracket]);

  if (phases.length === 0) {
    return <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">No postseason matches are available for this selection.</div>;
  }

  const displayPhases = computedPhases ?? phases;

  // ── Filter phases based on activePhase ──
  const filteredPhases = activePhase === 'Play-ins'
    ? displayPhases.filter((p) => p.phase === 'Play-ins')
    : activePhase === 'Playoffs'
    ? displayPhases.filter((p) => p.phase === 'Playoffs')
    : displayPhases;

  // ── Build ordered series per phase (for regular bracket) ──
  // Always call this hook even if we'll render NBA bracket
  const orderedPhaseSeries = React.useMemo(() => {
    const out: Record<string, Series[]> = {};

    for (let pi = 0; pi < filteredPhases.length; pi++) {
      const phase = filteredPhases[pi];
      const seriesList = buildSeries(phase.matches || []);

      // Detect if any series in this phase has a groupId
      const hasGroups = seriesList.some((s) => s.groupId != null);

      let ordered: Series[];

      if (hasGroups) {
        // 1. Group by groupId, within each group order by earliest date
        const groupMap: Record<string, Series[]> = {};
        seriesList.forEach((s) => {
          const gid = String(s.groupId ?? 'nogroup');
          if (!groupMap[gid]) groupMap[gid] = [];
          groupMap[gid].push(s);
        });
        const groupEntries = Object.entries(groupMap)
          .map(([gid, arr]) => {
            const earliest = arr.map((a) => a.earliestDate).sort()[0] ?? '';
            return { gid, arr, earliest };
          })
          .sort((a, b) => a.earliest.localeCompare(b.earliest));
        ordered = [];
        groupEntries.forEach((ge) => {
          const sorted = ge.arr.slice().sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));
          ordered.push(...sorted);
        });
      } else {
        // 2. No groups → order by earliest date
        ordered = seriesList.slice().sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));
      }

      // 3. Preserve ordering from previous phase when possible
      if (pi > 0) {
        const prev = out[filteredPhases[pi - 1].detail] || [];
        // Build a mapping: clubId → position index in previous phase
        const prevOrder: Record<number, number> = {};
        prev.forEach((ps, idx) => {
          seriesClubIds(ps).forEach((cid) => { prevOrder[cid] = idx; });
        });
        ordered = ordered.slice().sort((a, b) => {
          const aClubs = seriesClubIds(a);
          const bClubs = seriesClubIds(b);
          const aIdx = Math.min(...aClubs.map((c) => prevOrder[c] ?? Infinity));
          const bIdx = Math.min(...bClubs.map((c) => prevOrder[c] ?? Infinity));
          if (aIdx !== bIdx) return aIdx - bIdx;
          return a.earliestDate.localeCompare(b.earliestDate);
        });
      }

      out[phase.detail] = ordered;
    }
    return out;
  }, [filteredPhases]);

  // ── Refs for DOM measurement (funnel + connectors) ──
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const seriesRefs = React.useRef<Record<string, (HTMLDivElement | null)[]>>({});
  const [connectorPaths, setConnectorPaths] = React.useState<
    Array<{ id: string; d: string; srcKey: string; destKey: string }>
  >([]);
  const [funnelOffsets, setFunnelOffsets] = React.useState<Record<string, number>>({});
  const funnelOffsetsRef = React.useRef<Record<string, number>>({});
  const [hoveredConnector, setHoveredConnector] = React.useState<string | null>(null);

  React.useEffect(() => { funnelOffsetsRef.current = funnelOffsets; }, [funnelOffsets]);

  // ── Compute funnel offsets & connector paths after layout ──
  React.useEffect(() => {
    let raf = 0;
    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const compute = () => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();

      const newOffsets: Record<string, number> = {};
      const newPaths: Array<{ id: string; d: string; srcKey: string; destKey: string }> = [];

      for (let pi = 0; pi < filteredPhases.length - 1; pi++) {
        const cur = filteredPhases[pi];
        const nxt = filteredPhases[pi + 1];
        const curSeries = orderedPhaseSeries[cur.detail] || [];
        const nxtSeries = orderedPhaseSeries[nxt.detail] || [];
        const curRefs = seriesRefs.current[cur.detail] || [];
        const nxtRefs = seriesRefs.current[nxt.detail] || [];

        // Build clubId → parent series index mapping
        const clubToParent: Record<number, number[]> = {};
        curSeries.forEach((s, idx) => {
          seriesClubIds(s).forEach((cid) => {
            if (!clubToParent[cid]) clubToParent[cid] = [];
            clubToParent[cid].push(idx);
          });
        });

        // For each child series, find its parents and compute funnel offset + connector
        nxtSeries.forEach((childSeries, nidx) => {
          const childClubs = seriesClubIds(childSeries);
          const parentIndices = new Set<number>();
          childClubs.forEach((cid) => {
            (clubToParent[cid] || []).forEach((pi2) => parentIndices.add(pi2));
          });

          if (parentIndices.size === 0) return;

          // Compute average vertical center of parent cards
          const parentCenters: number[] = [];
          parentIndices.forEach((pIdx) => {
            const el = curRefs[pIdx];
            if (el) {
              const r = el.getBoundingClientRect();
              // account for any existing transform
              const currentOffset = newOffsets[`${cur.detail}-${pIdx}`] ?? 0;
              const center = r.top + r.height / 2 - cRect.top + currentOffset;
              parentCenters.push(center);
            }
          });
          if (parentCenters.length === 0) return;

          const avgParentY = parentCenters.reduce((a, b) => a + b, 0) / parentCenters.length;

          // Compute child's natural center (subtract existing applied transform to avoid oscillation)
          const childEl = nxtRefs[nidx];
          if (!childEl) return;
          const key = `${nxt.detail}-${nidx}`;
          const childRect = childEl.getBoundingClientRect();
          const existingChildOffset = funnelOffsetsRef.current[key] ?? 0;
          const childCenter = childRect.top + childRect.height / 2 - cRect.top - existingChildOffset;
          const delta = avgParentY - childCenter;
          newOffsets[key] = delta;

          // Build connector paths from each parent to this child
          parentIndices.forEach((pIdx) => {
            const parentEl = curRefs[pIdx];
            if (!parentEl || !childEl) return;
            const pr = parentEl.getBoundingClientRect();
            const cr2 = childEl.getBoundingClientRect();

            const existingParentOffset = funnelOffsetsRef.current[`${cur.detail}-${pIdx}`] ?? 0;
            const x1 = pr.right - cRect.left;
            const y1 = pr.top + pr.height / 2 - cRect.top - existingParentOffset + (newOffsets[`${cur.detail}-${pIdx}`] ?? 0);
            const x2 = cr2.left - cRect.left;
            // childCenter is the natural center (DOM pos minus existing offset); add delta for final visual center
            const y2 = childCenter + delta;
            const midX = (x1 + x2) / 2;
            const pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
            newPaths.push({
              id: `${cur.detail}-${pIdx}->${nxt.detail}-${nidx}`,
              d: pathD,
              srcKey: `${cur.detail}-${pIdx}`,
              destKey: key,
            });
          });
        });
      }

      // Only update state when values changed to avoid render loops
      setFunnelOffsets((prev) => {
        const prevStr = JSON.stringify(prev);
        const nextStr = JSON.stringify(newOffsets);
        return prevStr === nextStr ? prev : newOffsets;
      });
      setConnectorPaths((prev) => {
        const prevStr = JSON.stringify(prev.map((p) => p.d));
        const nextStr = JSON.stringify(newPaths.map((p) => p.d));
        return prevStr === nextStr ? prev : newPaths;
      });
    };

    const schedule = () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(compute);
      }, 60);
    };

    // Initial compute after paint
    schedule();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', schedule);

    return () => {
      if (ro && containerRef.current) ro.unobserve(containerRef.current);
      window.removeEventListener('resize', schedule);
      if (debounceId) clearTimeout(debounceId);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPhases.length, orderedPhaseSeries]);

  // Highlight series cards when hovering a connector
  React.useEffect(() => {
    if (!hoveredConnector) {
      Object.values(seriesRefs.current).forEach((arr) =>
        arr.forEach((el) => { if (el) el.style.boxShadow = ''; })
      );
      return;
    }
    const conn = connectorPaths.find((c) => c.id === hoveredConnector);
    if (!conn) return;
    const keys = new Set([conn.srcKey, conn.destKey]);
    Object.entries(seriesRefs.current).forEach(([phaseDetail, arr]) => {
      arr.forEach((el, idx) => {
        if (!el) return;
        const k = `${phaseDetail}-${idx}`;
        el.style.boxShadow = keys.has(k) ? '0 0 0 3px rgba(37,99,235,0.18)' : '';
      });
    });
  }, [hoveredConnector, connectorPaths]);

  // ── Early returns after all hooks ──
  if (filteredPhases.length === 0) {
    return <div className="bg-white rounded-lg shadow p-6 text-sm text-gray-600">No {activePhase.toLowerCase()} matches are available for this selection.</div>;
  }

  // ── NBA / basketball: special play-ins layout ──
  if (sportKey === 'basketball' && activePhase === 'Play-ins') {
    const playInsPhase = filteredPhases.find((p) => p.phase === 'Play-ins');
    if (playInsPhase) {
      return (
        <NbaPlayInsBracket
          playInsPhase={playInsPhase}
          seedMap={seedMap}
          groups={bracket?.groups}
          regularSeasonStandings={bracket?.regularSeasonStandings}
        />
      );
    }
  }

  // ── NBA / basketball: mirrored bracket layout for Playoffs only ──
  if (sportKey === 'basketball' && activePhase === 'Playoffs') {
    return (
      <NbaBracket
        displayPhases={filteredPhases}
        seedMap={seedMap}
        activePhaseDetail={activePhaseDetail}
        regularSeasonStandings={bracket?.regularSeasonStandings}
        groups={bracket?.groups}
      />
    );
  }

  const numCols = filteredPhases.length;
  const MIN_COL_W = 200;
  const MAX_COL_W = 280;
  const minContainerWidth = numCols * MIN_COL_W + Math.max(0, numCols - 1) * 16;

  return (
    <div className="relative overflow-x-auto pb-4">
      {/* SVG overlay for connector lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width="100%"
        height="100%"
        style={{ overflow: 'visible', zIndex: 1 }}
      >
        {connectorPaths.map((cp) => {
          const isHovered = hoveredConnector === cp.id;
          return (
            <path
              key={cp.id}
              d={cp.d}
              fill="none"
              stroke={isHovered ? '#2563EB' : '#CBD5E1'}
              strokeWidth={isHovered ? 3 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transition: 'stroke 120ms ease, stroke-width 120ms ease',
                pointerEvents: 'stroke',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredConnector(cp.id)}
              onMouseLeave={() => setHoveredConnector(null)}
            />
          );
        })}
      </svg>

      <div ref={containerRef} className="relative flex gap-4 items-start justify-center" style={{ minWidth: `${minContainerWidth}px`, zIndex: 2 }}>
        {filteredPhases.map((phase, phaseIndex) => {
          const isActive = phase.detail === activePhaseDetail;
          let seriesList = orderedPhaseSeries[phase.detail] || [];
          // For non-NBA (non-basketball) playoffs, if the raw matches exceed the
          // number of aggregated series, render one card per match so we display
          // every played game (useful for leagues that play multiple legs).
          let perMatchMode = false;
          if (sportKey !== 'basketball' && activePhase === 'Playoffs') {
            const allMatches = (phase.matches || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
            // If there are more raw matches than aggregated series, switch to
            // per-match presentation — but group matches by club pair so that
            // all legs between the same clubs are shown consecutively and
            // each group's matches are sorted by date.
            if (allMatches.length > seriesList.length) {
              perMatchMode = true;
              // Use existing buildSeries to group by club pair. Ensure each
              // group's matches are sorted by date and order groups by
              // earliest match date.
              const grouped = buildSeries(allMatches);
              grouped.forEach((g) => {
                g.matches = (g.matches || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
                g.earliestDate = g.matches[0]?.date ?? g.earliestDate ?? '';
              });
              seriesList = grouped.slice().sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));
            }
          }
          // Ensure refs array
          if (!seriesRefs.current[phase.detail]) seriesRefs.current[phase.detail] = [];

                  const expected = perMatchMode ? undefined : PHASE_SLOT_COUNTS[phase.detail];
          const isFinals = phase.detail === 'Finals';
          
          return (
            <section
              key={phase.detail}
              className="px-2"
              style={{ flex: '0 0 auto', width: `${MAX_COL_W}px` }}
            >
              <header className={`mb-4 rounded-lg px-2 py-1 ${isActive ? 'bg-blue-50' : ''}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {sportKey === 'basketball' && conferenceId ? getConferenceName(conferenceId, bracket?.groups) : phase.phase}
                </p>
                <h3 className="text-base font-semibold text-gray-900">{phase.detail}</h3>
              </header>

              <div className="space-y-3">
                {seriesList.map((s, idx) => {
                  const rep = s.matches.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).at(-1)!;
                  const homeSeed = rep.homeClubId ? seedMap.get(Number(rep.homeClubId)) : undefined;
                  const awaySeed = rep.awayClubId ? seedMap.get(Number(rep.awayClubId)) : undefined;
                  const shouldFlip = homeSeed != null && awaySeed != null && awaySeed < homeSeed;

                  const top = shouldFlip
                    ? { club: rep.awayClub, seed: awaySeed, score: rep.awayScore, fallbackId: rep.awayClubId, placeholder: rep.awayClubPlaceholder, winsIdx: 1 }
                    : { club: rep.homeClub, seed: homeSeed, score: rep.homeScore, fallbackId: rep.homeClubId, placeholder: rep.homeClubPlaceholder, winsIdx: 0 };
                  const bottom = shouldFlip
                    ? { club: rep.homeClub, seed: homeSeed, score: rep.homeScore, fallbackId: rep.homeClubId, placeholder: rep.homeClubPlaceholder, winsIdx: 0 }
                    : { club: rep.awayClub, seed: awaySeed, score: rep.awayScore, fallbackId: rep.awayClubId, placeholder: rep.awayClubPlaceholder, winsIdx: 1 };

                  const isSingleMatch = s.matches.length === 1;
                  const isFinished = rep.status === 'Finished' || (rep.homeScore != null && rep.awayScore != null);
                  const nextGame = s.matches
                    .filter((m) => m.status !== 'Finished')
                    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0] ?? null;
                  const lastPlayedSeries = s.matches
                    .filter((m) => m.status === 'Finished' || (m.homeScore != null && m.awayScore != null))
                    .slice()
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] ?? null;

                  const offsetKey = `${phase.detail}-${idx}`;
                  const offset = funnelOffsets[offsetKey] ?? 0;

                  return (
                    <div
                      key={`${phase.detail}-${s.id}-${idx}`}
                      ref={(el) => { seriesRefs.current[phase.detail][idx] = el; }}
                      style={{ transform: `translateY(${offset}px)`, transition: 'transform 160ms ease' }}
                    >
                      {/* If we're in per-match mode and this series contains multiple
                          legs, render each match as its own card stacked vertically
                          so matches between the same clubs appear together. */}
                      {perMatchMode && s.matches.length > 1 ? (
                        <div className="space-y-3">
                          {s.matches.map((match, midx) => {
                            const m = match;
                            const homeSeedM = m.homeClubId ? seedMap.get(Number(m.homeClubId)) : undefined;
                            const awaySeedM = m.awayClubId ? seedMap.get(Number(m.awayClubId)) : undefined;
                            // Preserve original home/away for non-basketball; only flip for basketball.
                            const shouldFlipM = sportKey === 'basketball' && homeSeedM != null && awaySeedM != null && awaySeedM < homeSeedM;
                            const topM = shouldFlipM
                              ? { club: m.awayClub, seed: awaySeedM, score: m.awayScore, fallbackId: m.awayClubId, placeholder: m.awayClubPlaceholder }
                              : { club: m.homeClub, seed: homeSeedM, score: m.homeScore, fallbackId: m.homeClubId, placeholder: m.homeClubPlaceholder };
                            const bottomM = shouldFlipM
                              ? { club: m.homeClub, seed: homeSeedM, score: m.homeScore, fallbackId: m.homeClubId, placeholder: m.homeClubPlaceholder }
                              : { club: m.awayClub, seed: awaySeedM, score: m.awayScore, fallbackId: m.awayClubId, placeholder: m.awayClubPlaceholder };

                            const finishedM = m.status === 'Finished' || (m.homeScore != null && m.awayScore != null);

                            return (
                              <article key={`match-${m.id}`} className="rounded-xl border border-gray-200 bg-white p-3">
                                <div className="space-y-2">
                                  {[topM, bottomM].map((entry, i) => (
                                    <div key={`${m.id}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                                      <div className="min-w-0 flex items-center gap-2">
                                        {entry.club?.imageUrl && (
                                          <img src={entry.club.imageUrl} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                                        )}
                                        <p className="truncate text-sm font-medium text-gray-900">{getClubLabel(entry.club, entry.fallbackId, entry.placeholder)}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-semibold text-gray-900">{entry.score ?? '-'}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 px-2">
                                  {finishedM ? (
                                    <>
                                      <span>Played on</span>
                                      <span>{m.date ? new Date(m.date).toLocaleDateString() : '—'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Next game</span>
                                      <span>{m.date ? new Date(m.date).toLocaleDateString() : 'TBD'}</span>
                                    </>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <article className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="space-y-2">
                            {[top, bottom].map((entry, i) => (
                              <div key={`${s.id}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                                <div className="min-w-0 flex items-center gap-2">
                                  {/* <p className="text-xs text-gray-500">Seed {entry.seed ?? '-'}</p> */}
                                  {entry.club?.imageUrl && (
                                    <img 
                                      src={entry.club.imageUrl} 
                                      alt="" 
                                      className="w-6 h-6 object-contain flex-shrink-0"
                                    />
                                  )}
                                  <p className="truncate text-sm font-medium text-gray-900">{getClubLabel(entry.club, entry.fallbackId, entry.placeholder)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-semibold text-gray-900">
                                    {isSingleMatch
                                      ? (entry.score ?? '-')
                                      : (getClubLabel(entry.club, entry.fallbackId, entry.placeholder) === 'TBD'
                                          ? '-'
                                          : (entry.fallbackId != null ? (s.winsById?.[String(entry.fallbackId)] ?? 0) : 0))}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 px-2">
                            {isSingleMatch && isFinished ? (
                              <>
                                <span>Played on</span>
                                <span>{rep.date ? new Date(rep.date).toLocaleDateString() : '—'}</span>
                              </>
                            ) : nextGame ? (
                              <>
                                <span>Next game</span>
                                <span>{nextGame.date ? new Date(nextGame.date).toLocaleDateString() : 'TBD'}</span>
                              </>
                            ) : lastPlayedSeries ? (
                              <>
                                <span>Last game</span>
                                <span>{lastPlayedSeries.date ? new Date(lastPlayedSeries.date).toLocaleDateString() : '—'}</span>
                              </>
                            ) : (
                              <>
                                <span>&#8212;</span>
                                <span>&#8212;</span>
                              </>
                            )}
                          </div>
                        </article>
                      )}
                    </div>
                  );
                })}

                {/* Placeholder slots for phases that don't have all matchups yet */}
                {expected && seriesList.length < expected && Array.from({ length: expected - seriesList.length }).map((_, i) => {
                  const placeholderIdx = seriesList.length + i;
                  const offsetKey = `${phase.detail}-${placeholderIdx}`;
                  const offset = funnelOffsets[offsetKey] ?? 0;
                  return (
                    <div
                      key={`empty-${phase.detail}-${i}`}
                      ref={(el) => { seriesRefs.current[phase.detail][placeholderIdx] = el; }}
                      style={{ transform: `translateY(${offset}px)`, transition: 'transform 160ms ease' }}
                    >
                      <article className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="space-y-2">
                          {[0, 1].map((j) => (
                            <div key={`empty-${i}-${j}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900">TBD</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold text-gray-900">-</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500 px-3 pb-2">
                          <span>—</span>
                          <span>—</span>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}