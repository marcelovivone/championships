// User and Authentication Types
export type UserProfile = 'admin' | 'final_user';

export interface User {
  id: number;
  name: string;
  email: string;
  profile: UserProfile;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
  allowedMenuItems?: MenuItem[];
}

export interface MenuItem {
  id: number;
  code: string;
  name: string;
  category: 'admin' | 'final_user';
  parentId: number | null;
  order: number;
}

// Common Types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Entity Types
export interface Sport {
  id: number;
  name: string;
  reducedName: string;
  type: string;
  divisionType: string;
  minMatchDivisionNumber: number;
  maxMatchDivisionNumber: number;
  divisionTime: number;
  scoreType: string;
  hasOvertime: boolean;
  hasPenalties: boolean;
  flgDefault: boolean;
  imageUrl: string;
  createdAt: string;
}

export interface Country {
  id: number;
  name: string;
  code: string;
  continent: string;
  flagUrl: string | null;
  createdAt: string;
}

export interface City {
  id: number;
  name: string;
  countryId: number;
  country?: Country;
  createdAt: string;
  updatedAt: string;
}

export interface Stadium {
  id: number;
  name: string;
  cityId: number;
  capacity: number | null;
  type: string;
  sportId: number;
  yearConstructed: number | null;
  imageUrl: string | null;
  city?: City;
  sport?: Sport;
  createdAt: string;
}

export interface Club {
  id: number;
  name: string;
  shortName: string | null;
  foundationYear: number | null;
  countryId: number;
  cityId: number | null;
  imageUrl: string | null;
  country?: Country;
  city?: City;
  createdAt: string;
}

export interface ClubStadium {
  id: number;
  clubId: number;
  stadiumId: number;
  startDate: string;
  endDate: string | null;
  club?: Club;
  stadium?: Stadium;
  createdAt: string;
}

export interface League {
  id: number;
  originalName: string;
  secondaryName?: string;
  sportId: number;
  countryId?: number;
  cityId?: number;
  flgDefault: boolean;

  typeOfSchedule: 'Round' | 'Date';
  numberOfRoundsMatches: number;
  minDivisionsNumber: number;
  maxDivisionsNumber: number;
  divisionsTime?: number;
  hasOvertimeOverride?: boolean;
  hasPenaltiesOverride?: boolean;
  hasAscends: boolean;
  ascendsQuantity?: number;
  hasDescends: boolean;
  descendsQuantity?: number;
  hasSubLeagues: boolean;
  numberOfSubLeagues?: number;
  flgRoundAutomatic: boolean;
  imageUrl?: string;
  sport?: Sport;
  country?: Country;
  createdAt: string;
}

export interface Season {
  id: number;
  sportId: number;
  leagueId: number;
  startYear: number;
  endYear: number;
  status: 'planned' | 'active' | 'finished';
  flgDefault: boolean;
  numberOfGroups: number;
  sport?: Sport;
  league?: League;
  createdAt: string;
}

export interface CreateSeasonDto {
  sportId: number;
  leagueId: number;
  startYear: number;
  endYear: number;
  status?: 'planned' | 'active' | 'finished';
  flgDefault?: boolean;
  numberOfGroups?: number;
}

export interface UpdateSeasonDto extends Partial<CreateSeasonDto> {}

export interface Round {
  id: number;
  seasonId: number;
  leagueId: number;
  roundNumber: number;
  startDate: string | null;
  endDate: string | null;
  flgCurrent: boolean;
  season?: Season;
  league?: League;
  createdAt: string;
}

export interface CreateRoundDto {
  seasonId: number;
  leagueId: number;
  roundNumber: number;
  startDate?: string;
  endDate?: string;
  flgCurrent?: boolean;
}

export interface UpdateRoundDto extends Partial<CreateRoundDto> {}

export interface Group {
  id: number;
  name: string;
  sportId: number;
  leagueId: number;
  seasonId: number;
  sport?: Sport;
  league?: League;
  season?: Season;
  createdAt: string;
}

export interface SeasonClub {
  id: number;
  sportId: number;
  leagueId: number;
  seasonId: number;
  clubId: number;
  groupId: number | null;
  sport?: Sport;
  league?: League;
  season?: Season;
  club?: Club;
  group?: Group;
  createdAt: string;
}

export interface SportClub {
  id: number;
  sportId: number;
  clubId: number;
  name: string;
  flgActive: boolean;
  sport?: Sport;
  club?: Club;
  createdAt: string;
}

export interface Match {
  id: number;
  sportId: number;
  leagueId: number;
  seasonId: number;
  roundId: number | null; // Nullable for Date-based leagues
  homeClubId: number;
  awayClubId: number;
  date: string;
  stadiumId: number | null;
  groupId: number | null;
  status: 'Scheduled' | 'Finished' | 'Postponed' | 'Cancelled';
  homeScore: number | null;
  awayScore: number | null;
  sport?: Sport;
  league?: League;
  season?: Season;
  homeClub?: Club;
  awayClub?: Club;
  stadium?: Stadium;
  group?: Group;
  createdAt: string;
  updatedAt: string;
  availableStadiums?: Stadium[]; // Stadiums available for the home club
  matchDivisions?: MatchDivision[]; // Divisions of the match
}

