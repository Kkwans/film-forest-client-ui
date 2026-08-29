import { useEffect, useMemo } from 'react';
import { normalizeContentType } from '@/lib/contentConstants';
import { type ContentStatusQuery } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';
import { contentStatusKey, useContentStatusStore, type ContentStatusValue } from '@/stores/contentStatusStore';

export { contentStatusKey } from '@/stores/contentStatusStore';

export type MovieStatusInfo = ContentStatusValue;

/** 一次 POST 查询首页、搜索等异构结果的用户状态。 */
export function useContentStatuses(queries: ContentStatusQuery[]) {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const userId = useUserStore((state) => state.user?.id ?? null);
  const identityKey = isAuthenticated && userId ? `user:${userId}` : 'anonymous';
  const setIdentity = useContentStatusStore((state) => state.setIdentity);
  const ensureStatuses = useContentStatusStore((state) => state.ensureStatuses);
  const storeIdentity = useContentStatusStore((state) => state.identityKey);
  const values = useContentStatusStore((state) => state.values);
  const normalized = useMemo(() => {
    const unique = new Map<string, ContentStatusQuery>();
    for (const query of queries) {
      const contentType = normalizeContentType(query.contentType);
      unique.set(contentStatusKey(contentType, query.contentId), { contentType, contentId: query.contentId });
    }
    return [...unique.values()];
  }, [queries]);

  useEffect(() => {
    setIdentity(identityKey);
    void ensureStatuses(identityKey, normalized);
  }, [ensureStatuses, identityKey, normalized, setIdentity]);

  return identityKey === 'anonymous' || storeIdentity !== identityKey ? {} : values;
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
