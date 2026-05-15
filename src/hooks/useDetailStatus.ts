// @ts-nocheck
import { useState, useCallback, useRef, useEffect } from 'react';
import { listApi, statusApi } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '@/components/Toast';

export interface DetailStatus {
  want_to_watch?: boolean;
  watching?: boolean;
  watched?: boolean;
  watchedRating?: number;
  watchedNote?: string;
}

/** API 返回的片单状态条目 */
interface StatusItem {
  added: boolean;
  type: string;
  userRating?: number;
  note?: string;
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
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const { showToast } = useToast();
  const wantClickTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(() => {
    if (!isAuthenticated) return;
    setStatusLoading(true);
    statusApi.get(contentId, contentType).then(res => {
      const data = res.data.data || res.data;
      const s: DetailStatus = {};
      if (Array.isArray(data)) {
        data.forEach((item: StatusItem) => {
          if (item.added) {
            if (item.type === 'want_to_watch') s.want_to_watch = true;
            if (item.type === 'watching') s.watching = true;
            if (item.type === 'watched') {
              s.watched = true;
              if (item.userRating) s.watchedRating = Number(item.userRating);
              if (item.note) s.watchedNote = item.note;
            }
          }
        });
      }
      setStatus(s);
    }).catch(() => {}).finally(() => setStatusLoading(false));
  }, [isAuthenticated, contentId, contentType]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Add to want_to_watch or remove if already in
  const handleWantClick = useCallback(async () => {
    if (!isAuthenticated) return;
    if (status.watching) { showToast('该影片已被标记为在看', 'warning'); return; }
    if (status.watched) { showToast('该影片已被标记为看过', 'warning'); return; }
    try {
      const res = await listApi.getAll();
      const lists = res.data.data || res.data;
      const wantList = Array.isArray(lists) ? lists.find((l: UserListSummary) => l.type === 'want_to_watch') : null;
      if (!wantList) return;
      if (status.want_to_watch) {
        await listApi.removeItem(wantList.id, { movieId: contentId, contentType });
        setStatus(prev => ({ ...prev, want_to_watch: false }));
        showToast('已从想看移除', 'error');
      } else {
        await listApi.addItem(wantList.id, { movieId: contentId, contentType });
        setStatus(prev => ({ ...prev, want_to_watch: true }));
        showToast('已加入想看', 'success');
      }
    } catch {}
  }, [isAuthenticated, status, contentId, contentType, showToast]);

  // Want button: single click = toggle, double click = open modal
  const handleWantButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (wantClickTimer.current) {
      clearTimeout(wantClickTimer.current);
      wantClickTimer.current = null;
      setCollectOpen(true);
    } else {
      wantClickTimer.current = setTimeout(() => {
        wantClickTimer.current = null;
        handleWantClick();
      }, 250);
    }
  }, [handleWantClick]);

  // Open watched modal in read-only mode
  const handleWatchedClick = useCallback(() => {
    setWatchedReadOnly(true);
    setWatchedOpen(true);
  }, []);

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
