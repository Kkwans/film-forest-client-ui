import { useState, useCallback, useEffect } from 'react';
import { listApi, statusApi } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '@/components/Toast';
import { useContentStatusStore } from '@/stores/contentStatusStore';

export interface DetailStatus {
  want_to_watch?: boolean;
  watching?: boolean;
  watched?: boolean;
  watchedRating?: number;
  watchedNote?: string;
  watchedAt?: string;
}

/** API 返回的片单状态条目 */
interface StatusItem {
  listId: number;
  added: boolean;
  type: string;
  userRating?: number;
  note?: string;
  watchedAt?: string;
}

/** API 返回的用户片单 */
interface UserListSummary {
  id: number;
  type: string;
  name?: string;
}

/**
 * Shared hook for all detail pages - manages movie status, button handlers, modals.
 * Ensures consistent behavior across movie/drama/variety/anime/short.
 */
export function useDetailStatus(contentId: number, contentType: string) {
  const [status, setStatus] = useState<DetailStatus>({});
  const [statusLoading, setStatusLoading] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [watchedOpen, setWatchedOpen] = useState(false);
  const [watchedReadOnly, setWatchedReadOnly] = useState(false);
  const [watchedListId, setWatchedListId] = useState<number | null>(null);
  const [wantListId, setWantListId] = useState<number | null>(null);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const userId = useUserStore((s) => s.user?.id ?? null);
  const patchStatus = useContentStatusStore((s) => s.patchStatus);
  const { showToast } = useToast();

  const fetchStatus = useCallback(async (signal?: AbortSignal) => {
    if (!isAuthenticated) {
      setStatus({});
      setWatchedListId(null);
      setWantListId(null);
      setStatusLoading(false);
      return;
    }
    setStatusLoading(true);
    try {
      // 默认片单接口只返回轻量 ID/name/type；状态接口负责当前内容明细。
      const [listsRes, statusRes] = await Promise.all([
        listApi.getDefaults(false, { signal }),
        statusApi.get(contentId, contentType, { signal }),
      ]);
      if (signal?.aborted) return;
      const lists = listsRes.data.data || listsRes.data;
      const data = statusRes.data.data || statusRes.data;
      const statusItems: StatusItem[] = Array.isArray(data) ? data as StatusItem[] : [];

      // Extract watchedListId for WatchedModal
      const watched = Array.isArray(lists) ? lists.find((l: UserListSummary) => l.type === 'watched') : null;
      const want = Array.isArray(lists) ? lists.find((l: UserListSummary) => l.type === 'want_to_watch') : null;
      setWatchedListId(watched?.id ?? null);
      setWantListId(want?.id ?? null);

      // Parse status
      const s: DetailStatus = {};
      if (statusItems.length > 0) {
        statusItems.forEach((item) => {
          if (item.added) {
            if (item.type === 'want_to_watch') s.want_to_watch = true;
            if (item.type === 'watching') s.watching = true;
            if (item.type === 'watched') {
              s.watched = true;
              if (item.userRating) s.watchedRating = Number(item.userRating);
              if (item.note) s.watchedNote = item.note;
              if (item.watchedAt) s.watchedAt = item.watchedAt;
            }
          }
        });
      }
      setStatus(s);
      const identityKey = userId ? `user:${userId}` : 'anonymous';
      const selected = ['watched', 'watching', 'want_to_watch']
        .map((type) => statusItems.find((item) => item.added && item.type === type))
        .find(Boolean) || statusItems.find((item) => item.added);
      patchStatus(identityKey, contentType, contentId, selected ? {
        listType: selected.type,
        listName: selected.type,
        wantToWatch: statusItems.some((item) => item.added && item.type === 'want_to_watch'),
      } : null);
    } catch {
      // 详情主体不应因个性化状态查询失败而不可用。
    } finally {
      if (!signal?.aborted) setStatusLoading(false);
    }
  }, [contentId, contentType, isAuthenticated, patchStatus, userId]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchStatus(controller.signal);
    return () => controller.abort();
  }, [fetchStatus]);

  // Add to want_to_watch or remove if already in
  const handleWantClick = useCallback(async () => {
    if (!isAuthenticated) {
      setCollectOpen(true);
      return;
    }
    if (!wantListId) {
      showToast('想看片单暂不可用，请稍后重试', 'error');
      return;
    }
    try {
      if (status.want_to_watch) {
        await listApi.removeItem(wantListId, { movieId: contentId, contentType });
        setStatus(prev => ({ ...prev, want_to_watch: false }));
        if (userId) patchStatus(`user:${userId}`, contentType, contentId, status.watched ? { listType: 'watched', listName: '看过', wantToWatch: false } : status.watching ? { listType: 'watching', listName: '在看', wantToWatch: false } : null);
        showToast('已从想看移除', 'info');
      } else {
        await listApi.addItem(wantListId, { movieId: contentId, contentType });
        setStatus(prev => ({ ...prev, want_to_watch: true }));
        if (userId) patchStatus(`user:${userId}`, contentType, contentId, { listType: status.watched ? 'watched' : status.watching ? 'watching' : 'want_to_watch', listName: status.watched ? '看过' : status.watching ? '在看' : '想看', wantToWatch: true });
        showToast('已加入想看', 'success');
      }
    } catch {
      showToast('想看状态更新失败，请重试', 'error');
    }
  }, [contentId, contentType, isAuthenticated, patchStatus, showToast, status, userId, wantListId]);

  const handleWantButtonClick = useCallback(() => {
    void handleWantClick();
  }, [handleWantClick]);

  // Open watched modal in read-only mode
  const handleWatchedClick = useCallback(() => {
    if (!isAuthenticated) {
      setCollectOpen(true);
      return;
    }
    setWatchedReadOnly(Boolean(status.watched));
    setWatchedOpen(true);
  }, [isAuthenticated, status.watched]);

  // Close watched modal and refresh
  const handleWatchedClose = useCallback(() => {
    setWatchedOpen(false);
    setWatchedReadOnly(false);
    fetchStatus();
  }, [fetchStatus]);

  // Switch from read-only to edit mode
  const handleWatchedEdit = useCallback(() => {
    setWatchedReadOnly(false);
  }, []);

  // Close collect modal and refresh
  const handleCollectClose = useCallback(() => {
    setCollectOpen(false);
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    statusLoading,
    watchedListId,
    collectOpen,
    watchedOpen,
    watchedReadOnly,
    setCollectOpen,
    setWatchedOpen,
    handleWantClick,
    handleWantButtonClick,
    handleWatchedClick,
    handleWatchedClose,
    handleWatchedEdit,
    handleCollectClose,
    fetchStatus,
  };
}
