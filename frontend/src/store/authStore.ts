/**
 * Authentication Store
 *
 * Global state management for user authentication with role-based access
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'PLATFORM_SUPER_ADMIN' | 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'ANALYST';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  tenant_id: string | null;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  isSuperAdmin: () => boolean;
  isTenantAdmin: () => boolean;
  isAnalyst: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, token) => {
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true, _hasHydrated: true });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      isSuperAdmin: () => {
        const role = get().user?.role;
        return role === 'PLATFORM_SUPER_ADMIN' || role === 'SUPER_ADMIN';
      },

      isTenantAdmin: () => {
        return get().user?.role === 'TENANT_ADMIN';
      },

      isAnalyst: () => {
        return get().user?.role === 'ANALYST';
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ _hasHydrated: true });
      },
    }
  )
);
