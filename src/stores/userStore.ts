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
        const body = (res.data as unknown) as { code?: number; message?: string; data?: { token: string; user: User } };
        if (body.code && body.code !== 200) {
          throw new Error(body.message || '登录失败');
        }
        const token = body.data?.token;
        const user = body.data?.user;
        if (!token) {
          throw new Error('登录失败，未获取到token');
        }
        localStorage.setItem('ff_token', token);
        set({ user: user ?? null, token, isAuthenticated: true });
      },

      register: async (username, password, email?) => {
        const res = await userApi.register({ username, password, email });
        const body = (res.data as unknown) as { token?: string; user?: User };
        const token = body.token ?? '';
        const user = body.user;
        localStorage.setItem('ff_token', token);
        set({ user: user ?? null, token, isAuthenticated: true });
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
          const user = (res.data as unknown) as User | null;
          set({ user: user ?? null, isAuthenticated: true, isLoading: false });
        } catch {
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
        if (state?.token) {
          state.isAuthenticated = true;
          state.fetchMe();
        }
      },
    },
  ),
);

/**
 * Check if user has a stored token (for auth guards).
 * This avoids the zustand persist rehydration race condition.
 */
export function hasStoredToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('ff_token');
}