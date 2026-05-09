"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { matchesApi, seasonsApi, standingZonesApi } from '@/lib/api/entities';
import { apiClient } from '@/lib/api/client';
import FilterBar from './FilterBar';
import StandingsTable from './StandingsTable';
import GamesList from './GamesList';
import PostseasonBracket from './PostseasonBracket';

type Props = {
  title?: string;
  hasGroups?: boolean;
  standings: any[];
  games: any[];
  // expose some control hooks optionally
  initialSeason?: string;
  leagues?: any[];
  initialLeagueId?: number | string;
  sportId?: number | null;
  sportKey?: string;
};

function getSeasonViewSelection(seasonData: any): {
  phase: string;
  detail: string;
} {
  if (!seasonData?.flgHasPostseason) {
    return {
      phase: 'Regular',
      detail: 'Regular',
    };
  }

  const phase = String(seasonData.currentPhase ?? 'Regular');
  const detail = String(
    seasonData.currentPhaseDetail ?? (phase === 'Play-ins' ? 'Play-ins' : 'Regular')
  );

  return {
    phase,
    detail,
  };
}

export default function BaseStandings({
  title = 'Standings',
  hasGroups = false,
  standings,
  games,
  leagues = [],
  initialLeagueId,
  sportId = null,
  sportKey,
}: Props) {
  const [season, setSeason] = React.useState<string>('');
  const [league, setLeague] = React.useState<string>(
    initialLeagueId ? String(initialLeagueId) : (leagues && leagues.length > 0 ? String(leagues[0].id) : '')
  );
  const [roundOrDay, setRoundOrDay] = React.useState<number | string>('');
  const [debouncedRoundOrDay, setDebouncedRoundOrDay] = React.useState<number | string>(roundOrDay);
  // Track which league we've already auto-selected the default season for, so that
  // a background React Query refetch of seasons data doesn't override the user's
  // manually-selected season.
  const autoSeasonLeagueRef = React.useRef<string>('');
  // The value shown next to the STANDING header. Only update this when the
  // selected round/day actually has rows in the standings table. If the user
  // selects a round/day with no standings rows, keep the previous displayed
  // value unchanged.
  const [displayRoundForStandings, setDisplayRoundForStandings] = React.useState<number | string>(roundOrDay);
  const [viewType, setViewType] = React.useState<'all' | 'home' | 'away'>('all');
  const [group, setGroup] = React.useState<string>('all');
  const [combineGroups, setCombineGroups] = React.useState(false);
  const [seasonPhase, setSeasonPhase] = React.useState<string>('Regular');
  const [seasonPhaseDetail, setSeasonPhaseDetail] = React.useState<string>('Regular');
  const [showUserTimezone, setShowUserTimezone] = useState(true);

  // Fetch seasons for the selected league
  const { data: seasonsData, refetch: refetchSeasons } = useQuery({
    queryKey: ['seasons', league],
    queryFn: () => (league ? seasonsApi.getByLeague(Number(league)) : Promise.resolve([])),
    enabled: Boolean(league),
    staleTime: 1000 * 60 * 5,
  });  

  const seasons = seasonsData || [];
  const selectedSeason = Array.isArray(seasons)
    ? seasons.find((item: any) => String(item.id) === String(season))
    : null;
  const selectedSeasonData: Record<string, unknown> | null = selectedSeason
    ? (selectedSeason as unknown as Record<string, unknown>)
    : null;
  const seasonHasGroups = Boolean(
    hasGroups || Number(selectedSeasonData?.numberOfGroups ?? selectedSeasonData?.number_of_groups ?? 0) > 0
  );
  const selectedSeasonHasPostseason = Boolean(selectedSeasonData?.flgHasPostseason);
  const isPostseasonView = selectedSeasonHasPostseason && seasonPhase !== 'Regular';
  const shouldAutoRefreshPostseasonBracket = Boolean(
    selectedSeasonHasPostseason &&
    selectedSeasonData?.flgDefault &&
    league &&
    season
  );

  React.useEffect(() => {
    if (!selectedSeasonData) {
      setSeasonPhase('Regular');
      setSeasonPhaseDetail('Regular');
      return;
    }

    const nextSelection = getSeasonViewSelection(selectedSeasonData);
    setSeasonPhase(nextSelection.phase);
    setSeasonPhaseDetail(nextSelection.detail);
  }, [selectedSeasonData]);

  React.useEffect(() => {
    if (seasonPhase === 'Regular') {
      setSeasonPhaseDetail('Regular');
    } else if (seasonPhase === 'Play-ins') {
      setSeasonPhaseDetail('Play-ins');
    } else if (seasonPhaseDetail === 'Regular' || seasonPhaseDetail === 'Play-ins') {
      setSeasonPhaseDetail(String(selectedSeasonData?.currentPhaseDetail ?? 'Round of 64'));
    }
  }, [seasonPhase, seasonPhaseDetail, selectedSeasonData]);
  const seasonGroupsQuery = useQuery({
    queryKey: ['seasonGroups', season],
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      if (!season) return [];
      try {
        const resp = await apiClient.get(`/v1/groups?seasonId=${Number(season)}`, { signal });
        const data = (resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
        return data;
      } catch (e) {
        return [];
      }
    },
    enabled: Boolean(season && seasonHasGroups),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
  const seasonGroups = Array.isArray(seasonGroupsQuery.data) ? seasonGroupsQuery.data : [];

  React.useEffect(() => {
    setCombineGroups(false);
  }, [season]);

  // Fetch rounds for the selected league+season once and cache via React Query
  const roundsQuery = useQuery({
    queryKey: ['rounds', league, season],
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      if (!league || !season) return [];
      try {
        const resp = await apiClient.get(`/v1/rounds?leagueId=${Number(league)}&seasonId=${Number(season)}`, { signal });
        const data = (resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
        return data;
      } catch (e) {
        if ((e as any)?.name === 'CanceledError' || (e as any)?.message === 'canceled') return [];
        return [];
      }
    },
    enabled: Boolean(league && season),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
  const selectedLeague = Array.isArray(leagues) ? leagues.find((l: any) => String(l.id) === String(league)) : null;
  const rawSchedule = selectedLeague && (selectedLeague.typeOfSchedule || selectedLeague.type_of_schedule || selectedLeague.scheduleType || selectedLeague.type || selectedLeague.type_of_schedule_code);
  const scheduleStr = rawSchedule !== undefined && rawSchedule !== null ? String(rawSchedule).toLowerCase() : '';
  const scheduleIsDate = scheduleStr.includes('date') || scheduleStr.includes('day') || scheduleStr.includes('calendar') || scheduleStr.includes('dt') || scheduleStr === '1' || scheduleStr === 'date_based';
  // Fetch standings and matches based on selected league/season/roundOrDay
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedRoundOrDay(roundOrDay), 300);
    return () => clearTimeout(id);
  }, [roundOrDay]);

  const standingsQuery = useQuery({
    queryKey: ['standings', league, season, String(debouncedRoundOrDay), group, viewType],
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      if (!league || !season) return [];
      const cooldown = (globalThis as any).__apiCooldownUntil;
      if (cooldown && Date.now() < cooldown) return [];
      try {
        let url = '';
        if (scheduleIsDate) {
          url = `/v1/standings?leagueId=${Number(league)}&seasonId=${Number(season)}&matchDate=${encodeURIComponent(String(debouncedRoundOrDay))}`;
        } else {
          // if user provided a round number (e.g. '1'), translate it to the DB round id
          let roundIdToUse: string | undefined = undefined;
          const maybeNum = Number(debouncedRoundOrDay);
          if (!isNaN(maybeNum)) {
            // try cached rounds from roundsQuery first
            const rdata = roundsQuery.data && Array.isArray(roundsQuery.data) ? roundsQuery.data : [];
            let found = rdata.find((rr: any) => Number(rr.roundNumber ?? rr.round ?? rr.round_number) === maybeNum);
            // if not found in cache, fetch rounds for the current league+season to ensure we match the correct season
            if (!found) {
              try {
                const rresp = await apiClient.get(`/v1/rounds?leagueId=${Number(league)}&seasonId=${Number(season)}`, { signal });
                const fresp = (rresp.data && Array.isArray(rresp.data)) ? rresp.data : (Array.isArray(rresp) ? rresp : []);
                found = fresp.find((rr: any) => Number(rr.roundNumber ?? rr.round ?? rr.round_number) === maybeNum);
              } catch (e) {
                // ignore - we'll fall back to using the provided value
              }
            }
            if (found) roundIdToUse = String(found.id ?? found.roundId ?? found.round_id ?? found.id);
          }
          const roundParam = roundIdToUse ? `roundId=${encodeURIComponent(String(roundIdToUse))}` : `roundId=${encodeURIComponent(String(debouncedRoundOrDay))}`;
          url = `/v1/standings?leagueId=${Number(league)}&seasonId=${Number(season)}&${roundParam}`;
        }
        if (!isPostseasonView) {
          url += `${url.includes('?') ? '&' : '?'}seasonPhase=Regular`;
        }
          // When not viewing postseason, only request Regular matches
          if (!isPostseasonView) url += `${url.includes('?') ? '&' : '?'}seasonPhase=Regular`;
          const resp = await apiClient.get(url, { signal });
        const data = (resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
        return data;
      } catch (e) {
        return [];
      }
    },
    enabled: Boolean(!isPostseasonView && league && season && debouncedRoundOrDay),
    
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 1;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

  // Fetch standing zones for the selected sport+league (includes season-null entries)
  const { data: standingZonesData } = useQuery({
    queryKey: ['standing-zones', sportId, league, season],
    queryFn: () => {
      if (!league) return Promise.resolve([]);
      // Request a large limit so we get all zones for this league (frontend needs the full set)
      return standingZonesApi.getFiltered({ sportId: sportId ?? undefined, leagueId: Number(league), seasonId: season ? Number(season) : undefined, page: 1, limit: 1000 })
        .then((res: any) => (res && res.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])));
    },
    enabled: Boolean(league),
    staleTime: 1000 * 60 * 5,
  });

  // Compute position -> color maps for combined and group tables based on rules
  const { combinedPositionColorMap, groupPositionColorMap } = React.useMemo(() => {
    const combined: Record<number, string> = {};
    const groupMap: Record<number, string> = {};
    const zones = Array.isArray(standingZonesData) ? standingZonesData : [];
    const selectedSeasonStart = Number(selectedSeasonData?.startYear ?? selectedSeasonData?.start_year ?? NaN);
    const selectedSeasonEnd = Number(selectedSeasonData?.endYear ?? selectedSeasonData?.end_year ?? NaN);

    const filtered = zones.filter((z: any) => {
      const zoneSeasonId = z.seasonId ?? z.season_id;

      if (!season) {
        return true;
      }

      // Explicit season binding always applies.
      if (zoneSeasonId !== null && typeof zoneSeasonId !== 'undefined') {
        return String(zoneSeasonId) === String(season);
      }

      // Season-null zones must still fully englobe the selected season years.
      const zoneStartRaw = z.start_year ?? z.startYear;
      const zoneEndRaw = z.end_year ?? z.endYear;
      const zoneStart = zoneStartRaw === null || typeof zoneStartRaw === 'undefined' ? null : Number(zoneStartRaw);
      const zoneEnd = zoneEndRaw === null || typeof zoneEndRaw === 'undefined' ? null : Number(zoneEndRaw);

      if (Number.isNaN(selectedSeasonStart) || Number.isNaN(selectedSeasonEnd)) {
        return zoneStart === null && zoneEnd === null;
      }

      const startOk = zoneStart === null || zoneStart <= selectedSeasonStart;
      const endOk = zoneEnd === null || zoneEnd >= selectedSeasonEnd;
      return startOk && endOk;
    });

    // Ensure deterministic override ordering: non-priority zones first, priority zones last.
    // This makes later entries (priority=true) override earlier ones when building the color map.
    const ordered = filtered.slice().sort((a: any, b: any) => {
      const aPri = Number(Boolean(a.flg_priority ?? a.flgPriority ?? false));
      const bPri = Number(Boolean(b.flg_priority ?? b.flgPriority ?? false));
      return aPri - bPri; // 0 before 1 => non-priority first, priority last
    });

    ordered.forEach((z: any) => {
      const start = Number(z.startPosition ?? z.start_position ?? z.startPosition);
      const end = Number(z.endPosition ?? z.end_position ?? z.endPosition);
      const color = z.colorHex ?? z.color_hex ?? z.colorHex ?? '#FFFFFF';
      const type = String(z.typeOfStanding ?? z.type_of_standing ?? 'All').toLowerCase();
      for (let p = start; p <= end; p++) {
        if (type === 'all') {
          combined[p] = color;
          groupMap[p] = color;
        } else if (type === 'combined') {
          combined[p] = color;
        } else if (type === 'group') {
          groupMap[p] = color;
        }
      }
    });

    return { combinedPositionColorMap: combined, groupPositionColorMap: groupMap };
  }, [standingZonesData, season]);

  // Update the displayed round/day for the standings header only when the
  // standings result contains rows for the current selection. This keeps the
  // STANDING header stable when the user picks a round/day that has no rows.
  React.useEffect(() => {
    const src = standingsQuery.data !== undefined ? standingsQuery.data : standings;
    const filtered = (Array.isArray(src) ? src : []).filter((s: any) => {
      if (!group || group === 'all') return true;
      return String(s.groupId ?? s.group?.id ?? s.group_id ?? '') === String(group);
    });
    if (Array.isArray(filtered) && filtered.length > 0) {
      setDisplayRoundForStandings(debouncedRoundOrDay);
    }
    // Intentionally do not change the displayed value when there are no rows.
  }, [standingsQuery.data, standings, debouncedRoundOrDay, group]);

  const matchesQuery = useQuery({
    queryKey: ['matches', sportId, league, season, String(debouncedRoundOrDay), group, viewType],
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      if (!league || !season) return [];
      const cooldown = (globalThis as any).__apiCooldownUntil;
      if (cooldown && Date.now() < cooldown) return [];
      try {
        const groupParam = group && group !== 'all' ? `&groupId=${encodeURIComponent(String(group))}` : '';
        let url = '';
        if (scheduleIsDate) {
          if (sportId) url = `/v1/matches?sportId=${Number(sportId)}&leagueId=${Number(league)}&seasonId=${Number(season)}&date=${encodeURIComponent(String(debouncedRoundOrDay))}${groupParam}`;
          else url = `/v1/matches?leagueId=${Number(league)}&seasonId=${Number(season)}&date=${encodeURIComponent(String(debouncedRoundOrDay))}${groupParam}`;
        } else {
          // For round-based leagues, translate displayed round number into DB round id when possible
          let roundIdToUse: string | undefined = undefined;
          const maybeNum = Number(debouncedRoundOrDay);
          if (!isNaN(maybeNum)) {
            // try cached rounds first
            const rdata = roundsQuery.data && Array.isArray(roundsQuery.data) ? roundsQuery.data : [];
            let found = rdata.find((rr: any) => Number(rr.roundNumber ?? rr.round ?? rr.round_number) === maybeNum);
            if (!found) {
              try {
                const rresp = await apiClient.get(`/v1/rounds?leagueId=${Number(league)}&seasonId=${Number(season)}`, { signal });
                const fresp = (rresp.data && Array.isArray(rresp.data)) ? rresp.data : (Array.isArray(rresp) ? rresp : []);
                found = fresp.find((rr: any) => Number(rr.roundNumber ?? rr.round ?? rr.round_number) === maybeNum);
              } catch (e) {
                // ignore and fall back to provided value
              }
            }
            if (found) roundIdToUse = String(found.id ?? found.roundId ?? found.round_id ?? found.id);
          }
          const roundParam = roundIdToUse ? `roundId=${encodeURIComponent(String(roundIdToUse))}` : `roundId=${encodeURIComponent(String(debouncedRoundOrDay))}`;
          if (sportId) url = `/v1/matches?sportId=${Number(sportId)}&leagueId=${Number(league)}&seasonId=${Number(season)}&${roundParam}${groupParam}`;
          else url = `/v1/matches?leagueId=${Number(league)}&seasonId=${Number(season)}&${roundParam}${groupParam}`;
        }
          // For round-based queries, restrict to Regular matches when not in postseason view
          if (!isPostseasonView) url += `${url.includes('?') ? '&' : '?'}seasonPhase=Regular`;
          const resp = await apiClient.get(url, { signal });
        const data = (resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
        return data;
      } catch (e) {
        return [];
      }
    },
    enabled: Boolean(!isPostseasonView && league && season && debouncedRoundOrDay),
    
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 1;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

  const postseasonBracketQuery = useQuery({
    queryKey: ['postseasonBracket', league, season, group, selectedSeasonData?.currentPhase, selectedSeasonData?.currentPhaseDetail],
    queryFn: () => matchesApi.getPostseasonBracket(Number(league), Number(season), group !== 'all' ? Number(group) : undefined),
    // Fetch whenever the season has a postseason (not just when already in postseason view),
    // so availablePhases/availablePhaseDetails are populated for the Phase dropdown immediately.
    enabled: Boolean(selectedSeasonHasPostseason && league && season),
    staleTime: shouldAutoRefreshPostseasonBracket ? 1000 * 30 : 1000 * 60 * 2,
    refetchOnMount: shouldAutoRefreshPostseasonBracket ? 'always' : false,
    refetchOnWindowFocus: shouldAutoRefreshPostseasonBracket ? 'always' : false,
    refetchInterval: shouldAutoRefreshPostseasonBracket ? 1000 * 30 : false,
    refetchIntervalInBackground: false,
  });

  // Derive the set of phases and details that actually exist in the bracket data.
  // Used to populate the Phase/Detail filter dropdowns dynamically.
  const BRACKET_DETAIL_ORDER = ['Play-ins', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals'];
  const bracketPhases: Array<{ phase: string; detail: string }> = React.useMemo(() => {
    const raw = postseasonBracketQuery.data as any;
    const rawPhases: Array<{ phase: string; detail: string }> = raw?.phases ?? [];
    if (!rawPhases.length) return [];
    // Sort by detail order
    return [...rawPhases]
      .filter((p) => p.detail && p.phase)
      .sort((a, b) => BRACKET_DETAIL_ORDER.indexOf(a.detail) - BRACKET_DETAIL_ORDER.indexOf(b.detail));
  }, [postseasonBracketQuery.data]);

  const availablePhases: string[] = React.useMemo(() => {
    if (!bracketPhases.length) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const p of bracketPhases) {
      if (!seen.has(p.phase)) { seen.add(p.phase); result.push(p.phase); }
    }
    return result;
  }, [bracketPhases]);

  const availablePhaseDetails: string[] = React.useMemo(() => {
    if (!bracketPhases.length) return [];
    const matching = bracketPhases.filter((p) => !seasonPhase || seasonPhase === 'Regular' || p.phase === seasonPhase);
    if (!matching.length) return [];
    const existingDetails = matching.map((p) => p.detail);

    // Playoffs are progressive: if Round of 16 exists then Quarterfinals/Semifinals/Finals
    // will also happen. Expand to include all subsequent rounds from the earliest present one.
    const PLAYOFFS_ORDER = ['Round of 64', 'Round of 32', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Finals'];
    const presentPlayoffDetails = existingDetails.filter((d) => PLAYOFFS_ORDER.includes(d));
    if (presentPlayoffDetails.length > 0) {
      const minIndex = Math.min(...presentPlayoffDetails.map((d) => PLAYOFFS_ORDER.indexOf(d)));
      const expanded = PLAYOFFS_ORDER.slice(minIndex);
      // Keep any non-playoff details (e.g. 'Play-ins') that are also in the result set
      const nonPlayoff = existingDetails.filter((d) => !PLAYOFFS_ORDER.includes(d));
      return [...nonPlayoff, ...expanded];
    }

    return existingDetails;
  }, [bracketPhases, seasonPhase]);

  // Fetch all matches for the selected season/league (used to compute historical last10)
  const allMatchesQuery = useQuery({
    queryKey: ['matchesAll', sportId, league, season],
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      if (!league || !season) return [];
      const cooldown = (globalThis as any).__apiCooldownUntil;
      if (cooldown && Date.now() < cooldown) return [];
      try {
        const sportParam = sportId ? `&sportId=${Number(sportId)}` : '';
        let url = `/v1/matches?leagueId=${Number(league)}&seasonId=${Number(season)}${sportParam}`;
        // allMatchesQuery is used for regular-view historical computations; only request Regular matches
        if (!isPostseasonView) url += `${url.includes('?') ? '&' : '?'}seasonPhase=Regular`;
        const resp = await apiClient.get(url, { signal });
        const data = (resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
        return data;
      } catch (e) {
        return [];
      }
    },
    enabled: Boolean(!isPostseasonView && league && season),
    
    staleTime: 1000 * 60 * 5,
  });

  // Map of clubId -> clubName (populated from matches and fetched as needed)
  const [clubsMap, setClubsMap] = React.useState<Record<string, string>>({});
  // Map of clubId -> full club name (from clubs table / API). Used for NBA display.
  const [clubsFullMap, setClubsFullMap] = React.useState<Record<string, string>>({});

  const getGroupId = React.useCallback((item: any) => String(item?.groupId ?? item?.group?.id ?? item?.group_id ?? ''), []);
  const filterItemsByGroup = React.useCallback((items: any[], groupId: string) => {
    return items.filter((item: any) => getGroupId(item) === String(groupId));
  }, [getGroupId]);


  // Populate clubsMap from matches when matches change
  React.useEffect(() => {
    const src = matchesQuery.data !== undefined ? matchesQuery.data : games;
    if (!Array.isArray(src)) return;
    const map: Record<string, string> = {};
    const fullMap: Record<string, string> = {};
    src.forEach((m: any) => {
      if (m.homeClub && m.homeClub.id) {
        map[String(m.homeClub.id)] = m.homeClub.short_name ?? m.homeClub.shortName ?? m.homeClub.name ?? m.homeClub.originalName ?? m.homeClub.fullName ?? m.homeClub.longName ?? m.homeClub.officialName ?? m.homeClub.clubName ?? '';
        fullMap[String(m.homeClub.id)] = m.homeClub.name ?? m.homeClub.fullName ?? m.homeClub.originalName ?? m.homeClub.longName ?? m.homeClub.officialName ?? m.homeClub.short_name ?? '';
      }
      if (m.awayClub && m.awayClub.id) {
        map[String(m.awayClub.id)] = m.awayClub.short_name ?? m.awayClub.shortName ?? m.awayClub.name ?? m.awayClub.originalName ?? m.awayClub.fullName ?? m.awayClub.longName ?? m.awayClub.officialName ?? m.awayClub.clubName ?? '';
        fullMap[String(m.awayClub.id)] = m.awayClub.name ?? m.awayClub.fullName ?? m.awayClub.originalName ?? m.awayClub.longName ?? m.awayClub.officialName ?? m.awayClub.short_name ?? '';
      }
    });
    if (Object.keys(map).length > 0) setClubsMap((prev) => ({ ...prev, ...map }));
    if (Object.keys(fullMap).length > 0) setClubsFullMap((prev) => ({ ...prev, ...fullMap }));
  }, [matchesQuery.data, games]);

  // Ensure club names exist for standings rows by fetching missing club records
  React.useEffect(() => {
    const src = standingsQuery.data !== undefined ? standingsQuery.data : standings;
    if (!Array.isArray(src)) return;
    const ids = new Set<string>();
    src.forEach((s: any) => {
      const id = s.clubId ?? s.club_id ?? s.club?.id ?? s.teamId ?? s.team_id ?? s.team?.id;
      if (id) ids.add(String(id));
    });

    const missing: string[] = [];
    ids.forEach((id) => {
      if (!clubsMap[String(id)]) missing.push(id);
    });

    if (missing.length === 0) return;

    let mounted = true;
    (async () => {
      try {
        const results = await Promise.all(missing.map((id) => apiClient.get(`/v1/clubs/${id}`).then((r: any) => r.data || r).catch(() => null)));
        const newMap: Record<string, string> = {};
        const newFullMap: Record<string, string> = {};
        results.forEach((res: any, i: number) => {
          const id = missing[i];
          if (res) {
            // Populate short-name-first map for compact displays
            const shortName = res.short_name ?? res.shortName ?? res.displayName ?? undefined;
            const longName = res.name ?? res.displayName ?? res.fullName ?? res.originalName ?? res.longName ?? undefined;
            if (shortName) newMap[String(id)] = shortName;
            else if (longName) newMap[String(id)] = longName;
            // Populate full-name map (prefer long name, fallback to short)
            if (longName) newFullMap[String(id)] = longName;
            else if (shortName) newFullMap[String(id)] = shortName;
          }
        });
        if (mounted && Object.keys(newMap).length > 0) setClubsMap((prev) => ({ ...prev, ...newMap }));
        if (mounted && Object.keys(newFullMap).length > 0) setClubsFullMap((prev) => ({ ...prev, ...newFullMap }));
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [standingsQuery.data, standings, clubsMap]);

  // When seasons load or league changes, pick the default season for that league.
  // We use autoSeasonLeagueRef to ensure we only auto-set the default season when
  // the league actually changes, NOT on every background React Query refetch of
  // seasons data (which would silently reset the user's manual season selection).
  React.useEffect(() => {
    if (seasons && seasons.length > 0) {
      if (autoSeasonLeagueRef.current !== league) {
        // League changed (or initial load) — auto-select the default season.
        autoSeasonLeagueRef.current = league;
        const defaultSeason = seasons.find((s: any) => s.flgDefault) || seasons[0];
        if (defaultSeason) setSeason(String(defaultSeason.id));
      }
      // else: same league, user may have manually picked a season — don't override.
    } else {
      // Seasons not yet loaded for this league. Clear selection and reset the ref
      // so that when seasons do load the default will be auto-selected.
      autoSeasonLeagueRef.current = '';
      setSeason('');
    }
  }, [league, seasons]);

  // When the user selects a season explicitly, set the season state and
  // also update the current view to the season's current phase/detail when
  // available. This ensures manual season selection jumps the page to the
  // appropriate phase (e.g. Play-ins / Round of 16) rather than leaving the
  // previously selected phase active.
  const onSeasonSelect = React.useCallback((newSeason: string) => {
    setSeason(String(newSeason));

    const currentSeasons = seasonsRef.current && Array.isArray(seasonsRef.current) ? seasonsRef.current : seasons;
    const seasonObj = Array.isArray(currentSeasons) ? currentSeasons.find((s: any) => String(s.id) === String(newSeason)) : null;
    if (!seasonObj) {
      setSeasonPhase('Regular');
      setSeasonPhaseDetail('Regular');
      return;
    }

    const nextSelection = getSeasonViewSelection(seasonObj);
    setSeasonPhase(nextSelection.phase);
    setSeasonPhaseDetail(nextSelection.detail);
  }, [seasons, setSeasonPhase, setSeasonPhaseDetail]);

  // Helper: determine if a season is finished.
  const isSeasonFinished = (s: any) => {
    if (!s) return false;
    if (s.status !== undefined) return String(s.status).toLowerCase() === 'finished';
    // Fallback: flgActive false + end date in the past
    if (s.flgActive !== undefined && Boolean(s.flgActive) === false) {
      try {
        const end = s.endDate ?? s.end_date;
        if (end && new Date() > new Date(end)) return true;
      } catch { /* ignore */ }
    }
    return false;
  };

  // Helper: determine if a season is active.
  // The Season DTO uses a `status` field: 'planned' | 'active' | 'finished'.
  const isSeasonActive = (s: any) => {
    if (!s) return false;
    // Primary check: explicit status field
    if (s.status !== undefined) return String(s.status).toLowerCase() === 'active';
    // Fallback: flgActive boolean
    if (s.flgActive !== undefined) return Boolean(s.flgActive);
    // Last resort: date range check
    try {
      const start = s.startDate ?? s.start_date;
      const end = s.endDate ?? s.end_date;
      if (!start) return false;
      const now = new Date();
      if (now < new Date(start)) return false;
      if (end && now > new Date(end)) return false;
      return true;
    } catch {
      return false;
    }
  };

  // Keep a ref of seasons so the round-selection effect can read current seasons
  // data without having `seasons` in its dependency array (which would cause a
  // spurious re-run — and potentially a round-reset to 1 — on every background
  // React Query refetch of seasons).
  const seasonsRef = React.useRef(seasons);

  React.useEffect(() => {
    seasonsRef.current = seasons;
  }, [seasons]);

  // Single effect: whenever league or season changes, determine the correct round.
  // Rules:
  //   active season   → flgCurrent round (or 1 if none flagged)
  //   finished season → last round (highest roundNumber in the season)
  //   planned/unknown → round 1
  // An AbortController cancels any stale in-flight fetch when league/season changes again.

  React.useEffect(() => {
    if (!season || !league) {
      setRoundOrDay('');
      setDebouncedRoundOrDay('');
      return;
    }

    // Read seasons from ref so we always have current data without a dep on `seasons`.
    const currentSeasons = seasonsRef.current;
    const seasonObj = currentSeasons && currentSeasons.length > 0
      ? currentSeasons.find((s: any) => String(s.id) === String(season))
      : null;

    const active = seasonObj && isSeasonActive(seasonObj);
    const finished = seasonObj && isSeasonFinished(seasonObj);

    // If date-based schedule, set day to today (active) or last match date (finished)
    if (scheduleIsDate) {
      let mounted = true;
      const controller = new AbortController();
      (async () => {
        try {
          // Fetch all matches for this league/season (include sportId to ensure correct filtering)
          const sportParam = sportId ? `&sportId=${Number(sportId)}` : '';
          const url = `/v1/matches?leagueId=${Number(league)}&seasonId=${Number(season)}${sportParam}`;
          const resp = await apiClient.get(url, { signal: controller.signal });
          const matches = (resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
          if (!mounted) return;
          if (matches.length === 0) {
            const todayStr = new Date().toISOString().slice(0, 10);
            setRoundOrDay(todayStr);
            setDebouncedRoundOrDay(todayStr);
            return;
          }
          // Extract all unique match dates in the season
          const matchDates = matches
            .map((m: any) => m.date ?? m.matchDate ?? m.datetime ?? m.dateTime)
            .filter(Boolean)
            .map((d: any) => d.slice(0, 10));
          const uniqueDates = Array.from(new Set(matchDates)).sort();
          if (uniqueDates.length === 0) {
            const todayStr = new Date().toISOString().slice(0, 10);
            setRoundOrDay(todayStr);
            setDebouncedRoundOrDay(todayStr);
            return;
          }
          const todayStr = new Date().toISOString().slice(0, 10);
          if (active) {
            // Find the closest date >= today, else closest before today
            let picked = uniqueDates.find((d) => d >= todayStr);
            if (!picked) {
              // Fallback: last date before today
              picked = uniqueDates.filter((d) => d < todayStr).at(-1);
            }
            setRoundOrDay(picked ?? uniqueDates[0]);
            setDebouncedRoundOrDay(picked ?? uniqueDates[0]);
          } else if (finished) {
            // Use the last match date in the season
            setRoundOrDay(uniqueDates.at(-1));
            setDebouncedRoundOrDay(uniqueDates.at(-1));
          } else {
            // Planned/unknown
            setRoundOrDay(uniqueDates[0]);
            setDebouncedRoundOrDay(uniqueDates[0]);
          }
        } catch (e) {
          if ((e as any)?.name === 'CanceledError' || (e as any)?.message === 'canceled') return;
          if (!mounted) return;
          const todayStr = new Date().toISOString().slice(0, 10);
          setRoundOrDay(todayStr);
          setDebouncedRoundOrDay(todayStr);
        }
      })();
      return () => {
        mounted = false;
        controller.abort();
      };
    }

    // Non-date-based: use round logic as before
    if (!active && !finished) {
      if (scheduleIsDate) {
        const todayStr = new Date().toISOString().slice(0, 10);
        setRoundOrDay(todayStr);
        setDebouncedRoundOrDay(todayStr);
      } else {
        setRoundOrDay(1);
        setDebouncedRoundOrDay(1);
      }
      return;
    }
    let mounted = true;
    const controller = new AbortController();
    (async () => {
      try {
        const resp = await apiClient.get(
          `/v1/rounds?leagueId=${Number(league)}&seasonId=${Number(season)}`,
          { signal: controller.signal }
        );
        const data = (resp.data && Array.isArray(resp.data))
          ? resp.data
          : (Array.isArray(resp) ? resp : []);
        if (!mounted) return;
        if (finished) {
          const nums = (data as any[])
            .map((rr: any) => Number(rr.roundNumber ?? rr.round ?? rr.round_number))
            .filter((n: number) => !isNaN(n) && n > 0);
          const lastRound = nums.length > 0 ? Math.max(...nums) : 1;
          setRoundOrDay(lastRound);
          setDebouncedRoundOrDay(lastRound);
        } else {
          const current = data.find((rr: any) =>
            rr.flgCurrent || rr.flg_current || rr.isCurrent || rr.current
          );
          if (current) {
            const num = Number(current.roundNumber ?? current.round ?? current.round_number ?? 1);
            const finalNum = isNaN(num) ? 1 : num;
            setRoundOrDay(finalNum);
            setDebouncedRoundOrDay(finalNum);
          } else {
            setRoundOrDay(1);
            setDebouncedRoundOrDay(1);
          }
        }
      } catch (e) {
        if ((e as any)?.name === 'CanceledError' || (e as any)?.message === 'canceled') return;
        if (!mounted) return;
        setRoundOrDay(1);
        setDebouncedRoundOrDay(1);
      }
    })();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [league, season, scheduleIsDate, sportId]);

  // If leagues prop changes and there's no selected league, initialize it
  React.useEffect(() => {
    if ((!league || league === '') && leagues && leagues.length > 0) {
      const init = initialLeagueId ? String(initialLeagueId) : String(leagues[0].id);
      setLeague(init);
    }
  }, [leagues, initialLeagueId]);

  // Derive the actual max round for the selected league+season from the rounds data.
  // This handles leagues that change team count between seasons (e.g. Ligue 1: 38 → 34 rounds).
  // When rounds are not yet loaded, returns undefined and FilterBar falls back to the
  // league-level number_of_rounds_matches.
  const effectiveMaxRound = React.useMemo(() => {
    if (!roundsQuery.data || !Array.isArray(roundsQuery.data) || roundsQuery.data.length === 0) return undefined;
    const nums = (roundsQuery.data as any[])
      .map((rr: any) => Number(rr.roundNumber ?? rr.round ?? rr.round_number))
      .filter((n: number) => !isNaN(n) && n > 0);
    return nums.length > 0 ? Math.max(...nums) : undefined;
  }, [roundsQuery.data]);

  // Clamp the selected round down to the effective max when rounds data loads for
  // the current league+season.  The FilterBar navigation buttons are also capped
  // so the user cannot go beyond this value once data is available.
  React.useEffect(() => {
    if (!effectiveMaxRound || scheduleIsDate) return;
    if (Number(roundOrDay) > effectiveMaxRound) {
      setRoundOrDay(effectiveMaxRound);
      setDebouncedRoundOrDay(effectiveMaxRound);
    }
  }, [effectiveMaxRound]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      <FilterBar
        season={season}
        setSeason={onSeasonSelect}
        league={league}
        setLeague={(v: any) => {
          // Reset the auto-season ref so the new league's default season is auto-selected.
          autoSeasonLeagueRef.current = '';
          setSeason('');
          setRoundOrDay('');
          setDebouncedRoundOrDay('');
          setLeague(v);
          setTimeout(() => refetchSeasons(), 0);
        }}
        selectedSeason={selectedSeason}
        seasonPhase={seasonPhase}
        setSeasonPhase={setSeasonPhase}
        seasonPhaseDetail={seasonPhaseDetail}
        setSeasonPhaseDetail={setSeasonPhaseDetail}
        availablePhases={availablePhases}
        availablePhaseDetails={availablePhaseDetails}
        roundOrDay={roundOrDay}
        setRoundOrDay={setRoundOrDay}
        viewType={viewType}
        setViewType={setViewType}
        group={group}
        setGroup={setGroup}
        hasGroups={hasGroups}
        leagues={leagues}
        seasons={seasons}
        showTop={true}
        showBottom={false}
        effectiveMaxRound={effectiveMaxRound}
        combineGroups={combineGroups}
        setCombineGroups={setCombineGroups}
        sportKey={sportKey}
      />

      {isPostseasonView ? (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{seasonPhase.toUpperCase()}</h2>
            {/* <div className="text-sm text-gray-500 whitespace-nowrap">Phase: {seasonPhaseDetail}</div> */}
          </div>
          {postseasonBracketQuery.isLoading ? (
            <div className="bg-white rounded-lg shadow p-4">Loading bracket...</div>
          ) : (
            <PostseasonBracket
              bracket={{ ...postseasonBracketQuery.data, groups: seasonGroups }}
              activePhase={seasonPhase}
              activePhaseDetail={seasonPhaseDetail}
              sportKey={sportKey}
            />
          )}
        </div>
      ) : (
      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        <div className="lg:basis-2/3 lg:flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-4 w-full">
              <h2 className="text-lg font-semibold">STANDING</h2>
              <div className="flex-1 ml-3">
                <FilterBar
                  season={season}
                  setSeason={onSeasonSelect}
                  league={league}
                  setLeague={(v: any) => {
                    autoSeasonLeagueRef.current = '';
                    setSeason('');
                    setRoundOrDay('');
                    setDebouncedRoundOrDay('');
                    setLeague(v);
                    setTimeout(() => refetchSeasons(), 0);
                  }}
                  selectedSeason={selectedSeason}
                  seasonPhase={seasonPhase}
                  setSeasonPhase={setSeasonPhase}
                  seasonPhaseDetail={seasonPhaseDetail}
                  setSeasonPhaseDetail={setSeasonPhaseDetail}
                  roundOrDay={roundOrDay}
                  setRoundOrDay={setRoundOrDay}
                  viewType={viewType}
                  setViewType={setViewType}
                  group={group}
                  setGroup={setGroup}
                  hasGroups={hasGroups}
                  leagues={leagues}
                  seasons={seasons}
                  showTop={false}
                  showBottom={true}
                  compact={true}
                  effectiveMaxRound={effectiveMaxRound}
                  combineGroups={combineGroups}
                  setCombineGroups={setCombineGroups}
                />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500 whitespace-nowrap">{scheduleIsDate ? 'Day' : 'Round'}: {displayRoundForStandings}</div>
          </div>
          {standingsQuery.isLoading ? (
            <div className="bg-white rounded-lg shadow p-4">Loading standings...</div>
          ) : (
            (() => {
              const source = standingsQuery.data !== undefined ? standingsQuery.data : standings;
              const filtered = (Array.isArray(source) ? source : []).filter((s: any) => {
                if (!group || group === 'all') return true;
                return getGroupId(s) === String(group);
              });
              // determine cutoff / historical-match set for Last-5 / Last-10 computation
              let cutoffDate: string | undefined = undefined;
              // Prefer server-wide matches when available, otherwise fall back to the `games` prop
              let historicalMatchesForTable: any[] = Array.isArray(allMatchesQuery.data) && allMatchesQuery.data.length > 0
                ? (allMatchesQuery.data as any[])
                : (Array.isArray(games) ? games : []);

              if (scheduleIsDate) {
                cutoffDate = String(roundOrDay);
              } else {
                const currentRoundNum = Number(debouncedRoundOrDay);
                if (!isNaN(currentRoundNum) && Array.isArray(roundsQuery.data) && roundsQuery.data.length > 0) {
                  const eligibleRoundIds = new Set(
                    (roundsQuery.data as any[])
                      .filter((rr: any) => Number(rr.roundNumber ?? rr.round ?? rr.round_number) <= currentRoundNum)
                      .map((rr: any) => String(rr.id ?? rr.roundId ?? rr.round_id))
                  );
                  if (eligibleRoundIds.size > 0) {
                    historicalMatchesForTable = historicalMatchesForTable.filter((m: any) => {
                      const rid = String(m.roundId ?? m.round_id ?? m.round?.id ?? '');
                      return eligibleRoundIds.has(rid);
                    });
                  }
                } else {
                  const srcMatches = matchesQuery.data !== undefined ? matchesQuery.data : games;
                  if (Array.isArray(srcMatches) && srcMatches.length > 0) {
                    const dates = srcMatches
                      .map((m: any) => m.date ?? m.matchDate ?? m.datetime ?? m.dateTime)
                      .filter(Boolean)
                      .map((d: any) => new Date(d).toISOString());
                    if (dates.length > 0) cutoffDate = dates.sort().at(-1);
                  }
                }
              }

              const currentMatches = (matchesQuery.data !== undefined ? matchesQuery.data : games) as any[];
                  const buildTable = (rows: any[], _activeGroupId?: string, teamHeaderLabel?: string) => {
                return (
                  <StandingsTable
                    rows={rows}
                    clubsMap={clubsMap}
                        clubsFullMap={clubsFullMap}
                    historicalMatches={historicalMatchesForTable}
                    cutoffDate={cutoffDate}
                    currentMatches={currentMatches}
                    viewType={viewType}
                    teamHeaderLabel={teamHeaderLabel}
                    positionColorMap={_activeGroupId ? groupPositionColorMap : combinedPositionColorMap}
                    sportKey={sportKey}
                    leagueKey={selectedLeague?.secondaryName ?? selectedLeague?.originalName ?? undefined}
                  />
                );
              };

              const shouldRenderSeparateGroups = seasonHasGroups && group === 'all' && !combineGroups;
              let renderedTables: React.ReactNode;
              if (!shouldRenderSeparateGroups) {
                const isSingleGroupView = Boolean(group && group !== 'all');
                renderedTables = (
                  <StandingsTable
                    rows={filtered}
                    clubsMap={clubsMap}
                    clubsFullMap={clubsFullMap}
                    historicalMatches={historicalMatchesForTable}
                    cutoffDate={cutoffDate}
                    currentMatches={currentMatches}
                    viewType={viewType}
                    positionColorMap={isSingleGroupView ? groupPositionColorMap : combinedPositionColorMap}
                    sportKey={sportKey}
                    leagueKey={selectedLeague?.secondaryName ?? selectedLeague?.originalName ?? undefined}
                  />
                );
              } else {
                const fallbackGroups = Array.from(new Set(filtered.map((row: any) => getGroupId(row)).filter(Boolean))).map((groupId) => ({
                  id: groupId,
                  name: `Group ${groupId}`,
                }));
                const groupsToRender = seasonGroups.length > 0 ? seasonGroups : fallbackGroups;
                renderedTables = (
                  <div className="space-y-6">
                    {groupsToRender.map((seasonGroup: any) => {
                      const seasonGroupId = String(seasonGroup.id);
                      const groupRows = filterItemsByGroup(filtered, seasonGroupId);
                      if (groupRows.length === 0) return null;

                      const groupName = seasonGroup.name ?? seasonGroup.originalName ?? seasonGroup.code ?? `Group ${seasonGroupId}`;
                      return (
                        <section key={seasonGroupId}>
                          {buildTable(groupRows, seasonGroupId, `TEAM (${groupName})`)}
                        </section>
                      );
                    })}
                  </div>
                );
              }

              // Compute applicable zones for legend
              const zones = Array.isArray(standingZonesData) ? standingZonesData : [];
              const applicableZones = zones
                .filter((z: any) => z == null ? false : (z.seasonId === null || typeof z.seasonId === 'undefined' || String(z.seasonId) === String(season)))
                .filter((z: any) => {
                  const type = String(z.typeOfStanding ?? z.type_of_standing ?? 'All').toLowerCase();
                  if (shouldRenderSeparateGroups) return type === 'all' || type === 'group';
                  const isSingleGroupView = Boolean(group && group !== 'all');
                  if (isSingleGroupView) return type === 'all' || type === 'group';
                  return type === 'all' || type === 'combined';
                });

              const uniq: any[] = [];
              // Deduplicate by normalized name (case-insensitive). If name is empty,
              // fallback to dedupe by color so unnamed zones don't collapse incorrectly.
              const byName = new Map<string, { name: string; color: string }>();
              applicableZones.forEach((z: any) => {
                const color = z.colorHex ?? z.color_hex ?? '#FFFFFF';
                const rawName = (z.name ?? '') as string;
                const normalized = rawName && String(rawName).trim() ? String(rawName).trim().toLowerCase() : '';
                const key = normalized || `__color__${color}`;
                if (!byName.has(key)) {
                  byName.set(key, { name: rawName || '', color });
                }
              });
              byName.forEach((v) => uniq.push(v));

              const legend = uniq.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-4 items-center">
                  {uniq.map((z, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <span style={{ width: 14, height: 14, background: z.color, display: 'inline-block', borderRadius: 3, border: '1px solid #e5e7eb' }} />
                      <span>{z.name}</span>
                    </div>
                  ))}
                </div>
              ) : null;

              return (
                <div>
                  {renderedTables}
                  {legend}
                </div>
              );
            })()
          )}
        </div>

        <div className="lg:basis-1/3">
          <div className="flex items-center justify-between mb-3 mt-1">
            <h2 className="text-lg font-semibold">SCORES & FIXTURES</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Local Timezone</span>
                <button
                  type="button"
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    showUserTimezone ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  onClick={() => setShowUserTimezone(!showUserTimezone)}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      showUserTimezone ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="text-sm text-gray-500 whitespace-nowrap">{scheduleIsDate ? 'Day' : 'Round'}: {roundOrDay}</div>
            </div>
          </div>
          {matchesQuery.isLoading ? (
            <div className="bg-white rounded-lg shadow p-4">Loading games...</div>
          ) : (
            (() => {
              const src = matchesQuery.data !== undefined ? matchesQuery.data : games;
              const list = Array.isArray(src) ? src.map((m: any) => {
                const stadium = m.stadium?.name ?? m.stadiumName ?? m.stadium?.originalName ?? m.stadiumId ?? '';
                const dateTime = m.date ?? m.dateTime ?? m.matchDate ?? m.datetime ?? '';
                // const homeName = m.homeClub?.short_name ?? m.homeClub?.shortName ?? m.homeClub?.name ?? m.homeClub?.originalName ?? m.homeClubPlaceholder ?? (m.homeClubId ? clubsMap[String(m.homeClubId)] : undefined) ?? (m.homeClubId ? `#${m.homeClubId}` : undefined) ?? 'TBD';
                const homeName = m.homeClub?.name ?? m.homeClub?.short_name ?? m.homeClub?.shortName ?? m.homeClub?.originalName ?? m.homeClubPlaceholder ?? (m.homeClubId ? clubsMap[String(m.homeClubId)] : undefined) ?? (m.homeClubId ? `#${m.homeClubId}` : undefined) ?? 'TBD';
                const awayName = m.awayClub?.name ?? m.awayClub?.short_name ?? m.awayClub?.shortName ?? m.awayClub?.originalName ?? m.awayClubPlaceholder ?? (m.awayClubId ? clubsMap[String(m.awayClubId)] : undefined) ?? (m.awayClubId ? `#${m.awayClubId}` : undefined) ?? 'TBD';
                const status = m.status ?? m.matchStatus ?? null;
                const score = (typeof m.homeScore !== 'undefined' && typeof m.awayScore !== 'undefined') ? `${m.homeScore} - ${m.awayScore}` : (m.homeScore || m.awayScore ? `${m.homeScore ?? 0}-${m.awayScore ?? 0}` : null);
                return {
                  id: m.id ?? `${m.homeClubId || m.homeClub?.id || 'h'}-${m.awayClubId || m.awayClub?.id || 'a'}`,
                  stadium,
                  dateTime,
                  home: {
                    name: homeName ?? '',
                    image: m.homeClub?.imageUrl ?? m.homeClub?.image_url ?? m.homeClub?.logoUrl ?? m.homeClub?.image ?? undefined,
                  },
                  away: {
                    name: awayName ?? '',
                    image: m.awayClub?.imageUrl ?? m.awayClub?.image_url ?? m.awayClub?.logoUrl ?? m.awayClub?.image ?? undefined,
                  },
                  status,
                  score,
                };
              }) : [];

              return (
                <GamesList
                  games={list}
                  isLoading={matchesQuery.isLoading}
                  error={matchesQuery.isError ? (matchesQuery.error instanceof Error ? matchesQuery.error.message : String(matchesQuery.error)) : null}
                  onRetry={() => matchesQuery.refetch()}
                  showUserTimezone={showUserTimezone}
                  matchCountry={selectedLeague?.country?.name ?? undefined}
                />
              );
            })()
          )}
        </div>
      </div>
      )}
    </div>
  );
}