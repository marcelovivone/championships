import { create } from 'zustand';
import { User, MenuItem } from '../api/types';

interface AuthState {
  user: User | null;
  token: string | null;
  allowedMenuItems: MenuItem[];
  isAuthenticated: boolean;
  login: (token: string, user: User, allowedMenuItems?: MenuItem[]) => void;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  allowedMenuItems: [],
  isAuthenticated: false,

  login: (token, user, allowedMenuItems = []) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('allowedMenuItems', JSON.stringify(allowedMenuItems));
    set({ token, user, allowedMenuItems, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('allowedMenuItems');
    set({ token: null, user: null, allowedMenuItems: [], isAuthenticated: false });
  },

  initializeAuth: () => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    const menuItemsStr = localStorage.getItem('allowedMenuItems');

    if (token && userStr) {
      const user = JSON.parse(userStr);
      const allowedMenuItems = menuItemsStr ? JSON.parse(menuItemsStr) : [];
      set({ token, user, allowedMenuItems, isAuthenticated: true });
    }
  },
}));
