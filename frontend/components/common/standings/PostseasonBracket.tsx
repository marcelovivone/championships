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
  homeClub?: { shortName?: string | null; name?: string | null } | null;
  awayClub?: { shortName?: string | null; name?: string | null } | null;
};

type BracketPhase = {
  phase: string;
  detail: string;
  matches: BracketMatch[];
};

type BracketPayload = {
  regularSeasonStandings?: Array<{
    clubId: number;
    position: number;
  }>;
  phases?: BracketPhase[];
};

type Props = {
  bracket: BracketPayload | undefined;
  activePhase: string;
  activePhaseDetail: string;
};

import React from 'react';
import { apiClient } from '@/lib/api/client';

const PHASE_ORDER = ['Play-ins', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals'];

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

export default function PostseasonBracket({ bracket, activePhase, activePhaseDetail }: Props) {
  const seedMap = new Map<number, number>();
  (bracket?.regularSeasonStandings || []).forEach((standing) => {
    seedMap.set(Number(standing.clubId), Number(standing.position));
  });

  // Build canonical phases according to rules:
  // - Play-ins: include only if payload contains any Play-ins matches.
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
  const numCols = displayPhases.length;
  // Minimum column width in px; ensures scroll kicks in when columns can't fit the screen.
  const MIN_COL_W = 200;
  const minContainerWidth = numCols * MIN_COL_W + Math.max(0, numCols - 1) * 16;

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 items-start" style={{ minWidth: `${minContainerWidth}px` }}>
        {displayPhases.map((phase) => {
          // Only highlight the column that matches the active phase detail exactly.
          const isActive = phase.detail === activePhaseDetail;

          return (
            <section
              key={phase.detail}
              className={`flex-1 rounded-2xl border p-4 shadow-sm ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
              style={{ minWidth: `${MIN_COL_W}px`, maxWidth: '288px' }}
            >
              <header className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{phase.phase}</p>
                <h3 className="text-base font-semibold text-gray-900">{phase.detail}</h3>
              </header>

              <div className="space-y-3">
                {(() => {
                  // Group matches between the same two clubs into a single series
                  const seriesMap = new Map<string, {
                    id: string;
                    homeClubId?: number | null;
                    awayClubId?: number | null;
                    homePlaceholder?: string | null;
                    awayPlaceholder?: string | null;
                    matches: BracketMatch[];
                    winsHome: number;
                    winsAway: number;
                  }>();

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

                  (phase.matches || []).forEach((m) => {
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
                      });
                    } else {
                      existing.matches.push(m);
                    }
                  });

                  // Tally wins per series (count finished matches with score)
                  for (const s of seriesMap.values()) {
                    s.winsHome = 0;
                    s.winsAway = 0;
                    s.matches.forEach((mm) => {
                      const hs = typeof mm.homeScore === 'number' ? mm.homeScore : null;
                      const as = typeof mm.awayScore === 'number' ? mm.awayScore : null;
                      // Consider a match for wins if both scores are present and not null
                      if (hs != null && as != null) {
                        if (hs > as) s.winsHome += 1;
                        else if (as > hs) s.winsAway += 1;
                      }
                    });
                  }

                  const seriesList = Array.from(seriesMap.values());

                  // Determine expected slot count for this phase
                  const expected = PHASE_SLOT_COUNTS[phase.detail];

                  // Build rendered items: one per series (regardless of how many matches inside)
                  const rendered = seriesList.map((s, idx) => {
                    // pick a representative match (use the last by date)
                    const rep = s.matches.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).at(-1)!;
                    const homeSeed = rep.homeClubId ? seedMap.get(Number(rep.homeClubId)) : undefined;
                    const awaySeed = rep.awayClubId ? seedMap.get(Number(rep.awayClubId)) : undefined;
                    const shouldFlip = homeSeed != null && awaySeed != null && awaySeed < homeSeed;

                    const top = shouldFlip
                      ? { club: rep.awayClub, seed: awaySeed, score: rep.awayScore, fallbackId: rep.awayClubId, placeholder: rep.awayClubPlaceholder }
                      : { club: rep.homeClub, seed: homeSeed, score: rep.homeScore, fallbackId: rep.homeClubId, placeholder: rep.homeClubPlaceholder };
                    const bottom = shouldFlip
                      ? { club: rep.homeClub, seed: homeSeed, score: rep.homeScore, fallbackId: rep.homeClubId, placeholder: rep.homeClubPlaceholder }
                      : { club: rep.awayClub, seed: awaySeed, score: rep.awayScore, fallbackId: rep.awayClubId, placeholder: rep.awayClubPlaceholder };

                    const isSingleMatch = s.matches.length === 1;
                    // Find the earliest upcoming (not yet Finished) game in this series for the footer
                    const nextGame = s.matches
                      .filter(m => m.status !== 'Finished')
                      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0] ?? null;

                    return (
                      <article key={`${phase.detail}-${s.id}-${idx}`} className="rounded-xl border border-gray-200 bg-white p-3">
                        <div className="space-y-2">
                          {[top, bottom].map((entry, i) => (
                            <div key={`${s.id}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">Seed {entry.seed ?? '-'}</p>
                                <p className="truncate text-sm font-medium text-gray-900">{getClubLabel(entry.club, entry.fallbackId, entry.placeholder)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">{isSingleMatch ? 'Score' : 'Series wins'}</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {isSingleMatch
                                    ? (entry.score ?? '-')
                                    : (getClubLabel(entry.club, entry.fallbackId, entry.placeholder) === 'TBD'
                                        ? '-'
                                        : (i === 0 ? s.winsHome : s.winsAway))}
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
                    );
                  });

                  // If expected slot count exists, fill with placeholders up to that count
                  if (expected && rendered.length < expected) {
                    const placeholders: JSX.Element[] = [];
                    for (let i = rendered.length; i < expected; i++) {
                      placeholders.push(
                        <article key={`empty-${phase.detail}-${i}`} className="rounded-xl border border-gray-200 bg-white p-3">
                          <div className="space-y-2">
                            {[0, 1].map((j) => (
                              <div key={`empty-${i}-${j}`} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500">Seed -</p>
                                  <p className="truncate text-sm font-medium text-gray-900">TBD</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Series wins</p>
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
                    return [...rendered, ...placeholders];
                  }

                  return rendered;
                })()}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}