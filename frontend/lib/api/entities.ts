import { apiClient } from './client';
import {
  Sport,
  Country,
  City,
  Stadium,
  Club,
  ClubStadium,
  League,
  Season,
  Round,
  Group,
  SeasonClub,
  SportClub,
  Match,
  MatchDivision,
  MatchEvent,
  Standing,
  MenuItem,
  ProfilePermission,
  UserPermission,
  CreateSportDto,
  CreateCountryDto,
  CreateCityDto,
  CreateStadiumDto,
  CreateClubDto,
  CreateClubStadiumDto,
  CreateLeagueDto,
  CreateSeasonDto,
  CreateRoundDto,
  CreateGroupDto,
  CreateSeasonClubDto,
  CreateSportClubDto,
  BulkUpdateSportClubsDto,
  CreateMatchDto,
  CreateMatchDivisionDto,
  CreateMatchEventDto,
  CreateProfilePermissionDto,
  CreateUserPermissionDto,
} from './types';

// import MatchDetailsEditor, { MatchDivision } from '../../app/admin/matches/MatchDetailsEditor';

// Generic CRUD factory
const createCrudApi = <T, CreateDto = Partial<T>, UpdateDto = Partial<T>>(endpoint: string) => ({
  getAll: async (params?: { 
    page?: number; 
    limit?: number; 
    sortBy?: string; 
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: T[]; total: number; page: number; limit: number }> => {
    const { page = 1, limit = 10, sortBy, sortOrder } = params || {};
    let url = `/v1/${endpoint}?page=${page}&limit=${limit}`;
    if (sortBy) url += `&sortBy=${sortBy}`;
    if (sortOrder) url += `&sortOrder=${sortOrder}`;
    
    const response = await apiClient.get(url);
    const result = response.data as any;
    
    // If response is already in paginated format, return it
    if (result.data && result.total !== undefined) {
      return result;
    }
    
    // If response is just an array, wrap it in pagination format
    return {
      data: Array.isArray(result) ? result : [],
      total: Array.isArray(result) ? result.length : 0,
      page,
      limit,
    };
  },

  getById: async (id: number): Promise<T> => {
    const response = await apiClient.get<T>(`/v1/${endpoint}/${id}`);
    return response.data;
  },

  create: async (data: CreateDto): Promise<T> => {
    try {
      const response = await apiClient.post<T>(`/v1/${endpoint}`, data);
      return response.data;
    } catch (error) {
      // Re-throw without logging
      throw error;
    }
  },

  update: async (id: number, data: UpdateDto): Promise<T> => {
    try {
      const response = await apiClient.put<T>(`/v1/${endpoint}/${id}`, data);
      return response.data;
    } catch (error) {
      // Re-throw without logging
      throw error;
    }
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/${endpoint}/${id}`);
  },
});

// Entity APIs
export const sportsApi = createCrudApi<Sport, CreateSportDto>('sports');

// Custom leagues API to support filtering by sportId
export const leaguesApi = {
  ...createCrudApi<League, CreateLeagueDto>('leagues'),
  getBySport: async (sportId: number): Promise<League[]> => {
    const response = await apiClient.get<League[]>(`/v1/leagues?sportId=${sportId}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  }
};

export const countriesApi = createCrudApi<Country, CreateCountryDto>('countries');
export const citiesApi = createCrudApi<City, CreateCityDto>('cities');
export const stadiumsApi = createCrudApi<Stadium, CreateStadiumDto>('stadiums');
export const clubStadiumsApi = createCrudApi<ClubStadium, CreateClubStadiumDto>('club-stadiums');
export const clubsApi = createCrudApi<Club, CreateClubDto>('clubs');

// Custom seasons API to support filtering by leagueId
export const seasonsApi = {
  ...createCrudApi<Season, CreateSeasonDto>('seasons'),
  getByLeague: async (leagueId: number): Promise<Season[]> => {
    const response = await apiClient.get<Season[]>(`/v1/seasons?leagueId=${leagueId}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  }
};

export const roundsApi = createCrudApi<Round, CreateRoundDto>('rounds');
export const groupsApi = createCrudApi<Group, CreateGroupDto>('groups');

// Season Clubs API with custom methods
export const seasonClubsApi = {
  ...createCrudApi<SeasonClub, CreateSeasonClubDto>('season-clubs'),
  
  getBySeason: async (seasonId: number): Promise<SeasonClub[]> => {
    const response = await apiClient.get<SeasonClub[]>(`/v1/season-clubs/season/${seasonId}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },

  getByClub: async (clubId: number): Promise<SeasonClub[]> => {
    const response = await apiClient.get<SeasonClub[]>(`/v1/season-clubs/club/${clubId}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },
};

export const matchesApi = {
  ...createCrudApi<Match, CreateMatchDto>('matches'),
  getBySeason: async (seasonId: number): Promise<Match[]> => {
    const response = await apiClient.get<Match[]>(`/v1/matches?seasonId=${seasonId}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },
  getBySportLeagueSeasonAndGroup: async (
    sportId: number, 
    leagueId: number, 
    seasonId: number, 
    groupId: number | null
  ): Promise<Match[]> => {
    let url = `/v1/matches?sportId=${sportId}&leagueId=${leagueId}&seasonId=${seasonId}`;
    if (groupId) {
      url += `&groupId=${groupId}`;
    }
    
    const response = await apiClient.get<Match[]>(url);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },
  getBySeasonAndRound: async (seasonId: number, roundId: number): Promise<Match[]> => {
    const response = await apiClient.get<Match[]>(`/v1/matches?seasonId=${seasonId}&roundId=${roundId}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },
  getBySeasonAndDate: async (seasonId: number, date: string): Promise<Match[]> => {
    const response = await apiClient.get<Match[]>(`/v1/matches?seasonId=${seasonId}&date=${date}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  }
};

type GetAllParams<TFilters = {}> = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} & TFilters;

// export const matchDivisionsApi = createCrudApi<MatchDivision, CreateMatchDivisionDto>('match-divisions');
const baseMatchDivisionsApi =
  createCrudApi<MatchDivision, CreateMatchDivisionDto>('match-divisions');

export const matchDivisionsApi = {
  ...baseMatchDivisionsApi,

  // Custom method to get match divisions by match ID
  getByMatchId: async (matchId: number): Promise<MatchDivision[]> => {
    const response = await apiClient.get<MatchDivision[]>(`/v1/match-divisions?matchId=${matchId}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },
};

export const matchEventsApi = createCrudApi<MatchEvent, CreateMatchEventDto>('match-events');
export const standingsApi = createCrudApi<Standing>('standings');

// Menu Items API
export const menuItemsApi = {
  getAll: async (): Promise<MenuItem[]> => {
    const response = await apiClient.get<MenuItem[]>('/v1/menu-items');
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },

  getByCategory: async (category: 'admin' | 'final_user'): Promise<MenuItem[]> => {
    const response = await apiClient.get<MenuItem[]>(`/v1/menu-items/category/${category}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },
};

// Permissions API
export const permissionsApi = {
  // Profile Permissions
  getProfilePermissions: async (profile: 'admin' | 'final_user'): Promise<ProfilePermission[]> => {
    const response = await apiClient.get<ProfilePermission[]>(`/v1/permissions/profile/${profile}`);
    return response.data;
  },

  createProfilePermission: async (data: CreateProfilePermissionDto): Promise<ProfilePermission> => {
    const response = await apiClient.post<ProfilePermission>('/v1/permissions/profile', data);
    return response.data;
  },

  updateProfilePermission: async (id: number, data: Partial<CreateProfilePermissionDto>): Promise<ProfilePermission> => {
    const response = await apiClient.patch<ProfilePermission>(`/v1/permissions/profile/${id}`, data);
    return response.data;
  },

  deleteProfilePermission: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/permissions/profile/${id}`);
  },

  // User Permissions
  getUserPermissions: async (userId: number): Promise<UserPermission[]> => {
    const response = await apiClient.get<UserPermission[]>(`/v1/permissions/user?userId=${userId}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },

  createUserPermission: async (data: CreateUserPermissionDto): Promise<UserPermission> => {
    const response = await apiClient.post<UserPermission>('/v1/permissions/user', data);
    return response.data;
  },

  updateUserPermission: async (id: number, data: Partial<CreateUserPermissionDto>): Promise<UserPermission> => {
    const response = await apiClient.patch<UserPermission>(`/v1/permissions/user/${id}`, data);
    return response.data;
  },

  deleteUserPermission: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/permissions/user/${id}`);
  },

  getUserAllowedMenuItems: async (userId: number): Promise<MenuItem[]> => {
    const response = await apiClient.get<MenuItem[]>(`/v1/permissions/user/${userId}/allowed-menu-items`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },
};

// Sport Clubs API
export const sportClubsApi = {
  getAll: async (): Promise<SportClub[]> => {
    const response = await apiClient.get<SportClub[]>('/v1/sport-clubs');
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },

  getById: async (id: number): Promise<SportClub> => {
    const response = await apiClient.get<SportClub>(`/v1/sport-clubs/${id}`);
    return response.data;
  },

  getBySport: async (sportId: number): Promise<SportClub[]> => {
    const response = await apiClient.get<SportClub[]>(`/v1/sport-clubs/sport/${sportId}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },

  getByClub: async (clubId: number): Promise<SportClub[]> => {
    const response = await apiClient.get<SportClub[]>(`/v1/sport-clubs/club/${clubId}`);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },

  create: async (data: CreateSportClubDto): Promise<SportClub> => {
    const response = await apiClient.post<SportClub>('/v1/sport-clubs', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CreateSportClubDto>): Promise<SportClub> => {
    const response = await apiClient.put<SportClub>(`/v1/sport-clubs/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/sport-clubs/${id}`);
  },

  bulkUpdateForSport: async (sportId: number, data: { sportClubData: { id: number; clubId: number; name: string }[] }): Promise<SportClub[]> => {
    const response = await apiClient.put<SportClub[]>(`/v1/sport-clubs/sport/${sportId}/clubs`, data);
    const result = response.data as any;
    return Array.isArray(result) ? result : (result.data || []);
  },
};

const leagues = {
  url: '/leagues',
  name: 'Leagues',
  permissions: {
    create: 'create_league',
    read: 'read_league',
    update: 'update_league',
    delete: 'delete_league',
  },
};
