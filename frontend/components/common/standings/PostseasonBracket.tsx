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

function getClubLabel(club?: { shortName?: string | null; name?: string | null } | null, fallback?: number | null, placeholder?: string | null) {
  return club?.shortName || club?.name || placeholder || (fallback ? `Club ${fallback}` : 'TBD');
}

type Series = {
  id: string;
  homeClubId?: number | null;
  awayClubId?: number | null;
  homePlaceholder?: string | null;
  awayPlaceholder?: string | null;
  matches: BracketMatch[];
  winsHome: number;
  winsAway: number;
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
        winsHome: 0,
        winsAway: 0,
        groupId: (m as any).groupId ?? null,
        earliestDate: m.date ?? '',
      });
    } else {
      existing.matches.push(m);
      if (m.date && m.date < existing.earliestDate) existing.earliestDate = m.date;
    }
  });

  for (const s of seriesMap.values()) {
    s.winsHome = 0;
    s.winsAway = 0;
    s.matches.forEach((mm) => {
      const hs = typeof mm.homeScore === 'number' ? mm.homeScore : null;
      const as2 = typeof mm.awayScore === 'number' ? mm.awayScore : null;
      if (hs != null && as2 != null) {
        if (hs > as2) s.winsHome += 1;
        else if (as2 > hs) s.winsAway += 1;
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

  const top = shouldFlip
    ? { club: rep.awayClub, seed: awaySeed, score: rep.awayScore, fallbackId: rep.awayClubId, placeholder: rep.awayClubPlaceholder, winsIdx: 1 }
    : { club: rep.homeClub, seed: homeSeed, score: rep.homeScore, fallbackId: rep.homeClubId, placeholder: rep.homeClubPlaceholder, winsIdx: 0 };
  const bottom = shouldFlip
    ? { club: rep.homeClub, seed: homeSeed, score: rep.homeScore, fallbackId: rep.homeClubId, placeholder: rep.homeClubPlaceholder, winsIdx: 0 }
    : { club: rep.awayClub, seed: awaySeed, score: rep.awayScore, fallbackId: rep.awayClubId, placeholder: rep.awayClubPlaceholder, winsIdx: 1 };

  const nextGame = s.matches
    .filter((m) => m.status !== 'Finished')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0] ?? null;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-0">
      <div className="space-y-2">
        {[top, bottom].map((entry, i) => (
          <div key={`${s.id}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
            <div className="min-w-0 flex items-center gap-1">
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
              <p className="text-xs text-gray-500">{single ? 'Score' : 'Series'}</p>
              <p className="text-lg font-semibold text-gray-900">
                {single
                  ? (entry.score ?? '-')
                  : (getClubLabel(entry.club, entry.fallbackId, entry.placeholder) === 'TBD'
                      ? '-'
                      : (entry.winsIdx === 0 ? s.winsHome : s.winsAway))}
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
    <article className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="space-y-2">
        {[0, 1].map((j) => (
          <div key={j} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Seed -</p>
              <p className="truncate text-sm font-medium text-gray-900">TBD</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Series</p>
              <p className="text-lg font-semibold text-gray-900">-</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
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
  const finalsPhase = displayPhases.find((p) => p.detail === 'Finals');
  const bracketPhases = displayPhases.filter((p) => p.detail !== 'Finals');

  const clubToConf = new Map<number, number>();
  (regularSeasonStandings || []).forEach((standing) => {
    if (standing.groupId != null) clubToConf.set(Number(standing.clubId), Number(standing.groupId));
  });

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
  const [leftConf, rightConf] = rawGroupIds.slice(0, 2).length >= 2
    ? [rawGroupIds[0], rawGroupIds[1]]
    : [null, null];

  const buildConferenceSlots = (phase: BracketPhase, confId: number | null, side: 'left' | 'right') => {
    const allSeries = buildSeries(phase.matches || []);
    const filteredSeries = confId == null
      ? allSeries
      : allSeries.filter((series) => getSeriesConf(series) === confId);
    const orderedSeries = filteredSeries.slice().sort((a, b) => a.earliestDate.localeCompare(b.earliestDate));
    const totalExpected = PHASE_SLOT_COUNTS[phase.detail];
    const expectedPerSide = totalExpected != null ? Math.floor(totalExpected / 2) : orderedSeries.length;
    const slots: Array<{ key: string; series: Series | null; isPlaceholder: boolean }> = orderedSeries.map((series, index) => ({
      key: `${side}-${phase.detail}-${index}`,
      series,
      isPlaceholder: false,
    }));

    for (let index = orderedSeries.length; index < expectedPerSide; index++) {
      slots.push({
        key: `${side}-${phase.detail}-${index}`,
        series: null,
        isPlaceholder: true,
      });
    }

    return slots;
  };

  const leftSlotsByPhase = React.useMemo(() => {
    const result: Record<string, Array<{ key: string; series: Series | null; isPlaceholder: boolean }>> = {};
    bracketPhases.forEach((phase) => {
      result[phase.detail] = buildConferenceSlots(phase, leftConf, 'left');
    });
    return result;
  }, [displayPhases, leftConf]);

  const rightSlotsByPhase = React.useMemo(() => {
    const result: Record<string, Array<{ key: string; series: Series | null; isPlaceholder: boolean }>> = {};
    bracketPhases.forEach((phase) => {
      result[phase.detail] = buildConferenceSlots(phase, rightConf, 'right');
    });
    return result;
  }, [displayPhases, rightConf]);

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
        // const gap = Math.abs(x2 - x1);
        const gap = 0;
        const c1 = direction === 'ltr' ? x1 + gap * 1.00 : x1 - gap * 0.13;
        const c2 = direction === 'ltr' ? x2 - gap * 0.15 : x2 + gap * 0.15;
        nextPaths.push({
          id: `${fromKey}->${toKey}`,
          d: `M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`,
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
        leftChildren.forEach((childSlot, childIndex) => {
          const parentSlots = [leftParents[childIndex * 2], leftParents[childIndex * 2 + 1]].filter(Boolean);
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
        rightChildren.forEach((childSlot, childIndex) => {
          const parentSlots = [rightParents[childIndex * 2], rightParents[childIndex * 2 + 1]].filter(Boolean);
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
      {slot.isPlaceholder || !slot.series ? <PlaceholderCard /> : <SeriesCard s={slot.series} seedMap={seedMap} />}
    </div>
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" style={{ overflow: 'visible', zIndex: 1 }}>
          {nbaPaths.map((path) => (
            <path
              key={path.id}
              d={path.d}
              fill="none"
              stroke="#CBD5E1"
              strokeWidth={2.0}
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
  const [hoveredConnector, setHoveredConnector] = React.useState<string | null>(null);

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

          // Compute child's current center
          const childEl = nxtRefs[nidx];
          if (!childEl) return;
          const childRect = childEl.getBoundingClientRect();
          const childCenter = childRect.top + childRect.height / 2 - cRect.top;
          const delta = avgParentY - childCenter;
          const key = `${nxt.detail}-${nidx}`;
          newOffsets[key] = delta;

          // Build connector paths from each parent to this child
          parentIndices.forEach((pIdx) => {
            const parentEl = curRefs[pIdx];
            if (!parentEl || !childEl) return;
            const pr = parentEl.getBoundingClientRect();
            const cr2 = childEl.getBoundingClientRect();

            const x1 = pr.right - cRect.left;
            const y1 = pr.top + pr.height / 2 - cRect.top + (newOffsets[`${cur.detail}-${pIdx}`] ?? 0);
            const x2 = cr2.left - cRect.left;
            const y2 = cr2.top + cr2.height / 2 - cRect.top + delta;
            const midX = (x1 + x2) / 2;
            const pathD = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
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

      <div ref={containerRef} className="relative flex gap-4 items-start" style={{ minWidth: `${minContainerWidth}px`, zIndex: 2 }}>
        {filteredPhases.map((phase) => {
          const isActive = phase.detail === activePhaseDetail;
          const seriesList = orderedPhaseSeries[phase.detail] || [];
          // Ensure refs array
          if (!seriesRefs.current[phase.detail]) seriesRefs.current[phase.detail] = [];

          const expected = PHASE_SLOT_COUNTS[phase.detail];
          return (
            <section
              key={phase.detail}
              className={`flex-1 rounded-2xl border p-4 shadow-sm ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
              style={{ minWidth: `${MIN_COL_W}px`, maxWidth: '288px' }}
            >
              <header className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {sportKey === 'basketball' && conferenceId ? getConferenceName(conferenceId, bracket?.groups) : phase.phase}
                </p>
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
                  const nextGame = s.matches
                    .filter((m) => m.status !== 'Finished')
                    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0] ?? null;

                  const offsetKey = `${phase.detail}-${idx}`;
                  const offset = funnelOffsets[offsetKey] ?? 0;

                  return (
                    <div
                      key={`${phase.detail}-${s.id}-${idx}`}
                      ref={(el) => { seriesRefs.current[phase.detail][idx] = el; }}
                      style={{ transform: `translateY(${offset}px)`, transition: 'transform 160ms ease' }}
                    >
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
                                <p className="text-xs text-gray-500">{isSingleMatch ? 'Score' : 'Series'}</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {isSingleMatch
                                    ? (entry.score ?? '-')
                                    : (getClubLabel(entry.club, entry.fallbackId, entry.placeholder) === 'TBD'
                                        ? '-'
                                        : (entry.winsIdx === 0 ? s.winsHome : s.winsAway))}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                          {nextGame ? (
                            <>
                              <span>Next game</span>
                              <span>{nextGame.date ? new Date(nextGame.date).toLocaleDateString() : 'TBD'}</span>
                            </>
                          ) : (
                            <>
                              <span>&#8212;</span>
                              <span>&#8212;</span>
                            </>
                          )}
                        </div>
                      </article>
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
                                {/* <p className="text-xs text-gray-500">Seed -</p> */}
                                <p className="truncate text-sm font-medium text-gray-900">TBD</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Series</p>
                                <p className="text-lg font-semibold text-gray-900">-</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
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