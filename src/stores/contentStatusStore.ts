import { create } from 'zustand';
import { normalizeContentType } from '@/lib/contentConstants';
import { statusApi, type ContentStatusQuery, type StatusListEntry } from '@/lib/userApi';

export interface ContentStatusValue {
  listType: string;
  listName: string;
  wantToWatch?: boolean;
}

interface ContentStatusState {
  identityKey: string;
  values: Record<string, ContentStatusValue | null>;
  revision: number;
  setIdentity: (identityKey: string) => void;
  ensureStatuses: (identityKey: string, queries: ContentStatusQuery[]) => Promise<void>;
  patchStatus: (identityKey: string, contentType: string, contentId: number, value: ContentStatusValue | null) => void;
  invalidateStatus: (identityKey: string, contentType: string, contentId: number) => void;
  clear: () => void;
}

export function contentStatusKey(contentType: string, contentId: number): string {
  return `${normalizeContentType(contentType)}:${contentId}`;
}

function preferredStatus(statuses: StatusListEntry[]): ContentStatusValue | null {
  const added = statuses.filter((status) => status.added);
  const wantToWatch = added.some((status) => status.type === 'want_to_watch');
  const selected = ['watched', 'watching', 'want_to_watch']
    .map((type) => added.find((status) => status.type === type))
    .find(Boolean) || added.find((status) => status.type === 'custom') || added[0];
  return selected ? { listType: selected.type, listName: selected.listName || selected.type, wantToWatch } : null;
}

const inFlight = new Map<string, Promise<void>>();

export const useContentStatusStore = create<ContentStatusState>((set, get) => ({
  identityKey: 'anonymous',
  values: {},
  revision: 0,

  setIdentity: (identityKey) => {
    if (get().identityKey === identityKey) return;
    set({ identityKey, values: {}, revision: 0 });
  },

  ensureStatuses: async (identityKey, queries) => {
    if (identityKey === 'anonymous' || queries.length === 0) return;
    if (get().identityKey !== identityKey) set({ identityKey, values: {}, revision: 0 });
    const unique = new Map<string, ContentStatusQuery>();
    for (const query of queries) {
      const normalizedType = normalizeContentType(query.contentType);
      unique.set(contentStatusKey(normalizedType, query.contentId), {
        contentType: normalizedType,
        contentId: query.contentId,
      });
    }
    const missing = [...unique.entries()]
      .filter(([key]) => !Object.prototype.hasOwnProperty.call(get().values, key))
      .map(([, query]) => query);
    if (missing.length === 0) return;
    const requestKey = `${identityKey}|${missing.map((query) => contentStatusKey(query.contentType, query.contentId)).sort().join(',')}`;
    const existing = inFlight.get(requestKey);
    if (existing) return existing;
    const request = statusApi.batch(missing)
      .then((response) => {
        if (get().identityKey !== identityKey) return;
        const values = Object.fromEntries((response.data.data || []).map((result) => [
          contentStatusKey(result.contentType, result.contentId),
          preferredStatus(result.statuses || []),
        ]));
        set((state) => ({ values: { ...state.values, ...values }, revision: state.revision + 1 }));
      })
      .catch((error) => {
        console.warn('[contentStatusStore] Failed to fetch statuses:', error);
      })
      .finally(() => {
        inFlight.delete(requestKey);
      });
    inFlight.set(requestKey, request);
    return request;
  },

  patchStatus: (identityKey, contentType, contentId, value) => {
    if (get().identityKey !== identityKey) return;
    set((state) => ({
      values: { ...state.values, [contentStatusKey(contentType, contentId)]: value },
      revision: state.revision + 1,
    }));
  },

  invalidateStatus: (identityKey, contentType, contentId) => {
    if (get().identityKey !== identityKey) return;
    const key = contentStatusKey(contentType, contentId);
    set((state) => {
      const values = { ...state.values };
      delete values[key];
      return { values, revision: state.revision + 1 };
    });
  },

  clear: () => set({ identityKey: 'anonymous', values: {}, revision: 0 }),
}));
