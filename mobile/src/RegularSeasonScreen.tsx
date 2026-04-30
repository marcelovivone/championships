import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchLeagues,
  fetchMatchesSlice,
  fetchRounds,
  fetchSeasonClubs,
  fetchSeasonMatches,
  fetchSeasons,
  fetchSports,
  fetchStandings,
  getApiBaseUrl,
  type League,
  type Match,
  type Round,
  type Season,
  type SeasonClub,
  type Sport,
  type Standing,
} from './api';

type SelectorOption = {
  key: string;
  label: string;
};

type StandingGroupSection = {
  key: string;
  title: string;
  standings: Standing[];
};

function normalizeText(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function getSportLabel(sport: Sport): string {
  return sport.reducedName || sport.name || `Sport ${sport.id}`;
}

function getLeagueLabel(league: League): string {
  return String(league.originalName || league.secondaryName || `League ${league.id}`);
}

function getSeasonLabel(season: Season): string {
  return `${season.startYear}/${season.endYear}`;
}

function isSeasonFinished(season?: Season | null): boolean {
  return normalizeText(season?.status) === 'finished';
}

function isSeasonActive(season?: Season | null): boolean {
  return normalizeText(season?.status) === 'active';
}

function isDateBased(league?: League | null): boolean {
  return normalizeText(league?.typeOfSchedule).includes('date');
}

function pickPreferredSport(sports: Sport[]): Sport | null {
  return (
    sports.find((sport) => normalizeText(sport.name).includes('basketball')) ||
    sports.find((sport) => sport.flgDefault) ||
    sports[0] ||
    null
  );
}

function pickPreferredLeague(leagues: League[], sport?: Sport | null): League | null {
  const isBasketball = normalizeText(sport?.name).includes('basketball');

  if (isBasketball) {
    const nba = leagues.find((league) => normalizeText(getLeagueLabel(league)).includes('nba'));
    if (nba) {
      return nba;
    }
  }

  return leagues.find((league) => league.flgDefault) || leagues[0] || null;
}

function pickPreferredSeason(seasons: Season[]): Season | null {
  return (
    seasons.find((season) => season.flgDefault) ||
    seasons.find((season) => isSeasonActive(season)) ||
    seasons[0] ||
    null
  );
}

function pickPreferredRound(rounds: Round[], season?: Season | null): Round | null {
  if (!rounds.length) {
    return null;
  }

  if (isSeasonFinished(season)) {
    return [...rounds].sort((left, right) => Number(right.roundNumber) - Number(left.roundNumber))[0] || rounds[0];
  }

  return rounds.find((round) => Boolean(round.flgCurrent)) || rounds[0] || null;
}

function pickPreferredDate(dates: string[], season?: Season | null): string | null {
  if (!dates.length) {
    return null;
  }

  if (isSeasonFinished(season)) {
    return dates[dates.length - 1] || null;
  }

  if (!isSeasonActive(season)) {
    return dates[0] || null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const nextDate = dates.find((date) => date >= today);
  if (nextDate) {
    return nextDate;
  }

  const previousDates = dates.filter((date) => date < today);
  return previousDates[previousDates.length - 1] || dates[0] || null;
}

function getStandingPosition(standing: Standing, index: number): number {
  const direct = Number(standing.position ?? standing.rank);
  return Number.isFinite(direct) && direct > 0 ? direct : index + 1;
}

function formatRecord(standing: Standing): string {
  if (Number(standing.draws || 0) > 0) {
    return `${standing.wins}-${standing.draws}-${standing.losses}`;
  }

  return `${standing.wins}-${standing.losses}`;
}

function formatBasketballPct(standing: Standing): string {
  const rawPct = Number(standing.pct ?? standing.percentage);

  if (Number.isFinite(rawPct)) {
    const normalized = rawPct > 1 ? rawPct / 100 : rawPct;
    return normalized.toFixed(3).replace(/^0(?=\.)/, '');
  }

  if (standing.played <= 0) {
    return '.000';
  }

  return (standing.wins / standing.played).toFixed(3).replace(/^0(?=\.)/, '');
}

function getGroupLabel(seasonClub: SeasonClub): string | null {
  return seasonClub.group?.name || seasonClub.group?.originalName || seasonClub.group?.code || null;
}

function getSeasonGroupData(seasonClubs: SeasonClub[]): {
  clubGroupMap: Record<number, number>;
  groupLabelMap: Record<number, string>;
  groupOrder: number[];
} {
  return seasonClubs.reduce<{
    clubGroupMap: Record<number, number>;
    groupLabelMap: Record<number, string>;
    groupOrder: number[];
  }>(
    (result, seasonClub) => {
      const groupId = Number(seasonClub.groupId);

      if (!Number.isFinite(groupId) || groupId <= 0) {
        return result;
      }

      result.clubGroupMap[seasonClub.clubId] = groupId;

      if (!result.groupOrder.includes(groupId)) {
        result.groupOrder.push(groupId);
      }

      const label = getGroupLabel(seasonClub);
      if (label && !result.groupLabelMap[groupId]) {
        result.groupLabelMap[groupId] = label;
      }

      return result;
    },
    {
      clubGroupMap: {},
      groupLabelMap: {},
      groupOrder: [],
    },
  );
}

function getStandingGroupId(standing: Standing, clubGroupMap: Record<number, number>): number | null {
  const directGroupId = Number(standing.groupId);
  if (Number.isFinite(directGroupId) && directGroupId > 0) {
    return directGroupId;
  }

  const fallbackGroupId = Number(clubGroupMap[standing.clubId]);
  return Number.isFinite(fallbackGroupId) && fallbackGroupId > 0 ? fallbackGroupId : null;
}

function getClubNameMap(seasonClubs: SeasonClub[]): Record<number, string> {
  return seasonClubs.reduce<Record<number, string>>((clubMap, seasonClub) => {
    const label = seasonClub.club?.shortName || seasonClub.club?.short_name || seasonClub.club?.name;
    if (label) {
      clubMap[seasonClub.clubId] = label;
    }
    return clubMap;
  }, {});
}

function getStandingTeamLabel(standing: Standing, clubMap: Record<number, string>): string {
  return (
    standing.club?.shortName ||
    standing.club?.short_name ||
    clubMap[standing.clubId] ||
    standing.club?.name ||
    `Club ${standing.clubId}`
  );
}

function getMatchTeamLabel(
  match: Match,
  side: 'home' | 'away',
  clubMap: Record<number, string>,
): string {
  if (side === 'home') {
    return (
      match.homeClub?.shortName ||
      match.homeClub?.short_name ||
      (match.homeClubId ? clubMap[match.homeClubId] : undefined) ||
      match.homeClub?.name ||
      match.homeClubPlaceholder ||
      (match.homeClubId ? `Club ${match.homeClubId}` : 'TBD')
    );
  }

  return (
    match.awayClub?.shortName ||
    match.awayClub?.short_name ||
    (match.awayClubId ? clubMap[match.awayClubId] : undefined) ||
    match.awayClub?.name ||
    match.awayClubPlaceholder ||
    (match.awayClubId ? `Club ${match.awayClubId}` : 'TBD')
  );
}

function formatMatchDate(value?: string | null): string {
  if (!value) {
    return 'No date';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SelectorStrip(props: {
  title: string;
  options: SelectorOption[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  emptyLabel: string;
}) {
  const { title, options, selectedKey, onSelect, emptyLabel } = props;

  return (
    <View style={styles.selectorBlock}>
      <Text style={styles.selectorTitle}>{title}</Text>
      {options.length === 0 ? (
        <Text style={styles.selectorEmptyText}>{emptyLabel}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
          {options.map((option) => {
            const selected = option.key === selectedKey;

            return (
              <Pressable
                key={option.key}
                onPress={() => onSelect(option.key)}
                style={[styles.selectorChip, selected ? styles.selectorChipSelected : null]}
              >
                <Text style={[styles.selectorChipText, selected ? styles.selectorChipTextSelected : null]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function SectionCard(props: {
  title: string;
  subtitle?: string;
  rightText?: string;
  children: React.ReactNode;
}) {
  const { title, subtitle, rightText, children } = props;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {rightText ? <Text style={styles.sectionMeta}>{rightText}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.centeredState}>
      <ActivityIndicator size="small" color="#1f3c88" />
      <Text style={styles.centeredStateText}>{label}</Text>
    </View>
  );
}

function ErrorState(props: { label: string; onRetry: () => void }) {
  return (
    <View style={styles.centeredState}>
      <Text style={styles.errorText}>{props.label}</Text>
      <Pressable onPress={props.onRetry} style={styles.retryButton}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

export default function RegularSeasonScreen() {
  const queryClient = useQueryClient();
  const [sportId, setSportId] = React.useState<number | null>(null);
  const [leagueId, setLeagueId] = React.useState<number | null>(null);
  const [seasonId, setSeasonId] = React.useState<number | null>(null);
  const [roundId, setRoundId] = React.useState<number | null>(null);
  const [matchDate, setMatchDate] = React.useState<string | null>(null);

  const sportsQuery = useQuery({
    queryKey: ['mobile', 'sports'],
    queryFn: fetchSports,
  });

  const sports = sportsQuery.data ?? [];

  React.useEffect(() => {
    if (!sports.length) {
      return;
    }

    setSportId((current) => {
      if (current && sports.some((sport) => sport.id === current)) {
        return current;
      }

      return pickPreferredSport(sports)?.id ?? null;
    });
  }, [sports]);

  const selectedSport = React.useMemo(
    () => sports.find((sport) => sport.id === sportId) || null,
    [sports, sportId],
  );

  const leaguesQuery = useQuery({
    queryKey: ['mobile', 'leagues', sportId],
    queryFn: () => fetchLeagues(sportId as number),
    enabled: sportId !== null,
  });

  const leagues = leaguesQuery.data ?? [];

  React.useEffect(() => {
    if (!leagues.length) {
      setLeagueId(null);
      return;
    }

    setLeagueId((current) => {
      if (current && leagues.some((league) => league.id === current)) {
        return current;
      }

      return pickPreferredLeague(leagues, selectedSport)?.id ?? null;
    });
  }, [leagues, selectedSport]);

  const selectedLeague = React.useMemo(
    () => leagues.find((league) => league.id === leagueId) || null,
    [leagues, leagueId],
  );

  const seasonsQuery = useQuery({
    queryKey: ['mobile', 'seasons', leagueId],
    queryFn: () => fetchSeasons(leagueId as number),
    enabled: leagueId !== null,
  });

  const seasons = seasonsQuery.data ?? [];

  React.useEffect(() => {
    if (!seasons.length) {
      setSeasonId(null);
      return;
    }

    setSeasonId((current) => {
      if (current && seasons.some((season) => season.id === current)) {
        return current;
      }

      return pickPreferredSeason(seasons)?.id ?? null;
    });
  }, [seasons]);

  const selectedSeason = React.useMemo(
    () => seasons.find((season) => season.id === seasonId) || null,
    [seasons, seasonId],
  );

  const scheduleIsDateBased = isDateBased(selectedLeague);

  const roundsQuery = useQuery({
    queryKey: ['mobile', 'rounds', leagueId, seasonId],
    queryFn: () => fetchRounds(leagueId as number, seasonId as number),
    enabled: leagueId !== null && seasonId !== null && !scheduleIsDateBased,
  });

  const rounds = roundsQuery.data ?? [];

  const seasonMatchesQuery = useQuery({
    queryKey: ['mobile', 'season-matches', sportId, leagueId, seasonId],
    queryFn: () => fetchSeasonMatches(sportId as number, leagueId as number, seasonId as number),
    enabled: sportId !== null && leagueId !== null && seasonId !== null && scheduleIsDateBased,
  });

  const seasonDates = React.useMemo(() => {
    const rawDates = (seasonMatchesQuery.data ?? [])
      .map((match) => match.date?.slice(0, 10))
      .filter((value): value is string => Boolean(value));

    return [...new Set(rawDates)].sort((left, right) => left.localeCompare(right));
  }, [seasonMatchesQuery.data]);

  React.useEffect(() => {
    if (scheduleIsDateBased) {
      setRoundId(null);
      setMatchDate((current) => {
        if (!seasonDates.length) {
          return null;
        }

        if (current && seasonDates.includes(current)) {
          return current;
        }

        return pickPreferredDate(seasonDates, selectedSeason);
      });
      return;
    }

    setMatchDate(null);
    setRoundId((current) => {
      if (!rounds.length) {
        return null;
      }

      if (current && rounds.some((round) => round.id === current)) {
        return current;
      }

      return pickPreferredRound(rounds, selectedSeason)?.id ?? null;
    });
  }, [rounds, scheduleIsDateBased, seasonDates, selectedSeason]);

  const seasonClubsQuery = useQuery({
    queryKey: ['mobile', 'season-clubs', seasonId],
    queryFn: () => fetchSeasonClubs(seasonId as number),
    enabled: seasonId !== null,
  });

  const clubMap = React.useMemo(() => getClubNameMap(seasonClubsQuery.data ?? []), [seasonClubsQuery.data]);
  const seasonGroupData = React.useMemo(() => getSeasonGroupData(seasonClubsQuery.data ?? []), [seasonClubsQuery.data]);

  const standingsQuery = useQuery({
    queryKey: ['mobile', 'standings', leagueId, seasonId, roundId, matchDate],
    queryFn: () =>
      fetchStandings({
        leagueId: leagueId as number,
        seasonId: seasonId as number,
        roundId,
        matchDate,
      }),
    enabled:
      leagueId !== null &&
      seasonId !== null &&
      ((scheduleIsDateBased && Boolean(matchDate)) || (!scheduleIsDateBased && roundId !== null)),
  });

  const matchesQuery = useQuery({
    queryKey: ['mobile', 'matches-slice', sportId, leagueId, seasonId, roundId, matchDate],
    queryFn: () =>
      fetchMatchesSlice({
        sportId: sportId as number,
        leagueId: leagueId as number,
        seasonId: seasonId as number,
        roundId,
        matchDate,
      }),
    enabled:
      sportId !== null &&
      leagueId !== null &&
      seasonId !== null &&
      ((scheduleIsDateBased && Boolean(matchDate)) || (!scheduleIsDateBased && roundId !== null)),
  });

  const standings = React.useMemo(() => {
    return [...(standingsQuery.data ?? [])].sort((left, right) => {
      const leftPosition = Number(left.position ?? left.rank ?? Number.MAX_SAFE_INTEGER);
      const rightPosition = Number(right.position ?? right.rank ?? Number.MAX_SAFE_INTEGER);
      return leftPosition - rightPosition;
    });
  }, [standingsQuery.data]);

  const currentRound = React.useMemo(
    () => rounds.find((round) => round.id === roundId) || null,
    [rounds, roundId],
  );

  const isBasketball = normalizeText(selectedSport?.name).includes('basketball');
  const groupedStandings = React.useMemo<StandingGroupSection[]>(() => {
    if (!isBasketball || standings.length === 0) {
      return [];
    }

    const sectionMap = new Map<number, Standing[]>();

    standings.forEach((standing) => {
      const groupId = getStandingGroupId(standing, seasonGroupData.clubGroupMap);
      if (groupId === null) {
        return;
      }

      const currentSection = sectionMap.get(groupId);
      if (currentSection) {
        currentSection.push(standing);
      } else {
        sectionMap.set(groupId, [standing]);
      }
    });

    const orderedGroupIds = [
      ...seasonGroupData.groupOrder.filter((groupId) => sectionMap.has(groupId)),
      ...Array.from(sectionMap.keys()).filter((groupId) => !seasonGroupData.groupOrder.includes(groupId)),
    ];

    return orderedGroupIds.map((groupId) => ({
      key: String(groupId),
      title: seasonGroupData.groupLabelMap[groupId] || `Group ${groupId}`,
      standings: sectionMap.get(groupId) || [],
    }));
  }, [isBasketball, seasonGroupData, standings]);
  const showGroupedStandings = groupedStandings.length > 1;
  const isRefreshing = Boolean(
    sportsQuery.isRefetching ||
      leaguesQuery.isRefetching ||
      seasonsQuery.isRefetching ||
      roundsQuery.isRefetching ||
      seasonMatchesQuery.isRefetching ||
      seasonClubsQuery.isRefetching ||
      standingsQuery.isRefetching ||
      matchesQuery.isRefetching,
  );

  const headerContext = [
    selectedSport ? getSportLabel(selectedSport) : null,
    selectedLeague ? getLeagueLabel(selectedLeague) : null,
    selectedSeason ? getSeasonLabel(selectedSeason) : null,
  ]
    .filter(Boolean)
    .join('  •  ');

  const roundOptions: SelectorOption[] = rounds.map((round) => ({
    key: String(round.id),
    label: `R${round.roundNumber}`,
  }));

  const dateOptions: SelectorOption[] = seasonDates.map((date) => ({
    key: date,
    label: date,
  }));

  const renderStandingsRows = (rows: Standing[]) => {
    return rows.map((standing, index) => {
      const position = getStandingPosition(standing, index);
      const teamLabel = getStandingTeamLabel(standing, clubMap);

      return (
        <View key={`${standing.id}-${standing.clubId}-${standing.groupId ?? 'all'}`} style={styles.standingRow}>
          <View style={styles.positionBadge}>
            <Text style={styles.positionBadgeText}>{position}</Text>
          </View>
          <View style={styles.standingMainColumn}>
            <Text style={styles.teamName}>{teamLabel}</Text>
            <Text style={styles.teamMeta}>Record {formatRecord(standing)} • Played {standing.played}</Text>
          </View>
          <View style={styles.metricPillGroup}>
            {isBasketball ? (
              <View style={styles.metricPill}>
                <Text style={styles.metricPillLabel}>PCT</Text>
                <Text style={styles.metricPillValue}>{formatBasketballPct(standing)}</Text>
              </View>
            ) : null}
            <View style={styles.metricPill}>
              <Text style={styles.metricPillLabel}>PTS</Text>
              <Text style={styles.metricPillValue}>{standing.points}</Text>
            </View>
          </View>
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void queryClient.invalidateQueries({ queryKey: ['mobile'] });
            }}
            tintColor="#1f3c88"
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroAccentPrimary} />
          <View style={styles.heroAccentSecondary} />
          <Text style={styles.eyebrow}>Mobile Prototype</Text>
          <Text style={styles.heroTitle}>Regular season first.</Text>
          <Text style={styles.heroSubtitle}>
            This screen mirrors the existing standings flow: choose the competition context, stay on the regular season, and inspect the selected round or date before we add play-ins and playoffs.
          </Text>
          <Text style={styles.heroMeta}>{headerContext || `Backend: ${getApiBaseUrl()}`}</Text>
        </View>

        <SectionCard
          title="Competition context"
          subtitle="Basketball and NBA are preselected when available so the first Expo test lands on the regular-season flow you asked for."
        >
          {sportsQuery.isLoading ? <LoadingState label="Loading sports…" /> : null}
          {sportsQuery.isError ? (
            <ErrorState label="Could not load sports." onRetry={() => void sportsQuery.refetch()} />
          ) : null}

          {!sportsQuery.isLoading && !sportsQuery.isError ? (
            <>
              <SelectorStrip
                title="Sport"
                options={sports.map((sport) => ({ key: String(sport.id), label: getSportLabel(sport) }))}
                selectedKey={sportId !== null ? String(sportId) : null}
                onSelect={(value) => setSportId(Number(value))}
                emptyLabel="No sports available."
              />
              <SelectorStrip
                title="League"
                options={leagues.map((league) => ({ key: String(league.id), label: getLeagueLabel(league) }))}
                selectedKey={leagueId !== null ? String(leagueId) : null}
                onSelect={(value) => setLeagueId(Number(value))}
                emptyLabel={sportId === null ? 'Choose a sport first.' : 'No leagues found for this sport.'}
              />
              <SelectorStrip
                title="Season"
                options={seasons.map((season) => ({ key: String(season.id), label: getSeasonLabel(season) }))}
                selectedKey={seasonId !== null ? String(seasonId) : null}
                onSelect={(value) => setSeasonId(Number(value))}
                emptyLabel={leagueId === null ? 'Choose a league first.' : 'No seasons found for this league.'}
              />
              <SelectorStrip
                title={scheduleIsDateBased ? 'Date' : 'Round'}
                options={scheduleIsDateBased ? dateOptions : roundOptions}
                selectedKey={scheduleIsDateBased ? matchDate : roundId !== null ? String(roundId) : null}
                onSelect={(value) => {
                  if (scheduleIsDateBased) {
                    setMatchDate(value);
                  } else {
                    setRoundId(Number(value));
                  }
                }}
                emptyLabel={seasonId === null ? 'Choose a season first.' : 'No regular-season slices found yet.'}
              />
            </>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Standings"
          subtitle={showGroupedStandings ? 'Regular-season table split by group for the selected slice.' : 'Regular-season table for the selected slice.'}
          rightText={scheduleIsDateBased ? matchDate || 'No date' : currentRound ? `Round ${currentRound.roundNumber}` : 'No round'}
        >
          {standingsQuery.isLoading ? <LoadingState label="Loading standings…" /> : null}
          {standingsQuery.isError ? (
            <ErrorState label="Could not load standings." onRetry={() => void standingsQuery.refetch()} />
          ) : null}
          {!standingsQuery.isLoading && !standingsQuery.isError && standings.length === 0 ? (
            <Text style={styles.emptyText}>No regular-season standings found for the current selection.</Text>
          ) : null}
          {!standingsQuery.isLoading && !standingsQuery.isError
            ? showGroupedStandings
              ? groupedStandings.map((section) => (
                  <View key={section.key} style={styles.groupStandingsSection}>
                    <View style={styles.groupStandingsHeader}>
                      <Text style={styles.groupStandingsTitle}>{section.title}</Text>
                      <Text style={styles.groupStandingsMeta}>{section.standings.length} teams</Text>
                    </View>
                    {renderStandingsRows(section.standings)}
                  </View>
                ))
              : renderStandingsRows(standings)
            : null}
        </SectionCard>

        <SectionCard
          title="Games"
          subtitle="Regular-season slate for the same round or date."
          rightText={`${matchesQuery.data?.length ?? 0} listed`}
        >
          {matchesQuery.isLoading ? <LoadingState label="Loading games…" /> : null}
          {matchesQuery.isError ? (
            <ErrorState label="Could not load games." onRetry={() => void matchesQuery.refetch()} />
          ) : null}
          {!matchesQuery.isLoading && !matchesQuery.isError && (matchesQuery.data?.length ?? 0) === 0 ? (
            <Text style={styles.emptyText}>No regular-season games found for the current selection.</Text>
          ) : null}
          {!matchesQuery.isLoading && !matchesQuery.isError
            ? (matchesQuery.data ?? []).map((match) => {
                const homeLabel = getMatchTeamLabel(match, 'home', clubMap);
                const awayLabel = getMatchTeamLabel(match, 'away', clubMap);
                const hasScore = typeof match.homeScore === 'number' && typeof match.awayScore === 'number';

                return (
                  <View key={match.id} style={styles.matchCard}>
                    <View style={styles.matchHeader}>
                      <Text style={styles.matchStatus}>{match.status || 'Scheduled'}</Text>
                      <Text style={styles.matchDate}>{formatMatchDate(match.date)}</Text>
                    </View>
                    <View style={styles.matchTeamsRow}>
                      <View style={styles.matchTeamColumn}>
                        <Text style={styles.matchTeamLabel}>{homeLabel}</Text>
                        <Text style={styles.matchTeamSubLabel}>Home</Text>
                      </View>
                      <View style={styles.matchScoreBlock}>
                        <Text style={styles.matchScoreText}>
                          {hasScore ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
                        </Text>
                      </View>
                      <View style={[styles.matchTeamColumn, styles.matchTeamColumnRight]}>
                        <Text style={styles.matchTeamLabel}>{awayLabel}</Text>
                        <Text style={styles.matchTeamSubLabel}>Away</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            : null}
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f1e8',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#12355b',
    gap: 10,
  },
  heroAccentPrimary: {
    position: 'absolute',
    right: -24,
    top: -14,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#f3b233',
    opacity: 0.22,
  },
  heroAccentSecondary: {
    position: 'absolute',
    left: -32,
    bottom: -44,
    width: 146,
    height: 146,
    borderRadius: 73,
    backgroundColor: '#7cc6fe',
    opacity: 0.12,
  },
  eyebrow: {
    color: '#f3b233',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 31,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#d9e6f2',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 560,
  },
  heroMeta: {
    color: '#a6c4dd',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 24,
    backgroundColor: '#fffdf8',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e8deca',
  },
  groupStandingsSection: {
    gap: 8,
  },
  groupStandingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  groupStandingsTitle: {
    color: '#12355b',
    fontSize: 16,
    fontWeight: '800',
  },
  groupStandingsMeta: {
    color: '#7c8a99',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  sectionTitle: {
    color: '#1e2a39',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#5d6b7a',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionMeta: {
    color: '#1f3c88',
    fontSize: 12,
    fontWeight: '700',
  },
  selectorBlock: {
    gap: 8,
  },
  selectorTitle: {
    color: '#394a5a',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  selectorRow: {
    gap: 10,
    paddingRight: 8,
  },
  selectorChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#efe5d2',
  },
  selectorChipSelected: {
    backgroundColor: '#1f3c88',
  },
  selectorChipText: {
    color: '#5b4b2f',
    fontSize: 13,
    fontWeight: '700',
  },
  selectorChipTextSelected: {
    color: '#ffffff',
  },
  selectorEmptyText: {
    color: '#8b6f41',
    fontSize: 13,
  },
  centeredState: {
    paddingVertical: 14,
    alignItems: 'center',
    gap: 10,
  },
  centeredStateText: {
    color: '#5d6b7a',
    fontSize: 13,
  },
  errorText: {
    color: '#9a2f36',
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 999,
    backgroundColor: '#1f3c88',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    backgroundColor: '#f8f3e8',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  positionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12355b',
  },
  positionBadgeText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  standingMainColumn: {
    flex: 1,
    gap: 4,
  },
  teamName: {
    color: '#1e2a39',
    fontSize: 15,
    fontWeight: '800',
  },
  teamMeta: {
    color: '#657486',
    fontSize: 12,
  },
  metricPillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPill: {
    minWidth: 54,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e4d9c3',
  },
  metricPillLabel: {
    color: '#7c8a99',
    fontSize: 10,
    fontWeight: '700',
  },
  metricPillValue: {
    color: '#1e2a39',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: '#657486',
    fontSize: 13,
  },
  matchCard: {
    gap: 10,
    borderRadius: 20,
    backgroundColor: '#f8f3e8',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  matchStatus: {
    color: '#1f3c88',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  matchDate: {
    color: '#657486',
    fontSize: 12,
  },
  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchTeamColumn: {
    flex: 1,
    gap: 3,
  },
  matchTeamColumnRight: {
    alignItems: 'flex-end',
  },
  matchTeamLabel: {
    color: '#1e2a39',
    fontSize: 14,
    fontWeight: '800',
  },
  matchTeamSubLabel: {
    color: '#7c8a99',
    fontSize: 11,
    fontWeight: '600',
  },
  matchScoreBlock: {
    minWidth: 72,
    alignItems: 'center',
  },
  matchScoreText: {
    color: '#12355b',
    fontSize: 18,
    fontWeight: '800',
  },
});