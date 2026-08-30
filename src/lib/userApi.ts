import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosRequestConfig, type AxiosResponse } from 'axios';

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
  (res: AxiosResponse) => {
    const payload = res.data as { code?: number; message?: string } | null;
    if (payload && typeof payload.code === 'number' && payload.code !== 200) {
      if (payload.code === 401 && !res.config.url?.includes('/api/auth/login')) {
        clearExpiredSession();
      }
      if (payload.code === 428 && typeof window !== 'undefined'
          && !res.config.url?.includes('/api/auth/change-password')
          && !window.location.pathname.startsWith('/change-password')) {
        // Axios interceptors run outside React, so no router instance is available here.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/change-password?from=${encodeURIComponent(window.location.pathname)}`);
      }
      return Promise.reject(new AxiosError(
        payload.message || '请求失败',
        'ERR_BAD_RESPONSE',
        res.config,
        res.request,
        res,
      ));
    }
    return res;
  },
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      clearExpiredSession();
    }
    return Promise.reject(err);
  },
);

function clearExpiredSession() {
  if (typeof window === 'undefined') return;
  if ((window as Window & { __ffLogoutFlag?: boolean }).__ffLogoutFlag) return;
  localStorage.removeItem('ff_token');
  localStorage.removeItem('ff-user');
  localStorage.removeItem('ff_user');
  if (!window.location.pathname.startsWith('/login')) {
    // Axios interceptors run outside React, so a hard navigation is required to leave a stale protected tree.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
  }
}

