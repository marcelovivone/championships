import { apiClient } from './client';
import { LoginRequest, LoginResponse, User, CreateUserDto, UpdateUserDto } from './types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/v1/auth/login', credentials);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/v1/auth/profile');
    return response.data;
  },

  getAllUsers: async (params?: { 
    page?: number; 
    limit?: number; 
    sortBy?: string; 
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: User[]; total: number; page: number; limit: number }> => {
    const { page = 1, limit = 10, sortBy, sortOrder } = params || {};
    let url = `/v1/users?page=${page}&limit=${limit}`;
    if (sortBy) url += `&sortBy=${sortBy}`;
    if (sortOrder) url += `&sortOrder=${sortOrder}`;
    
    const response = await apiClient.get(url);
    const result = response.data as any;
    
    // Handle both paginated and non-paginated responses
    if (result.data && Array.isArray(result.data)) {
      return result;
    }
    // If backend returns array directly, wrap it
    return {
      data: Array.isArray(result) ? result : [],
      total: Array.isArray(result) ? result.length : 0,
      page,
      limit,
    };
  },

  getUserById: async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/v1/users/${id}`);
    return response.data;
  },

  createUser: async (data: CreateUserDto): Promise<User> => {
    const response = await apiClient.post<User>('/v1/users', data);
    return response.data;
  },

  updateUser: async (id: number, data: UpdateUserDto): Promise<User> => {
    const response = await apiClient.patch<User>(`/v1/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/users/${id}`);
  },
};