// export interface MatchDivision {
//   id: number;
//   matchId: number;
//   divisionName: string;
//   order: number;
//   match?: Match;
//   createdAt: string;
//   updatedAt: string;
// }
export interface MatchDivision {
  id: number;
  matchId: number;
  divisionNumber: number;
  homeScore: number | null;
  awayScore: number | null;
  divisionType: 'REGULAR' | 'OVERTIME' | 'PENALTIES';
  createdAt: string;
  updatedAt: string;
}

export interface MatchEvent {
  id: number;
  matchId: number;
  matchDivisionId: number | null;
  eventType: string;
  eventTime: number | null;
  seasonClubId: number | null;
  notes: string | null;
  match?: Match;
  matchDivision?: MatchDivision;
  seasonClub?: SeasonClub;
  createdAt: string;
  updatedAt: string;
}

export interface Standing {
  id: number;
  leagueId: number;
  seasonId: number;
  roundId: number;
  groupId: number | null;
  clubId: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  league?: League;
  season?: Season;
  group?: Group;
  club?: Club;
  createdAt: string;
  updatedAt: string;
}

// Create/Update DTOs
export interface CreateSportDto {
  name: string;
  reducedName: string;
  type: string;
  divisionType: string;
  minMatchDivisionNumber: number;
  maxMatchDivisionNumber: number;
  divisionTime: number;
  scoreType: string;
  hasOvertime: boolean;
  hasPenalties: boolean;
  flgDefault: boolean;
  imageUrl: string;
}

export interface CreateCountryDto {
  name: string;
  code: string;
  continent: string;
  flagUrl?: string;
}

export interface CreateCityDto {
  name: string;
  countryId: number;
}

export interface CreateStadiumDto {
  name: string;
  cityId: number;
  capacity?: number;
  type: string;
  sportId: number;
  yearConstructed?: number;
  imageUrl?: string;
}

export interface CreateClubDto {
  name: string;
  shortName?: string;
  foundationYear?: number;
  countryId: number;
  cityId?: number;
  imageUrl?: string;
}

export interface CreateClubStadiumDto {
  clubId: number;
  stadiumId: number;
  startDate: string;
  endDate?: string;
}

export interface CreateLeagueDto {
  originalName: string;
  secondaryName?: string;
  sportId: number;
  countryId?: number;
  cityId?: number;
  flgDefault: boolean;
  typeOfSchedule: 'Round' | 'Date';
  numberOfRoundsMatches: number;
  minDivisionsNumber: number;
  maxDivisionsNumber: number;
  divisionsTime?: number;
  hasOvertimeOverride?: boolean;
  hasPenaltiesOverride?: boolean;
  hasAscends: boolean;
  ascendsQuantity?: number;
  hasDescends: boolean;
  descendsQuantity?: number;
  hasSubLeagues: boolean;
  numberOfSubLeagues?: number;
  flgRoundAutomatic?: boolean;
  imageUrl?: string;
}

export interface CreateSeasonDto {
  name: string;
  leagueId: number;
  startDate: string;
  endDate?: string;
}

export interface CreateGroupDto {
  name: string;
  sportId: number;
  leagueId: number;
  seasonId: number;
}

export interface CreateSeasonClubDto {
  sportId: number;
  leagueId: number;
  seasonId: number;
  clubId: number;
  groupId?: number;
}

export interface CreateMatchDto {
  sportId: number;
  leagueId: number;
  seasonId: number;
  roundId?: number; // Optional - only required for Round-based leagues
  homeClubId: number;
  awayClubId: number;
  homeScore?: number | null;
  awayScore?: number | null;
  date: string;
  stadiumId?: number;
  groupId?: number;
  status?: 'Scheduled' | 'Finished' | 'Postponed' | 'Cancelled';
}

export interface CreateSportClubDto {
  sportId: number;
  clubId: number;
  name: string;
  flgActive?: boolean;
}

export interface BulkUpdateSportClubsDto {
  sportClubData: { id: number; clubId: number; name: string }[];
}

export interface CreateMatchDivisionDto {
  matchId: number;
  divisionNumber: number;
  homeScore: number | null;
  awayScore: number | null;
  divisionType: 'REGULAR' | 'OVERTIME' | 'PENALTIES'
}

export interface CreateMatchEventDto {
  matchId: number;
  matchDivisionId?: number;
  eventType: string;
  eventTime?: number;
  seasonClubId?: number;
  notes?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  profile: UserProfile;
  isActive?: boolean;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
  profile?: UserProfile;
  isActive?: boolean;
}

export interface ProfilePermission {
  id: number;
  profile: UserProfile;
  menuItemId: number;
  isEnabled: boolean;
  menuItem?: MenuItem;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermission {
  id: number;
  userId: number;
  menuItemId: number;
  isEnabled: boolean;
  user?: User;
  menuItem?: MenuItem;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfilePermissionDto {
  profile: UserProfile;
  menuItemId: number;
  isEnabled: boolean;
}

export interface CreateUserPermissionDto {
  userId: number;
  menuItemId: number;
  isEnabled: boolean;
}
