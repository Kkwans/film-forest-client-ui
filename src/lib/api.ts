import axios, { type AxiosRequestConfig } from 'axios';

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
  typeFilter?: string;
  tagId?: number;
  year?: number;
  region?: string;
  genre?: string;
  language?: string;
  hasResource?: boolean;
  userStatus?: 'all' | 'unwatched' | 'watched' | 'unlisted' | 'listed';
}

/** Detail response for movie/drama/anime/variety/short-drama */
export interface ContentDetail {
  id: number;
  title: string;
  posterUrl?: string;
  year?: number;
  region?: string;
  scoreDouban?: number;
  scoreDoubanCount?: number;
  scoreDoubanVotes?: number;
  scoreImdbCount?: number;
  scoreRtCriticCount?: number;
  scoreRtAudienceCount?: number;
  ratingCount?: number;
  scoreImdb?: number;
  scoreRt?: number;
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
  alias?: string;
  seriesName?: string;
  seriesOrder?: number;
  updatedAt?: string;
  tmdbId?: number;
  tmdbMediaType?: string;
  tmdbMatchStatus?: string;
  tmdbDiagnosticCode?: string;
  tmdbPosterUrl?: string;
  tmdbScore?: number;
  tmdbVoteCount?: number;
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
  writer?: string;
  actor?: string;
  genre?: string;
  region?: string;
  releaseDate?: string;
  matchedFields?: string[] | string;
  duration?: number;
  totalEpisode?: number;
  updatedAt?: string;
  updatedAtMs?: number | null;
  alias?: string;
}

