import { create } from 'zustand';
import { playHistoryApi, type PlayHistoryRecord } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';

/** 播放记录项。匿名记录保留本地播放源 URL，登录记录的来源由服务端资源投影派生。 */
export interface PlayHistoryItem {
  contentId: number;
  contentType: string;
  title: string;
  cover?: string;
  episode?: number;
  episodeLabel?: string;
  sourceName?: string;
  sourceUrl?: string;
  resourceId?: number;
  playbackType?: string;
  progress?: number;
  duration?: number;
  completed?: boolean;
  lastPlayedAt: number;
  year?: number;
  rating?: number;
  genres?: string[];
  region?: string;
}

type HistoryScope = 'anonymous' | 'auth-pending' | `user:${number}`;

interface PlayHistoryState {
  /** 当前账号的播放历史；切换账号期间会立即清空，避免旧账号记录闪现。 */
  history: PlayHistoryItem[];
  scope: HistoryScope;
  isLoading: boolean;
  isReady: boolean;
  loadError: string | null;
  addOrUpdate: (item: Omit<PlayHistoryItem, 'lastPlayedAt'> & { lastPlayedAt?: number }) => void;
  getRecord: (contentId: number, contentType: string) => PlayHistoryItem | undefined;
  remove: (contentId: number, contentType: string) => Promise<void>;
  clear: () => Promise<void>;
  updateProgress: (
    contentId: number,
    contentType: string,
    progress: number,
    duration?: number,
    options?: { completed?: boolean },
  ) => void;
  /** 将当前记录发送到服务端；播放失败不得阻断播放器。 */
  syncRemote: (contentId: number, contentType: string) => Promise<void>;
  /** 重新加载当前账号的权威历史。 */
  reload: () => Promise<void>;
  getRecent: (limit?: number) => PlayHistoryItem[];
}

const STORAGE_KEY = 'ff-play-history-v2';
const LEGACY_STORAGE_KEY = 'ff-play-history';
const MAX_HISTORY = 100;
const ANONYMOUS_SCOPE: HistoryScope = 'anonymous';

interface StoredHistoryPayload {
  version: 2;
  scopes: Record<string, PlayHistoryItem[]>;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function isUserScope(scope: HistoryScope): scope is `user:${number}` {
  return scope.startsWith('user:');
}

function parseUserId(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = (value as { id?: unknown }).id;
  return typeof candidate === 'number' && Number.isInteger(candidate) && candidate > 0
    ? candidate
    : null;
}

/**
 * Zustand's persisted user state and the auth token hydrate independently.
 * Read both here so a logged-in account never renders anonymous history while
 * /api/auth/me is still resolving.
 */
function getCurrentScope(): HistoryScope {
  const state = useUserStore.getState();
  const storeUserId = state.isAuthenticated ? parseUserId(state.user) : null;
  if (storeUserId != null) return `user:${storeUserId}`;

  if (isBrowser() && localStorage.getItem('ff_token')) {
    try {
      const persisted = JSON.parse(localStorage.getItem('ff-user') || '{}') as {
        state?: { user?: unknown };
      };
      const persistedUserId = parseUserId(persisted.state?.user);
      if (persistedUserId != null) return `user:${persistedUserId}`;
    } catch {
      // Corrupted auth persistence is handled by userStore; keep history empty
      // until it establishes an authoritative account or logs out.
    }
    return 'auth-pending';
  }

  return ANONYMOUS_SCOPE;
}

function normalizeItem(item: unknown): PlayHistoryItem | null {
  if (!item || typeof item !== 'object') return null;
  const value = item as Partial<PlayHistoryItem>;
  if (!Number.isInteger(value.contentId) || value.contentId == null || typeof value.contentType !== 'string') {
    return null;
  }
  if (typeof value.title !== 'string') return null;
  const lastPlayedAt = typeof value.lastPlayedAt === 'number' && Number.isFinite(value.lastPlayedAt)
    ? value.lastPlayedAt
    : Date.now();
  return {
    ...value,
    contentId: value.contentId,
    contentType: value.contentType,
    title: value.title,
    lastPlayedAt,
  } as PlayHistoryItem;
}

function normalizeList(value: unknown): PlayHistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeItem)
    .filter((item): item is PlayHistoryItem => item !== null)
    .slice(0, MAX_HISTORY);
}

