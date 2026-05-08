// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { listApi, type UserList } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'next/navigation';

interface CollectModalProps {
  open: boolean;
  onClose: () => void;
  movieId: number;
  contentType: string;
  movieTitle?: string;
}

export default function CollectModal({ open, onClose, movieId, contentType, movieTitle }: CollectModalProps) {
  const router = useRouter();
  const { isAuthenticated } = useUserStore();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(false);
  const [movieStatus, setMovieStatus] = useState<Record<number, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [listsRes, statusRes] = await Promise.all([
        listApi.getAll(),
        listApi.getAll(), // We'll check each list for membership
      ]);
      const allLists: UserList[] = listsRes.data.data || listsRes.data;
      setLists(allLists);

      // Check movie status for each list
      const statusMap: Record<number, boolean> = {};
      for (const list of allLists) {
        try {
          const itemsRes = await listApi.getItems(list.id, { page: 1, size: 500 });
          const items = itemsRes.data.data?.records || itemsRes.data.data || itemsRes.data || [];
          const found = Array.isArray(items) && items.some((item: any) => item.movieId === movieId);
          statusMap[list.id] = found;
        } catch {
          statusMap[list.id] = false;
        }
      }
      setMovieStatus(statusMap);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, movieId]);

  useEffect(() => {
    if (open) {
      loadData();
      setShowCreate(false);
      setNewName('');
    }
  }, [open, loadData]);

  const handleToggle = async (listId: number) => {
    if (!isAuthenticated) {
      router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setToggling(listId);
    const isCurrentlyIn = movieStatus[listId];
    try {
      if (isCurrentlyIn) {
        await listApi.removeItem(listId, { movieId, contentType });
      } else {
        await listApi.addItem(listId, { movieId, contentType });
      }
      setMovieStatus((prev) => ({ ...prev, [listId]: !isCurrentlyIn }));
    } catch {
      // silent
    } finally {
      setToggling(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await listApi.create({ name: newName.trim() });
      const newList = res.data.data || res.data;
      setLists((prev) => [...prev, newList]);
      setMovieStatus((prev) => ({ ...prev, [newList.id]: false }));
      setNewName('');
      setShowCreate(false);
      // Auto-add to new list
      await handleToggle(newList.id);
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-md max-h-[70vh] rounded-t-2xl sm:rounded-2xl border flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              收藏到片单
            </h3>
            {movieTitle && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {movieTitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {!isAuthenticated ? (
            <div className="text-center py-8">
              <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                登录后可以收藏影视
              </p>
              <button
                onClick={() => {
                  onClose();
                  router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                去登录
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
              ))}
            </div>
          ) : (
            <>
              {lists.map((list) => {
                const isIn = movieStatus[list.id];
                const isTogglingThis = toggling === list.id;
                return (
                  <button
                    key={list.id}
                    onClick={() => handleToggle(list.id)}
                    disabled={isTogglingThis}
                    className="w-full flex items-center justify-between p-3 rounded-lg mb-1.5 transition-colors text-left"
                    style={{
                      backgroundColor: isIn ? 'var(--accent-light, rgba(59,130,246,0.1))' : 'var(--bg-card)',
                      border: `1px solid ${isIn ? 'var(--accent)' : 'var(--border-color)'}`,
                      opacity: isTogglingThis ? 0.6 : 1,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {list.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {list.itemCount} 部
                      </p>
                    </div>
                    {isTogglingThis ? (
                      <div
                        className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
                        style={{ color: 'var(--accent)' }}
                      />
                    ) : isIn ? (
                      <svg
                        className="w-5 h-5 shrink-0"
                        style={{ color: 'var(--accent)' }}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                  </button>
                );
              })}

              {/* Create new list */}
              {showCreate ? (
                <div className="mt-2 p-3 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="新片单名称"
                    autoFocus
                    className="w-full h-9 px-3 rounded-lg text-sm border outline-none mb-2"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreate();
                      if (e.key === 'Escape') setShowCreate(false);
                    }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowCreate(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={creating || !newName.trim()}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      {creating ? '...' : '创建并收藏'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full flex items-center gap-2 p-3 rounded-lg mt-1 transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span className="text-sm font-medium">新建片单</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
