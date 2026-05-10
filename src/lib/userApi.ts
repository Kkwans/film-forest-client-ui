// @ts-nocheck
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/** Create an axios instance that auto-attaches Authorization header */
function createAuthClient() {
  const instance = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ff_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('ff_token');
        localStorage.removeItem('ff_user');
        // Redirect to login if not already there
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
        }
      }
      return Promise.reject(err);
    },
  );

  return instance;
}

const authClient = createAuthClient();

export interface User {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  avatar?: string;
}

export interface UserList {
  id: number;
  name: string;
  description?: string;
  type: string;  // want_to_watch / watching / watched / custom
  isDefault?: number;  // 0=custom, 1=default
  icon?: string;
  itemCount: number;
}

export interface UserListItem {
  id: number;
  movieId: number;
  contentType: string;
  title: string;
  cover: string;
  year?: number;
  rating?: number;       // 豆瓣评分
  userRating?: number;   // 用户评分
  note?: string;         // 用户备注
  addedAt?: string;
}

// ---- Auth API ----
export const userApi = {
  register: (data: { username: string; password: string; email?: string }) =>
    authClient.post('/api/auth/register', data),

  login: (data: { username: string; password: string }) =>
    authClient.post('/api/auth/login', data),

  me: () => authClient.get('/api/auth/me'),
};

// ---- User Lists API ----
export const listApi = {
  getAll: () => authClient.get('/api/user/lists'),

  create: (data: { name: string; description?: string }) =>
    authClient.post('/api/user/lists', data),

  update: (id: number, data: { name?: string; description?: string }) =>
    authClient.put(`/api/user/lists/${id}`, data),

  remove: (id: number) => authClient.delete(`/api/user/lists/${id}`),

  getItems: (id: number, params?: { page?: number; size?: number; sort?: string; sortDir?: string }) =>
    authClient.get(`/api/user/lists/${id}/items`, { params }),

  addItem: (id: number, data: { movieId: number; contentType: string; rating?: number; note?: string }) =>
    authClient.post(`/api/user/lists/${id}/items`, data),

  removeItem: (id: number, data: { movieId: number; contentType: string }) =>
    authClient.delete(`/api/user/lists/${id}/items`, { data }),

  updateItem: (id: number, data: { movieId: number; contentType: string; rating?: number; note?: string }) =>
    authClient.put(`/api/user/lists/${id}/items`, data),
};

// ---- Movie Status API ----
export const statusApi = {
  get: (movieId: number, contentType: string) =>
    authClient.get('/api/user/movie-status', { params: { movieId, contentType } }),

  batch: (movieIds: number[], contentType: string) =>
    authClient.get('/api/user/movie-status-batch', { params: { movieIds: movieIds.join(','), contentType } }),
};

export default authClient;