export interface User {
  id: number;
  username: string;
  nickname?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  avatarUrl?: string;
  status?: number;
  role?: 'USER' | 'ADMIN';
  mustChangePassword?: boolean;
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

export interface UserDefaultList {
  id: number;
  name: string;
  type: string;
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
  watchedAt?: string;
  region?: string;
  genre?: string;
  director?: string;
  actor?: string;
  duration?: number;
  totalEpisode?: number;
}

export interface UserListPage {
  records: UserListItem[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface ProfileOverviewItem {
  id: number;
  listId: number;
  listName?: string;
  listType?: string;
  movieId: number;
  contentType: string;
  addedAt?: string;
  watchedAt?: string;
  title: string;
  cover?: string;
  year?: number;
  rating?: number;
  userRating?: number;
  note?: string;
  region?: string;
  genre?: string;
  duration?: number;
  totalEpisode?: number;
}

export interface ProfileFacet {
  value: string;
  count: number;
}

export interface ProfileOverview {
  stats: {
    listCount: number;
    wantCount: number;
    watchedCount: number;
    customCount: number;
  };
  recentWatched: ProfileOverviewItem[];
  recentRatings: ProfileOverviewItem[];
  wantPreview: ProfileOverviewItem[];
  customListPreview: ProfileOverviewItem[];
  topGenres: ProfileFacet[];
  topRegions: ProfileFacet[];
}

/**
 * Server-authoritative playback history projection.
 *
 * The server derives title/poster/source metadata from the published content
 * and resource tables.  Keep the client contract narrow so a browser cannot
 * persist arbitrary display text or playback URLs as trusted history data.
 */
export interface PlayHistoryRecord {
  id: number;
  contentType: string;
  contentId: number;
  title: string;
  posterUrl: string | null;
  year: number | null;
  genre: string | null;
  region: string | null;
  resourceId: number | null;
  episodeNumber: number | null;
  episodeTitle: string | null;
  sourceName: string | null;
  playbackType: string | null;
  positionSeconds: number;
  durationSeconds: number | null;
  completed: boolean;
  lastPlayedAt: string;
}

/** Only identifiers and progress are accepted when writing playback history. */
export interface PlayHistoryUpsert {
  contentType: string;
  contentId: number;
  resourceId?: number | null;
  positionSeconds: number;
  durationSeconds?: number | null;
  completed: boolean;
}

export const userApi = {
  login: (data: { username: string; password: string }) =>
    authClient.post<Result<unknown>>('/api/auth/login', data),
  me: () => authClient.get<Result<unknown>>('/api/auth/me'),
  validateInvitation: (token: string) =>
    authClient.post<Result<{ valid: boolean; expiresAt: string | null }>>('/api/auth/invitations/validate', { token }),
  registerByInvitation: (data: { token: string; username: string; password: string; email?: string }) =>
    authClient.post<Result<{ username: string }>>('/api/auth/register-by-invitation', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    authClient.post<Result<unknown>>('/api/auth/change-password', data),
};

export interface PosterSetting {
  posterSource: 'original' | 'tmdb';
  configured: boolean;
  credentialType: 'api_key' | 'read_access_token' | null;
  maskedHint: string | null;
  validationStatus: 'not_configured' | 'unverified' | 'valid' | 'invalid' | 'rate_limited' | 'unavailable';
  validationErrorCode: string | null;
  validatedAt: string | null;
}

export interface PosterResolution {
  contentType: string;
  contentId: number;
  posterUrl: string | null;
  source: 'original' | 'tmdb';
  matchStatus: string;
  diagnosticCode: string | null;
  confidence: number | null;
  matchedAt: string | null;
  tmdbScore?: number | null;
  tmdbVoteCount?: number | null;
}

export interface PosterEnrichmentJob {
  id: number;
  status: 'queued' | 'running' | 'cancel_requested' | 'success' | 'partial_success' | 'failed' | 'cancelled' | 'interrupted';
  cancelRequested: boolean;
  contentType: string | null;
  totalCount: number;
  processedCount: number;
  matchedCount: number;
  pendingCount: number;
  failedCount: number;
  currentContentType: string | null;
  currentContentId: number | null;
  errorSummary: string | null;
  queuedAt: string;
  startedAt: string | null;
  heartbeatAt: string | null;
  finishedAt: string | null;
  active: boolean;
}

export const posterApi = {
  getSettings: () => authClient.get<Result<PosterSetting>>('/api/poster/settings'),
  savePreference: (posterSource: 'original' | 'tmdb') =>
    authClient.put<Result<PosterSetting>>('/api/poster/settings/preference', { posterSource }),
  saveCredential: (credentialType: 'api_key' | 'read_access_token', credential: string) =>
    authClient.put<Result<PosterSetting>>('/api/poster/settings/credential', { credentialType, credential }),
  clearCredential: () => authClient.delete<Result<PosterSetting>>('/api/poster/settings/credential'),
  validateCredential: () => authClient.post<Result<PosterSetting>>('/api/poster/settings/credential/validate'),
  resolve: (items: { contentType: string; contentId: number }[]) =>
    authClient.post<Result<PosterResolution[]>>('/api/poster/resolve', { items }),
  enrich: (contentType: string, contentId: number) =>
    authClient.post<Result<PosterResolution>>('/api/poster/enrich', { contentType, contentId }),
  latestJob: () => authClient.get<Result<PosterEnrichmentJob | null>>('/api/poster/enrichment-jobs/latest'),
  startJob: (contentType?: string) =>
    authClient.post<Result<PosterEnrichmentJob>>('/api/poster/enrichment-jobs', contentType ? { contentType } : {}),
  cancelJob: (jobId: number) =>
    authClient.post<Result<PosterEnrichmentJob>>(`/api/poster/enrichment-jobs/${jobId}/cancel`),
};

let defaultListsCache: UserDefaultList[] | null = null;
let defaultListsCacheToken: string | null = null;
let defaultListsRequest: {
  token: string | null;
  promise: Promise<AxiosResponse<Result<UserDefaultList[]>>>;
} | null = null;

export const listApi = {
  getAll: (config?: AxiosRequestConfig) => authClient.get<Result<UserList[]>>('/api/user/lists', config),
  getDefaults: (force = false, config?: AxiosRequestConfig) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ff_token') : null;
    if (!force && defaultListsCache && defaultListsCacheToken === token) {
      return Promise.resolve({ data: { code: 200, data: defaultListsCache } } as AxiosResponse<Result<UserDefaultList[]>>);
    }
    if (!force && defaultListsRequest?.token === token) return defaultListsRequest.promise;
    const promise = authClient
      .get<Result<UserDefaultList[]>>('/api/user/lists/defaults', config)
      .then((response) => {
        const lists = Array.isArray(response.data.data) ? response.data.data : [];
        defaultListsCache = lists;
        defaultListsCacheToken = token;
        return response;
      })
      .finally(() => {
        if (defaultListsRequest?.promise === promise) defaultListsRequest = null;
      });
    defaultListsRequest = { token, promise };
    return promise;
  },
  invalidateDefaults: () => {
    defaultListsCache = null;
    defaultListsCacheToken = null;
  },
  create: (data: { name: string; description?: string }) => authClient.post<Result<UserList>>('/api/user/lists', data),
  update: (id: number, data: { name?: string; description?: string }) => authClient.put<Result<unknown>>(`/api/user/lists/${id}`, data),
  remove: (id: number) => authClient.delete<Result<unknown>>(`/api/user/lists/${id}`),
  getItems: (id: number, params?: { page?: number; size?: number; sort?: string; sortDir?: string; contentType?: string }, config?: AxiosRequestConfig) =>
    authClient.get<Result<UserListPage>>(`/api/user/lists/${id}/items`, { ...config, params }),
  addItem: (id: number, data: { movieId: number; contentType: string; rating?: number; note?: string }) =>
    authClient.post<Result<unknown>>(`/api/user/lists/${id}/items`, data),
  removeItem: (id: number, data: { movieId: number; contentType: string }) =>
    authClient.delete(`/api/user/lists/${id}/items`, { data } as object),
  batchRemoveItems: (id: number, items: { movieId: number; contentType: string }[]) =>
    authClient.delete(`/api/user/lists/${id}/items/batch`, { data: { items } } as object),
  updateItem: (id: number, data: { movieId: number; contentType: string; rating?: number; note?: string }) =>
    authClient.put<Result<unknown>>(`/api/user/lists/${id}/items`, data),
};

export const profileApi = {
  getOverview: (config?: AxiosRequestConfig) =>
    authClient.get<Result<ProfileOverview>>('/api/user/profile/overview', config),
};

export interface ContentStatusQuery {
  contentType: string;
  contentId: number;
}

export interface StatusListEntry {
  listId: number;
  added: boolean;
  type: string;
  listName?: string;
  userRating?: number;
  note?: string;
  watchedAt?: string;
}

export interface ContentStatusResult extends ContentStatusQuery {
  statuses: StatusListEntry[];
}

export const statusApi = {
  get: (movieId: number, contentType: string, config?: AxiosRequestConfig) =>
    authClient.get<Result<StatusListEntry[]>>('/api/user/movie-status', {
      ...config,
      params: { ...config?.params, movieId, contentType },
    }),
  batch: (queries: ContentStatusQuery[]) =>
    authClient.post<Result<ContentStatusResult[]>>('/api/user/movie-status-batch', queries),
};

export const playHistoryApi = {
  list: (config?: AxiosRequestConfig) =>
    authClient.get<Result<PlayHistoryRecord[]>>('/api/user/play-history', {
      ...config,
      params: { limit: 100, ...config?.params },
    }),
  upsert: (data: PlayHistoryUpsert) =>
    authClient.put<Result<null>>('/api/user/play-history', data),
  remove: (contentType: string, contentId: number) =>
    authClient.delete<Result<null>>(`/api/user/play-history/${encodeURIComponent(contentType)}/${contentId}`),
  clear: () => authClient.delete<Result<null>>('/api/user/play-history'),
};

export default authClient;
