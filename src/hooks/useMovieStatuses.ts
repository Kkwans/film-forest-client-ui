import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeContentType } from '@/lib/contentConstants';
import { statusApi, type ContentStatusQuery, type StatusListEntry } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';

export interface MovieStatusInfo {
  listType: string;
  listName: string;
}

function preferredStatus(statuses: StatusListEntry[]): MovieStatusInfo | null {
  const added = statuses.filter((status) => status.added);
  const selected = ['watched', 'watching', 'want_to_watch']
    .map((type) => added.find((status) => status.type === type))
    .find(Boolean) || added.find((status) => status.type === 'custom') || added[0];
  return selected ? { listType: selected.type, listName: selected.listName || selected.type } : null;
}

export function contentStatusKey(contentType: string, contentId: number): string {
  return `${normalizeContentType(contentType)}:${contentId}`;
}

/** 一次 POST 查询首页、搜索等异构结果的用户状态。 */
export function useContentStatuses(queries: ContentStatusQuery[]) {
  const [statusState, setStatusState] = useState<{
    identityKey: string;
    values: Record<string, MovieStatusInfo | null>;
  }>({ identityKey: '', values: {} });
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const userId = useUserStore((state) => state.user?.id ?? null);
  const identityKey = isAuthenticated && userId ? `user:${userId}` : 'anonymous';
  const fetchedRef = useRef('');
  const normalized = useMemo(() => {
    const unique = new Map<string, ContentStatusQuery>();
    for (const query of queries) {
      const contentType = normalizeContentType(query.contentType);
      unique.set(contentStatusKey(contentType, query.contentId), { contentType, contentId: query.contentId });
    }
    return [...unique.values()];
  }, [queries]);
  const requestKey = useMemo(
    () => `${identityKey}|${normalized.map((query) => contentStatusKey(query.contentType, query.contentId)).sort().join(',')}`,
    [identityKey, normalized],
  );
  const statusMap = statusState.identityKey === identityKey ? statusState.values : {};

  const fetchStatuses = useCallback(async () => {
    if (!isAuthenticated || !userId || normalized.length === 0 || requestKey === fetchedRef.current) return;
    fetchedRef.current = requestKey;
    try {
      const response = await statusApi.batch(normalized);
      const next: Record<string, MovieStatusInfo | null> = {};
      for (const result of response.data.data || []) {
        next[contentStatusKey(result.contentType, result.contentId)] = preferredStatus(result.statuses || []);
      }
      setStatusState({ identityKey, values: next });
    } catch (error) {
      fetchedRef.current = '';
      console.warn('[useContentStatuses] Failed to fetch statuses:', error);
    }
  }, [identityKey, isAuthenticated, normalized, requestKey, userId]);

  useEffect(() => {
    void fetchStatuses();
    const handler = () => {
      fetchedRef.current = '';
      void fetchStatuses();
    };
    window.addEventListener('movie-status-changed', handler);
    return () => window.removeEventListener('movie-status-changed', handler);
  }, [fetchStatuses]);

  return statusMap;
}

/** 兼容同类型列表页，内部仍复用异构批量契约。 */
export function useMovieStatuses(movieIds: number[], contentType: string) {
  const queries = useMemo(
    () => movieIds.map((contentId) => ({ contentType, contentId })),
    [movieIds, contentType],
  );
  const mixed = useContentStatuses(queries);
  return useMemo(() => Object.fromEntries(
    movieIds.map((id) => [id, mixed[contentStatusKey(contentType, id)] || null]),
  ) as Record<number, MovieStatusInfo | null>, [movieIds, mixed, contentType]);
}