/** 将历史接口字段（scoreRt/scoreRT、posterUrl/cover、updatedAt）收敛为搜索卡片模型。 */
export function normalizeSearchRecord(raw: unknown): SearchRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const numberValue = (candidate: unknown): number | null => {
    if (candidate == null || candidate === '') return null;
    const parsed = typeof candidate === 'number' ? candidate : Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const rawType = String(value.type || 'movie');
  const type = rawType === 'short' || rawType === 'short-drama' ? 'short_drama' : rawType;
  if (!['movie', 'drama', 'variety', 'anime', 'short_drama'].includes(type)) return null;
  const id = numberValue(value.id);
  if (id == null || id <= 0) return null;
  const updatedAtValue = value.updatedAtMs ?? value.updatedAt;
  const updatedAtMs = numberValue(updatedAtValue)
    ?? (typeof updatedAtValue === 'string' && Number.isFinite(Date.parse(updatedAtValue)) ? Date.parse(updatedAtValue) : null);
  return {
    id,
    type: type as SearchRecord['type'],
    title: String(value.title || ''),
    cover: String(value.cover ?? value.posterUrl ?? ''),
    year: numberValue(value.year),
    rating: numberValue(value.rating ?? value.scoreDouban),
    ratingImdb: numberValue(value.ratingImdb ?? value.scoreImdb),
    ratingRT: numberValue(value.ratingRT ?? value.scoreRt ?? value.scoreRT),
    summary: value.summary == null ? null : String(value.summary),
    director: value.director == null ? undefined : String(value.director),
    writer: value.writer == null ? undefined : String(value.writer),
    actor: value.actor == null ? undefined : String(value.actor),
    genre: value.genre == null ? undefined : String(value.genre),
    region: value.region == null ? undefined : String(value.region),
    releaseDate: value.releaseDate == null ? undefined : String(value.releaseDate),
    matchedFields: Array.isArray(value.matchedFields) ? value.matchedFields.filter((entry): entry is string => typeof entry === 'string') : undefined,
    duration: numberValue(value.duration) ?? undefined,
    totalEpisode: numberValue(value.totalEpisode) ?? undefined,
    updatedAtMs,
    updatedAt: value.updatedAt == null ? undefined : String(value.updatedAt),
    alias: value.alias == null ? undefined : String(value.alias),
  };
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

export interface CatalogCounts {
  movie: number;
  drama: number;
  variety: number;
  anime: number;
  short: number;
}

export const catalogApi = {
  counts: (config?: AxiosRequestConfig) => client.get<Result<CatalogCounts>>('/api/catalog/counts', config),
};

export interface HotSearchItem {
  id: number;
  type: string;
  title: string;
  score: number;
}

export const searchApi = {
  search: (keyword: string, params?: SearchParams) =>
    client.get<Result<PagedResult<SearchRecord>>>('/api/search', { params: { keyword, ...params } }),

  /** 搜索建议：标题前缀匹配 Top 10 */
  suggest: (q: string, config?: AxiosRequestConfig) =>
    client.get<Result<string[]>>('/api/search/suggest', { ...config, params: { ...config?.params, q } }),

  /** 热门搜索：评分最高的内容 Top 10 */
  hot: () =>
    client.get<Result<HotSearchItem[]>>('/api/search/hot'),
};

export const resourceApi = {
  online: (contentType: string, contentId: number, episodeNumber?: number, config?: AxiosRequestConfig) =>
    client.get<Result<unknown>>('/api/resources/online', {
      ...config,
      params: { contentType, contentId, episodeNumber },
    }),

  magnet: (contentType: string, contentId: number, config?: AxiosRequestConfig) =>
    client.get<Result<unknown>>('/api/resources/magnet', {
      ...config,
      params: { contentType, contentId },
    }),

  cloud: (contentType: string, contentId: number, config?: AxiosRequestConfig) =>
    client.get<Result<unknown>>('/api/resources/cloud', {
      ...config,
      params: { contentType, contentId },
    }),
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
  summary?: string;
}

export interface RecommendData {
  hot: Record<string, RecommendItem[]>;
  latest: Record<string, RecommendItem[]>;
}

export const recommendApi = {
  get: (topN?: number) =>
    client.get<Result<RecommendData>>('/api/recommend', { params: { topN } }),

  /** 个性化推荐：基于用户偏好类型 */
  personalized: (params: { genres?: string; region?: string; excludeIds?: string; excludeKeys?: string; limit?: number }, config?: AxiosRequestConfig) =>
    client.get<Result<RecommendItem[]>>('/api/recommend/personalized', { ...config, params }),
};

export interface RelatedItem {
  id: number;
  type: string;
  title: string;
  posterUrl?: string;
  year?: number;
  scoreDouban?: number;
  region?: string[];
  genre?: string[];
  duration?: number;
  totalEpisode?: number;
}

export const relatedApi = {
  /** 获取相关推荐（同类型 + 同标签） */
  get: (type: string, id: number, limit?: number, config?: AxiosRequestConfig) =>
    client.get<Result<RelatedItem[]>>(`/api/${type}/${id}/related`, {
      ...config,
      params: { limit },
    }),
};

export interface SeriesItem {
  id: number;
  title: string;
  year?: number;
  seriesOrder?: number;
}

export const seriesApi = {
  get: (id: number) => client.get<Result<SeriesItem[]>>(`/api/movies/${id}/series`),
};

// ---- Tags ----

export interface TagItem {
  id: number;
  name: string;
  color?: string;
  usageCount?: number;
}

export interface GenreOption {
  id: number;
  code: string;
  name: string;
  color?: string;
  contentCount: number;
}

export const tagApi = {
  /** 获取所有标签 */
  getAll: () => client.get<Result<TagItem[]>>('/api/tags'),
  /** 获取热门标签 */
  getHot: (limit?: number) => client.get<Result<TagItem[]>>('/api/tags/hot', { params: { limit } }),
  /** 获取指定内容类型适用的系统标准题材 */
  getGenres: (contentType: string, config?: AxiosRequestConfig) =>
    client.get<Result<GenreOption[]>>('/api/tags/genres', {
      ...config,
      params: { ...config?.params, contentType },
    }),
  /** 获取内容的标签 */
  getContentTags: (contentType: string, contentId: number) =>
    client.get<Result<TagItem[]>>(`/api/tags/content/${contentType}/${contentId}`),
  /** 按标签筛选内容 ID 列表 */
  getContentByTag: (tagId: number, contentType?: string, size?: number) =>
    client.get<Result<{ contentId: number }[]>>(`/api/tags/${tagId}/content`, { params: { contentType, size } }),
};

export default client;
