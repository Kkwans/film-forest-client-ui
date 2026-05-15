'use client';

import { useState, useEffect, useCallback } from 'react';
import { listApi, type UserList, type UserListItem } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'next/navigation';

interface CollectModalProps {
  open: boolean;
  onClose: () => void;
  movieId: number;
  contentType: string;
  movieTitle?: string;
}

const DEFAULT_LISTS_CONFIG = [
  { type: 'want_to_watch', label: '想看', icon: '🔖' },
  { type: 'watching', label: '在看', icon: '👁️' },
  { type: 'watched', label: '看过', icon: '✅' },
];

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
  // Note input for adding
  const [addNote, setAddNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState<number | null>(null);

  const defaultLists = DEFAULT_LISTS_CONFIG.map(d => {
    const found = lists.find(l => l.type === d.type);
    return { ...d, id: found?.id || 0, itemCount: found?.itemCount || 0, loaded: !!found };
  });

  const customLists = lists.filter(l => l.isDefault !== 1);

  // Determine which default list the movie is currently in
  const getCurrentDefaultType = (): string | null => {
    for (const d of defaultLists) {
      if (d.id && movieStatus[d.id]) return d.type;
    }
    return null;
  };
  const currentDefaultType = getCurrentDefaultType();

  // Mutual exclusion: determine if a default list button should be disabled
  const isDefaultDisabled = (type: string): boolean => {
    if (!currentDefaultType) return false;
    if (currentDefaultType === type) return false; // Can always toggle off
    // watched blocks want_to_watch and watching
    if (currentDefaultType === 'watched') return type === 'want_to_watch' || type === 'watching';
    // watching blocks want_to_watch
    if (currentDefaultType === 'watching') return type === 'want_to_watch';
    return false;
  };

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const listsRes = await listApi.getAll();
      const allListsRaw = listsRes.data as { data?: UserList[] } | UserList[] | undefined;
      const allLists: UserList[] = Array.isArray(allListsRaw) ? allListsRaw : (allListsRaw?.data || []);
      setLists(allLists);

      const statusMap: Record<number, boolean> = {};
      for (const list of allLists) {
        try {
          const itemsRes = await listApi.getItems(list.id, { page: 1, size: 500 });
          const rawItems = itemsRes.data as { data?: { records?: UserListItem[] } | UserListItem[] } | undefined;
          const items = Array.isArray(rawItems) ? rawItems : (rawItems?.data && typeof rawItems.data === 'object' ? (rawItems.data as { records?: UserListItem[] }).records || (rawItems.data as UserListItem[]) : []);
          statusMap[list.id] = Array.isArray(items) && items.some((item: UserListItem) => item.movieId === movieId);
        } catch {
          statusMap[list.id] = false;
        }
      }
      setMovieStatus(statusMap);
    } catch {} finally {
      setLoading(false);
    }
  }, [isAuthenticated, movieId]);

  useEffect(() => {
    if (open) {
      loadData();
      setShowCreate(false);
      setNewName('');
      setAddNote('');
      setShowNoteInput(null);
    }
  }, [open, loadData]);

  const handleToggle = async (listId: number, note?: string) => {
    if (!isAuthenticated) {
      router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!listId) return;
    setToggling(listId);
    const isCurrentlyIn = movieStatus[listId];
    try {
      if (isCurrentlyIn) {
        await listApi.removeItem(listId, { movieId, contentType });
        setMovieStatus((prev) => ({ ...prev, [listId]: false }));
      } else {
        await listApi.addItem(listId, { movieId, contentType, note: note || undefined });
        // Find the list type for mutual exclusion
        const targetList = lists.find(l => l.id === listId);
        const targetType = targetList?.type;

        // Mutual exclusion for default lists:
        // - want_to_watch: no exclusion needed
        // - watching: remove from want_to_watch
        // - watched: remove from want_to_watch AND watching
        const newStatus = { ...movieStatus, [listId]: true };
        if (targetType === 'watching' || targetType === 'watched') {
          // Remove from want_to_watch
          const wantList = lists.find(l => l.type === 'want_to_watch');
          if (wantList) newStatus[wantList.id] = false;
        }
        if (targetType === 'watched') {
          // Remove from watching
          const watchingList = lists.find(l => l.type === 'watching');
          if (watchingList) newStatus[watchingList.id] = false;
        }
        setMovieStatus(newStatus);
      }
      setShowNoteInput(null);
      setAddNote('');
    } catch {} finally {
      setToggling(null);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await listApi.create({ name: newName.trim() });
      const newList = res.data as { data?: UserList } | UserList | undefined;
      const finalList: UserList = (newList && 'data' in newList) ? (newList.data as UserList) : (newList as UserList);
      setLists((prev) => [...prev, finalList]);
      setMovieStatus((prev) => ({ ...prev, [finalList.id]: false }));
      setNewName('');
      setShowCreate(false);
      await handleToggle(finalList.id);
    } catch {} finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[70vh] rounded-t-2xl sm:rounded-2xl border flex flex-col"
        >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0 border-border" >
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground" >收藏到片单</h3>
            {movieTitle && <p className="text-xs mt-0.5 truncate text-muted-foreground" >{movieTitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 text-muted-foreground" >✕</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {!isAuthenticated ? (
            <div className="text-center py-8">
              <p className="text-sm mb-3 text-muted-foreground" >登录后可以收藏影视</p>
              <button onClick={() => { onClose(); router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-accent" >去登录</button>
            </div>
          ) : (
            <>
              {/* Default lists - one row, 3 columns */}
              <div className="grid grid-cols-3 gap-2 mb-1">
                {defaultLists.map(d => {
                  const isIn = movieStatus[d.id];
                  const isTogglingThis = toggling === d.id;
                  const disabled = isDefaultDisabled(d.type) || isTogglingThis || !d.loaded;
                  return (
                    <button
                      key={d.label}
                      onClick={() => {
                        if (disabled) return;
                        if (isIn) { handleToggle(d.id); return; }
                        setShowNoteInput(d.id);
                      }}
                      disabled={disabled}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors"
                      style={{
                        backgroundColor: isIn ? 'var(--accent-light, rgba(59,130,246,0.1))' : 'var(--bg-card)',
                        borderColor: isIn ? 'var(--accent)' : 'var(--border-color)',
                        opacity: disabled ? 0.4 : 1,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span className="text-xl">{d.icon}</span>
                      <span className={`text-xs font-medium ${isIn ? 'text-accent' : 'text-foreground'}`}>{d.label}</span>
                      {d.loaded && <span className="text-[10px] text-muted-foreground" >{d.itemCount}部</span>}
                      {isTogglingThis && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin bg-accent"  />}
                      {isIn && !isTogglingThis && (
                        <svg className="w-4 h-4 bg-accent"  viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Note input for default lists */}
              {showNoteInput && defaultLists.find(d => d.id === showNoteInput) && (
                <div className="mb-3 px-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addNote}
                      onChange={(e) => setAddNote(e.target.value)}
                      placeholder="添加备注（可选）"
                      maxLength={200}
                      className="flex-1 h-8 px-3 rounded-lg text-xs border outline-none"

                      onKeyDown={(e) => { if (e.key === 'Enter') { handleToggle(showNoteInput, addNote); setShowNoteInput(null); setAddNote(''); } if (e.key === 'Escape') { setShowNoteInput(null); setAddNote(''); } }}
                      autoFocus
                    />
                    <button onClick={() => { handleToggle(showNoteInput, addNote); setShowNoteInput(null); setAddNote(''); }} className="h-8 px-3 rounded-lg text-xs font-medium text-white bg-accent" >添加</button>
                    <button onClick={() => { setShowNoteInput(null); setAddNote(''); }} className="h-8 px-3 rounded-lg text-xs font-medium text-white text-destructive" >取消</button>
                  </div>
                </div>
              )}

              {/* Divider */}
              {customLists.length > 0 && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px border-border"  />
                  <span className="text-xs text-muted-foreground" >自定义片单</span>
                  <div className="flex-1 h-px border-border"  />
                </div>
              )}

              {/* Custom lists - one per row, with description */}
              {loading && customLists.length === 0 ? (
                <div className="space-y-2 bg-card">{[1, 2].map((i) => <div key={i} className="h-14 rounded-lg animate-pulse"  />)}</div>
              ) : (
                customLists.map((list) => {
                  const isIn = movieStatus[list.id];
                  const isTogglingThis = toggling === list.id;
                  return (
                    <div key={list.id}>
                      <button
                        onClick={() => {
                          if (showNoteInput === list.id) {
                            handleToggle(list.id, addNote);
                          } else {
                            setShowNoteInput(list.id);
                          }
                        }}
                        disabled={isTogglingThis}
                        className="w-full flex items-center justify-between p-3 rounded-lg mb-1.5 transition-colors text-left"
                        style={{
                          backgroundColor: isIn ? 'var(--accent-light)' : 'var(--bg-card)',
                          border: `1px solid ${isIn ? 'var(--accent)' : 'var(--border-color)'}`,
                          opacity: isTogglingThis ? 0.6 : 1,
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-foreground" >{list.name}</p>
                          {list.description && <p className="text-xs truncate mt-0.5 text-muted-foreground" >{list.description}</p>}
                          <p className="text-xs text-muted-foreground" >{list.itemCount} 部</p>
                        </div>
                        {isTogglingThis ? (
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 bg-accent"  />
                        ) : isIn ? (
                          <svg className="w-5 h-5 shrink-0 bg-accent"  viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                        ) : (
                          <svg className="w-5 h-5 shrink-0 text-muted-foreground"  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        )}
                      </button>
                      {/* Note input - shown when clicking custom list */}
                      {showNoteInput === list.id && !isIn && (
                        <div className="px-3 pb-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={addNote}
                              onChange={(e) => setAddNote(e.target.value)}
                              placeholder="添加备注（可选）"
                              maxLength={200}
                              className="flex-1 h-8 px-3 rounded-lg text-xs border outline-none"

                              onKeyDown={(e) => { if (e.key === 'Enter') handleToggle(list.id, addNote); if (e.key === 'Escape') setShowNoteInput(null); }}
                              autoFocus
                            />
                            <button onClick={() => handleToggle(list.id, addNote)} className="h-8 px-3 rounded-lg text-xs font-medium text-white bg-accent" >添加</button>
                            <button onClick={() => { setShowNoteInput(null); setAddNote(''); }} className="h-8 px-3 rounded-lg text-xs font-medium text-white text-destructive" >取消</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Create new list */}
              {showCreate ? (
                <div className="mt-2 p-3 rounded-lg border border-border bg-card" >
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新片单名称" autoFocus
                    className="w-full h-9 px-3 rounded-lg text-sm border outline-none mb-2"

                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-secondary-foreground" >取消</button>
                    <button onClick={handleCreate} disabled={creating || !newName.trim()} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50 bg-accent" >{creating ? '...' : '创建并收藏'}</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowCreate(true)} className="w-full flex items-center gap-2 p-3 rounded-lg mt-1 transition-colors bg-accent" >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
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
