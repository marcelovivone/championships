import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExpoConstantsShape = {
  expoConfig?: {
    hostUri?: string;
    extra?: Record<string, unknown>;
  };
  expoGoConfig?: {
    debuggerHost?: string;
  };
  manifest2?: {
    extra?: {
      expoClient?: {
        hostUri?: string;
      };
    };
  };
  manifest?: {
    hostUri?: string;
    debuggerHost?: string;
    extra?: Record<string, unknown>;
  };
};

type WrappedList<T> = {
  data?: T[];
  total?: number;
  page?: number;
  limit?: number;
};

export type Sport = {
  id: number;
  name: string;
  reducedName?: string | null;
  flgDefault?: boolean;
  imageUrl?: string | null;
};

export type League = {
  id: number;
  sportId: number;
  originalName?: string | null;
  secondaryName?: string | null;
  typeOfSchedule?: string | null;
  flgDefault?: boolean;
};

export type Season = {
  id: number;
  sportId: number;
  leagueId: number;
  startYear: number;
  endYear: number;
  status?: 'planned' | 'active' | 'finished' | string;
  flgDefault?: boolean;
  flgHasPostseason?: boolean;
  currentPhase?: string | null;
  currentPhaseDetail?: string | null;
};

export type Round = {
  id: number;
  seasonId: number;
  leagueId: number;
  roundNumber: number;
  flgCurrent?: boolean;
  startDate?: string | null;
  endDate?: string | null;
};

export type ClubRef = {
  id: number;
  name?: string | null;
  shortName?: string | null;
  short_name?: string | null;
  imageUrl?: string | null;
};

export type GroupRef = {
  id: number;
  name?: string | null;
  originalName?: string | null;
  code?: string | null;
};

export type Standing = {
  id: number;
  leagueId: number;
  seasonId: number;
  roundId?: number | null;
  groupId?: number | null;
  clubId: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  points: number;
  position?: number;
  rank?: number;
  pct?: number | string | null;
  percentage?: number | string | null;
  club?: ClubRef | null;
};

export type Match = {
  id: number;
  sportId: number;
  leagueId: number;
  seasonId: number;
  roundId?: number | null;
  homeClubId?: number | null;
  awayClubId?: number | null;
  homeClubPlaceholder?: string | null;
  awayClubPlaceholder?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  date?: string | null;
  status?: string | null;
  seasonPhase?: string | null;
  seasonPhaseDetail?: string | null;
  homeClub?: ClubRef | null;
  awayClub?: ClubRef | null;
};

export type SeasonClub = {
  id: number;
  seasonId: number;
  clubId: number;
  groupId?: number | null;
  club?: ClubRef | null;
  group?: GroupRef | null;
};

function getConfigExtra(): Record<string, unknown> | undefined {
  const expoConfig = (Constants as unknown as ExpoConstantsShape).expoConfig;
  if (expoConfig?.extra) {
    return expoConfig.extra;
  }

  const legacyManifest = (Constants as unknown as ExpoConstantsShape).manifest;
  return legacyManifest?.extra;
}

function getExpoHostUri(): string | null {
  const constants = Constants as unknown as ExpoConstantsShape;

  return (
    constants.expoConfig?.hostUri ||
    constants.expoGoConfig?.debuggerHost ||
    constants.manifest2?.extra?.expoClient?.hostUri ||
    constants.manifest?.debuggerHost ||
    constants.manifest?.hostUri ||
    null
  );
}

function getDerivedApiBaseUrl(): string | null {
  const hostUri = getExpoHostUri();
  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(':')[0]?.trim();
  if (!host || host === '127.0.0.1' || host === 'localhost') {
    return null;
  }

  return `http://${host}:3000`;
}

function shouldPreferDerivedUrl(configuredUrl: string | null, derivedUrl: string | null): derivedUrl is string {
  if (!derivedUrl) {
    return false;
  }

  if (!configuredUrl) {
    return true;
  }

  if (Platform.OS === 'ios' && /10\.0\.2\.2|localhost|127\.0\.0\.1/.test(configuredUrl)) {
    return true;
  }

  return false;
}

