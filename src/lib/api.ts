import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface Result<T = unknown> {
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

/** Detail response for movie/drama/anime/variety/short-drama */
export interface ContentDetail {
  id: number;
  title: string;
  posterUrl?: string;
  year?: number;
  region?: string;
  scoreDouban?: number;
  scoreImdb?: number;
  scoreRT?: number;
  storyline?: string;
  status?: number;
  totalEpisode?: number;
  currentEpisode?: number;
  duration?: number;
  genre?: string;
  director?: string;
  writer?: string;
  actor?: string;
  language?: string;
  releaseDate?: string;
  aka?: string;
  updatedAt?: string;
}

/** Search result item from unified search API */
export interface SearchRecord {
  id: number;
  type: 'movie' | 'drama' | 'variety' | 'anime' | 'short_drama';
  title: string;
  cover: string;
  year: number | null;
  rating: number | null;
  ratingImdb: number | null;
  ratingRT: number | null;
  summary: string | null;
  director?: string;
  actor?: string;
  genre?: string;
  region?: string;
  duration?: number;
  totalEpisode?: number;
  updatedAt?: string;
  alias?: string;
}

export interface PagedResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
}

export const movieApi = {
  list: (params?: MovieListParams, config?: object) =>
    client.get<Result<unknown>>('/api/movies', { params, ...config }),

  detail: (id: number) =>
    client.get<Result<ContentDetail>>(`/api/movies/${id}`),

  hot: () =>
    client.get<Result<unknown>>('/api/hot'),

  latest: () =>
    client.get<Result<unknown>>('/api/latest'),
};

export const dramaApi = {
  list: (params?: DramaListParams, config?: object) =>
    client.get<Result<unknown>>('/api/dramas', { params, ...config }),

  detail: (id: number) =>
    client.get<Result<ContentDetail>>(`/api/dramas/${id}`),
};

export const varietyApi = {
  list: (params?: DramaListParams, config?: object) =>
    client.get<Result<unknown>>('/api/varieties', { params, ...config }),

  detail: (id: number) =>
    client.get<Result<ContentDetail>>(`/api/varieties/${id}`),
};

export const animeApi = {
  list: (params?: DramaListParams, config?: object) =>
    client.get<Result<unknown>>('/api/animes', { params, ...config }),

  detail: (id: number) =>
    client.get<Result<ContentDetail>>(`/api/animes/${id}`),
};

export const shortDramaApi = {
  list: (params?: DramaListParams, config?: object) =>
    client.get<Result<unknown>>('/api/short-dramas', { params, ...config }),

  detail: (id: number) =>
    client.get<Result<ContentDetail>>(`/api/short-dramas/${id}`),
};

export const searchApi = {
  search: (keyword: string, params?: SearchParams) =>
    client.get<Result<PagedResult<SearchRecord>>>('/api/search', { params: { keyword, ...params } }),
};

export const resourceApi = {
  online: (contentType: string, contentId: number, episodeNumber?: number) =>
    client.get<Result<unknown>>('/api/resources/online', { params: { contentType, contentId, episodeNumber } }),

  magnet: (contentType: string, contentId: number, episodeNumber?: number) =>
    client.get<Result<unknown>>('/api/resources/magnet', { params: { contentType, contentId, episodeNumber } }),

  cloud: (contentType: string, contentId: number, episodeNumber?: number) =>
    client.get<Result<unknown>>('/api/resources/cloud', { params: { contentType, contentId, episodeNumber } }),
};

export interface RecommendItem {
  id: number;
  type: string;
  title: string;
  posterUrl?: string;
  year?: number;
  scoreDouban?: number;
  genre?: string;
  region?: string;
  totalEpisode?: number;
}

export interface RecommendData {
  hot: Record<string, RecommendItem[]>;
  latest: Record<string, RecommendItem[]>;
}

export const recommendApi = {
  get: (topN?: number) =>
    client.get<Result<RecommendData>>('/api/recommend', { params: { topN } }),
};

export default client;