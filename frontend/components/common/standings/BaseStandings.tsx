"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { seasonsApi } from '@/lib/api/entities';
import { apiClient } from '@/lib/api/client';
import FilterBar from './FilterBar';
import StandingsTable from './StandingsTable';
import GamesList from './GamesList';

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
};

export default function BaseStandings({
  title = 'Standings',
  hasGroups = false,
  standings,
  games,
  leagues = [],
  initialLeagueId,
  sportId = null,
}: Props) {
  const [season, setSeason] = React.useState<string>('');
  const [league, setLeague] = React.useState<string>(
    initialLeagueId ? String(initialLeagueId) : (leagues && leagues.length > 0 ? String(leagues[0].id) : '')
  );
  const [roundOrDay, setRoundOrDay] = React.useState<number | string>(1);
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
  const [showUserTimezone, setShowUserTimezone] = useState(false);

  // Fetch seasons for the selected league
  const { data: seasonsData, refetch: refetchSeasons } = useQuery({
    queryKey: ['seasons', league],
    queryFn: () => (league ? seasonsApi.getByLeague(Number(league)) : Promise.resolve([])),
    enabled: Boolean(league),
    staleTime: 1000 * 60 * 5,
  });
  
  

  const seasons = seasonsData || [];
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
        const resp = await apiClient.get(url, { signal });
        const data = (resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
        return data;
      } catch (e) {
        return [];
      }
    },
    enabled: Boolean(league && season && debouncedRoundOrDay !== undefined && debouncedRoundOrDay !== null),
    
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 1;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

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
        const resp = await apiClient.get(url, { signal });
        const data = (resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
        return data;
      } catch (e) {
        return [];
      }
    },
    enabled: Boolean(league && season && debouncedRoundOrDay !== undefined && debouncedRoundOrDay !== null),
    
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 429) return false;
      return failureCount < 1;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

  // Fetch all matches for the selected season/league (used to compute historical last10)
  const allMatchesQuery = useQuery({
    queryKey: ['matchesAll', sportId, league, season],
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      if (!league || !season) return [];
      const cooldown = (globalThis as any).__apiCooldownUntil;
      if (cooldown && Date.now() < cooldown) return [];
      try {
        const sportParam = sportId ? `&sportId=${Number(sportId)}` : '';
        const url = `/v1/matches?leagueId=${Number(league)}&seasonId=${Number(season)}${sportParam}`;
        const resp = await apiClient.get(url, { signal });
        const data = (resp.data && Array.isArray(resp.data)) ? resp.data : (Array.isArray(resp) ? resp : []);
        return data;
      } catch (e) {
        return [];
      }
    },
    enabled: Boolean(league && season),
    
    staleTime: 1000 * 60 * 5,
  });

  // Map of clubId -> clubName (populated from matches and fetched as needed)
  const [clubsMap, setClubsMap] = React.useState<Record<string, string>>({});


  // Populate clubsMap from matches when matches change
  React.useEffect(() => {
    const src = matchesQuery.data !== undefined ? matchesQuery.data : games;
    if (!Array.isArray(src)) return;
    const map: Record<string, string> = {};
    src.forEach((m: any) => {
      if (m.homeClub && m.homeClub.id) {
        map[String(m.homeClub.id)] = m.homeClub.short_name ?? m.homeClub.shortName ?? m.homeClub.name ?? m.homeClub.originalName ?? m.homeClub.fullName ?? m.homeClub.longName ?? m.homeClub.officialName ?? m.homeClub.clubName ?? '';
      }
      if (m.awayClub && m.awayClub.id) {
        map[String(m.awayClub.id)] = m.awayClub.short_name ?? m.awayClub.shortName ?? m.awayClub.name ?? m.awayClub.originalName ?? m.awayClub.fullName ?? m.awayClub.longName ?? m.awayClub.officialName ?? m.awayClub.clubName ?? '';
      }
    });
    if (Object.keys(map).length > 0) setClubsMap((prev) => ({ ...prev, ...map }));
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
        results.forEach((res: any, i: number) => {
          const id = missing[i];
          if (res) {
            const name = res.short_name ?? res.shortName ?? res.displayName ?? res.name ?? res.originalName ?? res.fullName ?? res.longName ?? res.officialName ?? res.clubName;
            if (name) newMap[String(id)] = name;
          }
        });
        if (mounted && Object.keys(newMap).length > 0) setClubsMap((prev) => ({ ...prev, ...newMap }));
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
  seasonsRef.current = seasons;

  // Single effect: whenever league or season changes, determine the correct round.
  // Rules: inactive/missing season → round 1; active season → flgCurrent round (or 1 if none).
  // An AbortController cancels any stale in-flight fetch when league/season changes again.
  React.useEffect(() => {
    if (!season || !league) {
      setRoundOrDay(1);
      setDebouncedRoundOrDay(1);
      return;
    }

    // Read seasons from ref so we always have current data without a dep on `seasons`.
    const currentSeasons = seasonsRef.current;
    const seasonObj = currentSeasons && currentSeasons.length > 0
      ? currentSeasons.find((s: any) => String(s.id) === String(season))
      : null;

    if (!seasonObj || !isSeasonActive(seasonObj)) {
      setRoundOrDay(1);
      setDebouncedRoundOrDay(1);
      return;
    }

    // Season is active — fetch rounds fresh to find the flgCurrent round.
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
  }, [league, season]);

  // If leagues prop changes and there's no selected league, initialize it
  React.useEffect(() => {
    if ((!league || league === '') && leagues && leagues.length > 0) {
      const init = initialLeagueId ? String(initialLeagueId) : String(leagues[0].id);
      setLeague(init);
    }
  }, [leagues, initialLeagueId]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{title}</h1>

      <FilterBar
        season={season}
        setSeason={setSeason}
        league={league}
        setLeague={(v: any) => {
          // Reset the auto-season ref so the new league's default season is auto-selected.
          autoSeasonLeagueRef.current = '';
          setSeason('');
          setRoundOrDay(1);
          setDebouncedRoundOrDay(1);
          setLeague(v);
          setTimeout(() => refetchSeasons(), 0);
        }}
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
      />

      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        <div className="lg:basis-2/3 lg:flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-4 w-full">
              <h2 className="text-lg font-semibold">STANDING</h2>
              <div className="flex-1 ml-3">
                <FilterBar
                  season={season}
                  setSeason={setSeason}
                  league={league}
                  setLeague={(v: any) => {
                    autoSeasonLeagueRef.current = '';
                    setSeason('');
                    setRoundOrDay(1);
                    setDebouncedRoundOrDay(1);
                    setLeague(v);
                    setTimeout(() => refetchSeasons(), 0);
                  }}
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
                return String(s.groupId ?? s.group?.id ?? s.group_id ?? '') === String(group);
              });
              // determine cutoff / historical-match set for Last-5 / Last-10 computation
              let cutoffDate: string | undefined = undefined;
              let historicalMatchesForTable: any[] = (allMatchesQuery.data || []) as any[];

              if (scheduleIsDate) {
                cutoffDate = String(roundOrDay);
              } else {
                // For round-based schedules use round-number filtering instead of date
                // filtering. A postponed game that was played AFTER a later round's
                // calendar start still belongs to its own (earlier) round in the DB, so
                // it must be included when the user views that later round. Date-based
                // cuts would incorrectly exclude it.
                const currentRoundNum = Number(debouncedRoundOrDay);
                if (!isNaN(currentRoundNum) && Array.isArray(roundsQuery.data) && roundsQuery.data.length > 0) {
                  // Build the set of roundIds whose roundNumber <= currentRoundNum
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
                  // cutoffDate stays undefined → StandingsTable won't apply date filtering
                } else {
                  // Fallback when rounds data is unavailable: use latest date in current round
                  const srcMatches = matchesQuery.data !== undefined ? matchesQuery.data : games;
                  if (Array.isArray(srcMatches) && srcMatches.length > 0) {
                    const dates = srcMatches
                      .map((m: any) => m.date ?? m.matchDate ?? m.datetime ?? m.dateTime)
                      .filter(Boolean)
                      .map((d: any) => new Date(d).toISOString());
                    if (dates.length > 0) cutoffDate = dates.sort().at(-1); // latest, not earliest
                  }
                }
              }

              const currentMatches = (matchesQuery.data !== undefined ? matchesQuery.data : games) as any[];
              return <StandingsTable rows={filtered} clubsMap={clubsMap} historicalMatches={historicalMatchesForTable} cutoffDate={cutoffDate} currentMatches={currentMatches} viewType={viewType} />;
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
                const homeName = m.homeClub?.short_name ?? m.homeClub?.shortName ?? m.homeClub?.name ?? m.homeClub?.originalName ?? (m.homeClubId ? clubsMap[String(m.homeClubId)] : undefined) ?? (m.homeClubId ? `#${m.homeClubId}` : undefined);
                const awayName = m.awayClub?.short_name ?? m.awayClub?.shortName ?? m.awayClub?.name ?? m.awayClub?.originalName ?? (m.awayClubId ? clubsMap[String(m.awayClubId)] : undefined) ?? (m.awayClubId ? `#${m.awayClubId}` : undefined);
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
    </div>
  );
}