import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userApi, type User } from '@/lib/userApi';

interface UserState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<User>;
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
        if (!user) throw new Error('登录失败，未获取到用户信息');
        localStorage.setItem('ff_token', token);
        set({ user, token, isAuthenticated: true });
        return user;
      },

      logout: () => {
        localStorage.removeItem('ff_token');
        localStorage.removeItem('ff-user');
        localStorage.removeItem('ff_user');
        localStorage.removeItem('search_history');
        // Signal to authClient interceptor: skip 401 redirect during logout
        (window as Window & { __ffLogoutFlag?: boolean }).__ffLogoutFlag = true;
        set({ user: null, token: null, isAuthenticated: false });
        setTimeout(() => { (window as Window & { __ffLogoutFlag?: boolean }).__ffLogoutFlag = false; }, 500);
      },

      fetchMe: async () => {
        const token = get().token || localStorage.getItem('ff_token');
        if (!token) return;
        set({ isLoading: true });
        try {
          const res = await userApi.me();
          const body = (res.data as unknown) as { code?: number; data?: User };
          const user = body?.data ?? (res.data as unknown as User | null);
          // Normalize avatar: backend returns avatarUrl, frontend uses avatar
          if (user && user.avatarUrl && !user.avatar) {
            user.avatar = user.avatarUrl;
          }
          set({ user: user ?? null, isAuthenticated: true, isLoading: false });
          if (user?.mustChangePassword
              && !window.location.pathname.startsWith('/change-password')) {
            // Zustand hydration runs outside a component and cannot access Next's router.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign(`/change-password?from=${encodeURIComponent(window.location.pathname)}`);
          }
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