export function getApiBaseUrl(): string {
  const extra = getConfigExtra();
  const configuredUrl = typeof extra?.API_BASE_URL === 'string' ? extra.API_BASE_URL : null;
  const derivedUrl = getDerivedApiBaseUrl();

  if (shouldPreferDerivedUrl(configuredUrl, derivedUrl)) {
    return derivedUrl;
  }

  if (configuredUrl) {
    return configuredUrl;
  }

  if (derivedUrl) {
    return derivedUrl;
  }

  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 12000,
  validateStatus: (status) => status >= 200 && status < 500,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use((response) => {
  if (response.status >= 400) {
    return Promise.reject(new Error(response.data?.message || `Request failed with status ${response.status}`));
  }

  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    response.data = response.data.data;
  }

  return response;
});

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === 'object' && Array.isArray((value as WrappedList<T>).data)) {
    return (value as WrappedList<T>).data ?? [];
  }

  return [];
}

function toLeagueName(league: League): string {
  return String(league.originalName || league.secondaryName || `League ${league.id}`);
}

export async function fetchSports(): Promise<Sport[]> {
  const response = await apiClient.get('/v1/sports?page=1&limit=100');
  return toArray<Sport>(response.data);
}

export async function fetchLeagues(sportId: number): Promise<League[]> {
  const response = await apiClient.get(`/v1/leagues?sportId=${sportId}`);
  return [...toArray<League>(response.data)].sort((left, right) => {
    return toLeagueName(left).localeCompare(toLeagueName(right));
  });
}

export async function fetchSeasons(leagueId: number): Promise<Season[]> {
  const response = await apiClient.get(`/v1/seasons?leagueId=${leagueId}`);
  return [...toArray<Season>(response.data)].sort((left, right) => {
    const rightValue = Number(right.endYear || right.startYear || 0);
    const leftValue = Number(left.endYear || left.startYear || 0);
    return rightValue - leftValue;
  });
}

export async function fetchRounds(leagueId: number, seasonId: number): Promise<Round[]> {
  const response = await apiClient.get(`/v1/rounds?leagueId=${leagueId}&seasonId=${seasonId}&page=1&limit=300`);
  return [...toArray<Round>(response.data)].sort((left, right) => Number(left.roundNumber) - Number(right.roundNumber));
}

export async function fetchSeasonClubs(seasonId: number): Promise<SeasonClub[]> {
  const response = await apiClient.get(`/v1/season-clubs/season/${seasonId}`);
  return toArray<SeasonClub>(response.data);
}

export async function fetchSeasonMatches(sportId: number, leagueId: number, seasonId: number): Promise<Match[]> {
  const response = await apiClient.get(
    `/v1/matches?sportId=${sportId}&leagueId=${leagueId}&seasonId=${seasonId}&seasonPhase=Regular`,
  );
  return toArray<Match>(response.data);
}

export async function fetchStandings(params: {
  leagueId: number;
  seasonId: number;
  roundId?: number | null;
  matchDate?: string | null;
}): Promise<Standing[]> {
  const searchParams = new URLSearchParams({
    leagueId: String(params.leagueId),
    seasonId: String(params.seasonId),
    seasonPhase: 'Regular',
  });

  if (params.matchDate) {
    searchParams.set('matchDate', params.matchDate);
  } else if (params.roundId) {
    searchParams.set('roundId', String(params.roundId));
  }

  const response = await apiClient.get(`/v1/standings?${searchParams.toString()}`);
  return toArray<Standing>(response.data);
}

export async function fetchMatchesSlice(params: {
  sportId: number;
  leagueId: number;
  seasonId: number;
  roundId?: number | null;
  matchDate?: string | null;
}): Promise<Match[]> {
  const searchParams = new URLSearchParams({
    sportId: String(params.sportId),
    leagueId: String(params.leagueId),
    seasonId: String(params.seasonId),
    seasonPhase: 'Regular',
  });

  if (params.matchDate) {
    searchParams.set('date', params.matchDate);
  } else if (params.roundId) {
    searchParams.set('roundId', String(params.roundId));
  }

  const response = await apiClient.get(`/v1/matches?${searchParams.toString()}`);
  return toArray<Match>(response.data);
}