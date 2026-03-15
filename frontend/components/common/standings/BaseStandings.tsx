"use client";

import React from 'react';
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
  const [viewType, setViewType] = React.useState<'all' | 'home' | 'away'>('all');
  const [group, setGroup] = React.useState<string>('all');

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

  // When seasons load or league changes, pick the default season for that league
  React.useEffect(() => {
    if (seasons && seasons.length > 0) {
      const defaultSeason = seasons.find((s: any) => s.flgDefault) || seasons[0];
      if (defaultSeason) setSeason(String(defaultSeason.id));
    } else {
      setSeason('');
    }
  }, [league, seasons]);

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
          setLeague(v);
          // refetch seasons for the new league
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
                  setLeague={setLeague}
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
            <div className="mt-2 text-sm text-gray-500 whitespace-nowrap">{scheduleIsDate ? 'Day' : 'Round'}: {roundOrDay}</div>
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
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-lg font-semibold">SCORES & FIXTURES</h2>
            <div className="mt-2 text-sm text-gray-500 whitespace-nowrap">{scheduleIsDate ? 'Day' : 'Round'}: {roundOrDay}</div>
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
                />
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
