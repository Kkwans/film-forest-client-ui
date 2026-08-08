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
    if (token) {
      config.headers.setAuthorization(`Bearer ${token}`);
    }
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
  // 影视基本信息（来自 UserListItemVO）
  region?: string;       // 地区（JSON数组）
  genre?: string;        // 类型（JSON数组）
  director?: string;     // 导演（JSON数组）
  actor?: string;        // 主演（JSON数组）
  duration?: number;     // 时长（分钟）
  totalEpisode?: number; // 总集数
}

// ---- Auth API ----
export const userApi = {
  login: (data: { username: string; password: string }) =>
    authClient.post<Result<unknown>>('/api/auth/login', data),

  me: () => authClient.get<Result<unknown>>('/api/auth/me'),
};

// ---- User Lists API ----
export const listApi = {
  getAll: () => authClient.get<Result<unknown>>('/api/user/lists'),

  create: (data: { name: string; description?: string }) =>
    authClient.post<Result<unknown>>('/api/user/lists', data),

  update: (id: number, data: { name?: string; description?: string }) =>
    authClient.put<Result<unknown>>(`/api/user/lists/${id}`, data),

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

// ---- Movie Status API ----
export const statusApi = {
  get: (movieId: number, contentType: string) =>
    authClient.get<Result<unknown>>('/api/user/movie-status', { params: { movieId, contentType } }),

  batch: (movieIds: number[], contentType: string) =>
    authClient.get<Result<unknown>>('/api/user/movie-status-batch', { params: { movieIds: movieIds.join(','), contentType } }),
};

export default authClient;
