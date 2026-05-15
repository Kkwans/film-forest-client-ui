// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserStore } from '@/stores/userStore';
import { statusApi } from '@/lib/userApi';

export interface MovieStatusInfo {
  listType: string;
  listName: string;
}

/** API 返回的片单状态条目 */
interface StatusListEntry {
  added: boolean;
  type: string;
  listName?: string;
}

/**
 * Hook to fetch movie statuses for a batch of movies.
 * Returns a map of movieId → { listType, listName } with priority: watched > watching > want_to_watch > custom
 */
export function useMovieStatuses(movieIds: number[], contentType: string) {
  const [statusMap, setStatusMap] = useState<Record<number, MovieStatusInfo | null>>({});
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const fetchedRef = useRef<string>('');

  const fetchStatuses = useCallback(async () => {
    if (!isAuthenticated || movieIds.length === 0) return;

    const key = movieIds.sort().join(',') + ':' + contentType;
    if (key === fetchedRef.current) return;
    fetchedRef.current = key;

    try {
      const res = await statusApi.batch(movieIds, contentType);
      const data = res.data.data || res.data;

      const result: Record<number, MovieStatusInfo | null> = {};
      // Priority: watched > watching > want_to_watch > custom
      const priority = ['watched', 'watching', 'want_to_watch'];

      for (const movieId of movieIds) {
        const lists = data[movieId] || [];
        const addedLists = Array.isArray(lists) ? lists.filter((l: StatusListEntry) => l.added) : [];

        if (addedLists.length === 0) {
          result[movieId] = null;
          continue;
        }

        // Find highest priority default list
        let matched: StatusListEntry | null = null;
        for (const p of priority) {
          const found = addedLists.find((l: StatusListEntry) => l.type === p);
          if (found) { matched = found; break; }
        }

        // If not in any default list, check custom lists
        if (!matched) {
          matched = addedLists.find((l: StatusListEntry) => l.type === 'custom') || addedLists[0];
        }

        result[movieId] = matched ? { listType: matched.type, listName: matched.listName || matched.type } : null;
      }

      setStatusMap(result);
    } catch {
      // On error, leave statusMap empty
    }
  }, [isAuthenticated, movieIds, contentType]);

  useEffect(() => {
    fetchStatuses();

    // Listen for status changes
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.movieId && movieIds.includes(detail.movieId)) {
        fetchedRef.current = ''; // force re-fetch
        fetchStatuses();
      }
    };
    window.addEventListener('movie-status-changed', handler);
    return () => window.removeEventListener('movie-status-changed', handler);
  }, [fetchStatuses, movieIds]);

  return statusMap;
}