function readPayload(): StoredHistoryPayload {
  if (!isBrowser()) return { version: 2, scopes: {} };

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as Partial<StoredHistoryPayload>;
    if (parsed.version === 2 && parsed.scopes && typeof parsed.scopes === 'object') {
      const scopes: Record<string, PlayHistoryItem[]> = {};
      for (const [scope, value] of Object.entries(parsed.scopes)) {
        scopes[scope] = normalizeList(value);
      }
      return { version: 2, scopes };
    }
  } catch {
    // A malformed cache is non-critical; the server or empty anonymous state
    // remains the source of truth.
  }

  // One-time migration: old unscoped data is explicitly anonymous only.
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '') as {
      state?: { history?: unknown };
      history?: unknown;
    };
    const migrated = normalizeList(legacy.state?.history ?? legacy.history);
    if (migrated.length > 0) {
      const payload = { version: 2 as const, scopes: { [ANONYMOUS_SCOPE]: migrated } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return payload;
    }
  } catch {
    // Ignore malformed legacy data.
  }

  return { version: 2, scopes: {} };
}

function writePayload(payload: StoredHistoryPayload) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota/private-mode failures must never block playback.
  }
}

function readLocalScope(scope: HistoryScope): PlayHistoryItem[] {
  return readPayload().scopes[scope] || [];
}

function persistScope(scope: HistoryScope, history: PlayHistoryItem[]) {
  if (scope === 'auth-pending') return;
  const payload = readPayload();
  payload.scopes[scope] = history.slice(0, MAX_HISTORY);
  writePayload(payload);
}

function toLocalItem(record: PlayHistoryRecord): PlayHistoryItem {
  const timestamp = Date.parse(record.lastPlayedAt);
  return {
    contentId: record.contentId,
    contentType: record.contentType,
    title: record.title,
    cover: record.posterUrl || undefined,
    year: record.year ?? undefined,
    resourceId: record.resourceId ?? undefined,
    episode: record.episodeNumber ?? undefined,
    episodeLabel: '集',
    sourceName: record.sourceName ?? undefined,
    playbackType: record.playbackType ?? undefined,
    progress: record.positionSeconds,
    duration: record.durationSeconds ?? undefined,
    completed: record.completed,
    lastPlayedAt: Number.isFinite(timestamp) ? timestamp : Date.now(),
  };
}

function toRemotePayload(item: PlayHistoryItem) {
  return {
    contentType: item.contentType,
    contentId: item.contentId,
    resourceId: item.resourceId ?? null,
    positionSeconds: Math.max(0, Math.floor(item.progress ?? 0)),
    durationSeconds: item.duration == null ? null : Math.max(0, Math.floor(item.duration)),
    completed: item.completed === true,
  };
}

let loadGeneration = 0;

async function loadScope(scope: HistoryScope) {
  const generation = ++loadGeneration;
  const remote = isUserScope(scope);
  usePlayHistoryStore.setState({
    scope,
    // Never expose the previous scope while a user history request is in flight.
    history: remote || scope === 'auth-pending' ? [] : readLocalScope(scope),
    isLoading: remote || scope === 'auth-pending',
    isReady: !remote && scope !== 'auth-pending',
    loadError: null,
  });

  if (!remote) return;

  try {
    const response = await playHistoryApi.list();
    const body = response.data;
    if (body.code !== 200 || !Array.isArray(body.data)) {
      throw new Error(body.message || '播放记录加载失败');
    }
    if (generation !== loadGeneration || usePlayHistoryStore.getState().scope !== scope) return;
    const history = body.data.map(toLocalItem).slice(0, MAX_HISTORY);
    persistScope(scope, history);
    usePlayHistoryStore.setState({ history, isLoading: false, isReady: true, loadError: null });
  } catch (error) {
    if (generation !== loadGeneration || usePlayHistoryStore.getState().scope !== scope) return;
    usePlayHistoryStore.setState({
      history: [],
      isLoading: false,
      isReady: false,
      loadError: error instanceof Error ? error.message : '播放记录加载失败',
    });
  }
}

const initialScope = getCurrentScope();

