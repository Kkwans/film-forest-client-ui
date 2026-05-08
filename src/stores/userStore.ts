// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userApi, type User } from '@/lib/userApi';

interface UserState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username, password) => {
        const res = await userApi.login({ username, password });
        const { token, user } = res.data.data || res.data;
        localStorage.setItem('ff_token', token);
        set({ user, token, isAuthenticated: true });
      },

      register: async (username, password, email) => {
        const res = await userApi.register({ username, password, email });
        const { token, user } = res.data.data || res.data;
        localStorage.setItem('ff_token', token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('ff_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        const token = get().token || localStorage.getItem('ff_token');
        if (!token) return;
        set({ isLoading: true });
        try {
          const res = await userApi.me();
          const user = res.data.data || res.data;
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          // Token invalid
          localStorage.removeItem('ff_token');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'ff-user',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, validate token
        if (state?.token) {
          state.isAuthenticated = true;
          state.fetchMe();
        }
      },
    },
  ),
);
