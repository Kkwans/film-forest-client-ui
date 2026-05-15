import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface Result<T = unknown> {
  code: number;
  message?: string;
  data: T;
}

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface MovieListParams {
  page?: number;
  size?: number;
  type?: string;
}

export interface DramaListParams {
  page?: number;
  size?: number;
  year?: number;
  region?: string;
  genre?: string;
}

export interface SearchParams {
  page?: number;
  size?: number;
  sort?: string;
  sortDir?: string;
}

export const movieApi = {
  list: (params?: MovieListParams, config?: object) =>
    client.get<Result<unknown>>('/api/movies', { params, ...config }),

  detail: (id: number) =>
    client.get<Result<unknown>>(`/api/movies/${id}`),

  hot: () =>
    client.get<Result<unknown>>('/api/hot'),

  latest: () =>
    client.get<Result<unknown>>('/api/latest'),
};

export const dramaApi = {
  list: (params?: DramaListParams, config?: object) =>
    client.get<Result<unknown>>('/api/dramas', { params, ...config }),

  detail: (id: number) =>
    client.get<Result<unknown>>(`/api/dramas/${id}`),
};

export const varietyApi = {
  list: (params?: DramaListParams, config?: object) =>
    client.get<Result<unknown>>('/api/varieties', { params, ...config }),

  detail: (id: number) =>
    client.get<Result<unknown>>(`/api/varieties/${id}`),
};

export const animeApi = {
  list: (params?: DramaListParams, config?: object) =>
    client.get<Result<unknown>>('/api/animes', { params, ...config }),

  detail: (id: number) =>
    client.get<Result<unknown>>(`/api/animes/${id}`),
};

export const shortDramaApi = {
  list: (params?: DramaListParams, config?: object) =>
    client.get<Result<unknown>>('/api/short-dramas', { params, ...config }),

  detail: (id: number) =>
    client.get<Result<unknown>>(`/api/short-dramas/${id}`),
};

export const searchApi = {
  search: (keyword: string, params?: SearchParams) =>
    client.get<Result<unknown>>('/api/search', { params: { keyword, ...params } }),
};

export const resourceApi = {
  online: (contentType: string, contentId: number, episodeId?: number) =>
    client.get<Result<unknown>>('/api/resources/online', { params: { contentType, contentId, episodeId } }),

  magnet: (contentType: string, contentId: number, episodeId?: number) =>
    client.get<Result<unknown>>('/api/resources/magnet', { params: { contentType, contentId, episodeId } }),

  cloud: (contentType: string, contentId: number, episodeId?: number) =>
    client.get<Result<unknown>>('/api/resources/cloud', { params: { contentType, contentId, episodeId } }),
};

export default client;