export const usePlayHistoryStore = create<PlayHistoryState>()((set, get) => ({
  history: initialScope === 'anonymous' ? readLocalScope(initialScope) : [],
  scope: initialScope,
  isLoading: initialScope === 'auth-pending' || isUserScope(initialScope),
  isReady: initialScope === 'anonymous',
  loadError: null,

  addOrUpdate: (item) => {
    const scope = get().scope;
    let nextItem: PlayHistoryItem | null = null;
    set((state) => {
      const now = Date.now();
      const existing = state.history.find(
        (historyItem) => historyItem.contentId === item.contentId && historyItem.contentType === item.contentType,
      );
      const playbackTargetChanged = Boolean(existing) && (
        (existing?.resourceId != null && item.resourceId != null && existing.resourceId !== item.resourceId)
        || (existing?.episode != null && item.episode != null && existing.episode !== item.episode)
      );
      nextItem = {
        ...(existing || {}),
        ...(playbackTargetChanged ? {
          progress: 0,
          duration: undefined,
          completed: false,
        } : {}),
        ...item,
        lastPlayedAt: item.lastPlayedAt ?? now,
      } as PlayHistoryItem;
      const updated = state.history.filter(
        (historyItem) => !(historyItem.contentId === item.contentId && historyItem.contentType === item.contentType),
      );
      const history = [nextItem as PlayHistoryItem, ...updated].slice(0, MAX_HISTORY);
      persistScope(scope, history);
      return { history, loadError: null };
    });

    if (nextItem && isUserScope(scope)) {
      void playHistoryApi.upsert(toRemotePayload(nextItem)).catch((error: unknown) => {
        if (usePlayHistoryStore.getState().scope === scope) {
          set({ loadError: error instanceof Error ? error.message : '播放记录同步失败' });
        }
      });
    }
  },

  getRecord: (contentId, contentType) => get().history.find(
    (item) => item.contentId === contentId && item.contentType === contentType,
  ),

  remove: async (contentId, contentType) => {
    const scope = get().scope;
    const previous = get().history;
    const history = previous.filter((item) => !(item.contentId === contentId && item.contentType === contentType));
    set({ history, loadError: null });
    persistScope(scope, history);
    if (!isUserScope(scope)) return;

    try {
      await playHistoryApi.remove(contentType, contentId);
    } catch (error) {
      if (get().scope === scope) {
        set({ history: previous, loadError: error instanceof Error ? error.message : '删除播放记录失败' });
        persistScope(scope, previous);
      }
      throw error;
    }
  },

  clear: async () => {
    const scope = get().scope;
    const previous = get().history;
    set({ history: [], loadError: null });
    persistScope(scope, []);
    if (!isUserScope(scope)) return;

    try {
      await playHistoryApi.clear();
    } catch (error) {
      if (get().scope === scope) {
        set({ history: previous, loadError: error instanceof Error ? error.message : '清空播放记录失败' });
        persistScope(scope, previous);
      }
      throw error;
    }
  },

  updateProgress: (contentId, contentType, progress, duration, options) => {
    const scope = get().scope;
    set((state) => {
      const index = state.history.findIndex(
        (item) => item.contentId === contentId && item.contentType === contentType,
      );
      if (index === -1) return state;
      const history = [...state.history];
      history[index] = {
        ...history[index],
        progress: Number.isFinite(progress) ? Math.max(0, progress) : history[index].progress,
        ...(duration !== undefined && Number.isFinite(duration) ? { duration: Math.max(0, duration) } : {}),
        ...(options?.completed !== undefined ? { completed: options.completed } : {}),
        lastPlayedAt: Date.now(),
      };
      persistScope(scope, history);
      return { history };
    });
  },

  syncRemote: async (contentId, contentType) => {
    const scope = get().scope;
    if (!isUserScope(scope)) return;
    const item = get().history.find(
      (historyItem) => historyItem.contentId === contentId && historyItem.contentType === contentType,
    );
    if (!item) return;
    try {
      await playHistoryApi.upsert(toRemotePayload(item));
      if (get().scope === scope) set({ loadError: null });
    } catch (error) {
      if (get().scope === scope) set({ loadError: error instanceof Error ? error.message : '播放记录同步失败' });
      throw error;
    }
  },

  reload: async () => loadScope(getCurrentScope()),

  getRecent: (limit = 20) => get().history.slice(0, limit),
}));

// Keep the store scoped to the same identity as the auth store.  The listener
// clears history synchronously before the remote request starts, preventing a
// previous account's records from appearing during login/logout transitions.
if (isBrowser()) {
  let observedScope = initialScope;
  useUserStore.subscribe(() => {
    const nextScope = getCurrentScope();
    if (nextScope === observedScope) return;
    observedScope = nextScope;
    void usePlayHistoryStore.getState().reload();
  });
  queueMicrotask(() => {
    const nextScope = getCurrentScope();
    if (nextScope !== observedScope) {
      observedScope = nextScope;
      void usePlayHistoryStore.getState().reload();
    } else if (nextScope !== 'anonymous' && usePlayHistoryStore.getState().isLoading) {
      void usePlayHistoryStore.getState().reload();
    }
  });
}
