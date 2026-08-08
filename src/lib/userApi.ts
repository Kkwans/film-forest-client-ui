import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface Result<T = unknown> {
  code: number;
  message?: string;
  data: T;
}

const authClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

authClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ff_token');
    if (token) config.headers.setAuthorization(`Bearer ${token}`);
  }
  return config;
});

authClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      if ((window as Window & { __ffLogoutFlag?: boolean }).__ffLogoutFlag) return Promise.reject(err);
      localStorage.removeItem('ff_token');
      localStorage.removeItem('ff_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(err);
  },
);

export interface User {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  avatarUrl?: string;
  status?: number;
  createdAt?: string;
}

export interface UserList {
  id: number;
  name: string;
  description?: string;
  type: string;
  isDefault?: number;
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
  rating?: number;
  userRating?: number;
  note?: string;
  addedAt?: string;
  region?: string;
  genre?: string;
  director?: string;
  actor?: string;
  duration?: number;
  totalEpisode?: number;
}

export const userApi = {
  login: (data: { username: string; password: string }) =>
    authClient.post<Result<unknown>>('/api/auth/login', data),
  me: () => authClient.get<Result<unknown>>('/api/auth/me'),
};

export const listApi = {
  getAll: () => authClient.get<Result<unknown>>('/api/user/lists'),
  create: (data: { name: string; description?: string }) => authClient.post<Result<unknown>>('/api/user/lists', data),
  update: (id: number, data: { name?: string; description?: string }) => authClient.put<Result<unknown>>(`/api/user/lists/${id}`, data),
  remove: (id: number) => authClient.delete<Result<unknown>>(`/api/user/lists/${id}`),
  getItems: (id: number, params?: { page?: number; size?: number; sort?: string; sortDir?: string }) =>
    authClient.get<Result<unknown>>(`/api/user/lists/${id}/items`, { params }),
  addItem: (id: number, data: { movieId: number; contentType: string; rating?: number; note?: string }) =>
    authClient.post<Result<unknown>>(`/api/user/lists/${id}/items`, data),
  removeItem: (id: number, data: { movieId: number; contentType: string }) =>
    authClient.delete(`/api/user/lists/${id}/items`, { data } as object),
  batchRemoveItems: (id: number, items: { movieId: number; contentType: string }[]) =>
    authClient.delete(`/api/user/lists/${id}/items/batch`, { data: { items } } as object),
  updateItem: (id: number, data: { movieId: number; contentType: string; rating?: number; note?: string }) =>
    authClient.put<Result<unknown>>(`/api/user/lists/${id}/items`, data),
};

export interface ContentStatusQuery {
  contentType: string;
  contentId: number;
}

export interface StatusListEntry {
  added: boolean;
  type: string;
  listName?: string;
  userRating?: number;
  note?: string;
}

export interface ContentStatusResult extends ContentStatusQuery {
  statuses: StatusListEntry[];
}

export const statusApi = {
  get: (movieId: number, contentType: string) =>
    authClient.get<Result<unknown>>('/api/user/movie-status', { params: { movieId, contentType } }),
  batch: (queries: ContentStatusQuery[]) =>
    authClient.post<Result<ContentStatusResult[]>>('/api/user/movie-status-batch', queries),
};

export default authClient;
