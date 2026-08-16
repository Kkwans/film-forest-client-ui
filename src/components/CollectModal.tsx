'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, Check, CheckCircle2, Eye, Heart, Loader2, Plus, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/Toast';
import { listApi, statusApi, type UserList } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';

interface CollectModalProps {
  open: boolean;
  onClose: () => void;
  movieId: number;
  contentType: string;
  movieTitle?: string;
}

const DEFAULT_LISTS_CONFIG = [
  { type: 'want_to_watch', label: '想看', Icon: Heart },
  { type: 'watching', label: '在看', Icon: Eye },
  { type: 'watched', label: '看过', Icon: CheckCircle2 },
];

function NoteComposer({ value, busy, onChange, onSubmit, onCancel }: {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 rounded-xl border border-border bg-background p-3">
      <label className="text-xs font-medium text-secondary-foreground" htmlFor="collect-note">备注（可选）</label>
      <input
        id="collect-note"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="例如：周末和家人一起看"
        maxLength={200}
        className="mt-2 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit();
          if (event.key === 'Escape') onCancel();
        }}
        autoFocus
      />
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="h-9 rounded-xl border border-border px-3 text-xs font-medium text-secondary-foreground hover:bg-muted disabled:opacity-50">
          取消
        </button>
        <button type="button" onClick={onSubmit} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
          {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}添加
        </button>
      </div>
    </div>
  );
}

export default function CollectModal({ open, onClose, movieId, contentType, movieTitle }: CollectModalProps) {
  const router = useRouter();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const { showToast } = useToast();
  const [lists, setLists] = useState<UserList[]>([]);
  const [movieStatus, setMovieStatus] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [showNoteInput, setShowNoteInput] = useState<number | null>(null);
  const [addNote, setAddNote] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async (signal?: AbortSignal, showLoading = true) => {
    if (!isAuthenticated) return;
    if (showLoading) setLoading(true);
    setLoadError(null);
    try {
      const [listsResponse, statusResponse] = await Promise.all([
        listApi.getAll({ signal }),
        statusApi.get(movieId, contentType, { signal }),
      ]);
      if (signal?.aborted) return;
      const nextLists = Array.isArray(listsResponse.data.data) ? listsResponse.data.data : [];
      const statuses = Array.isArray(statusResponse.data.data) ? statusResponse.data.data : [];
      setLists(nextLists);
      setMovieStatus(Object.fromEntries(statuses.map((status) => [status.listId, status.added])));
    } catch {
      if (!signal?.aborted) setLoadError('片单加载失败，请检查网络后重试');
    } finally {
      if (!signal?.aborted && showLoading) setLoading(false);
    }
  }, [contentType, isAuthenticated, movieId]);

  useEffect(() => {
    if (!open) return;
    setShowCreate(false);
    setNewName('');
    setAddNote('');
    setShowNoteInput(null);
    setActionError(null);
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData, open]);

  const defaultLists = useMemo(() => DEFAULT_LISTS_CONFIG.map((definition) => {
    const list = lists.find((candidate) => candidate.type === definition.type);
    return { ...definition, list };
  }), [lists]);
  const customLists = useMemo(() => lists.filter((list) => list.isDefault !== 1), [lists]);
  const currentDefaultType = defaultLists.find(({ list }) => list && movieStatus[list.id])?.type || null;

  const isDefaultDisabled = (type: string) => {
    if (!currentDefaultType || currentDefaultType === type) return false;
    if (currentDefaultType === 'watched') return type === 'want_to_watch' || type === 'watching';
    return currentDefaultType === 'watching' && type === 'want_to_watch';
  };

  const resetNote = () => {
    setShowNoteInput(null);
    setAddNote('');
  };

  const handleToggle = async (list: UserList, note?: string) => {
    if (!isAuthenticated) {
      onClose();
      router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const isCurrentlyIn = Boolean(movieStatus[list.id]);
    setToggling(list.id);
    setActionError(null);
    try {
      if (isCurrentlyIn) {
        await listApi.removeItem(list.id, { movieId, contentType });
      } else {
        await listApi.addItem(list.id, { movieId, contentType, note: note?.trim() || undefined });
      }
      await loadData(undefined, false);
      resetNote();
      showToast(isCurrentlyIn ? `已从“${list.name}”移除` : `已加入“${list.name}”`, 'success');
      window.dispatchEvent(new CustomEvent('movie-status-changed', {
        detail: { movieId, contentType, action: isCurrentlyIn ? 'removed' : 'added' },
      }));
    } catch {
      const message = isCurrentlyIn ? '移除失败，请重试' : '加入片单失败，请重试';
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setToggling(null);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    setActionError(null);
    let createdList: UserList | null = null;
    try {
      const response = await listApi.create({ name });
      createdList = response.data.data;
      await listApi.addItem(createdList.id, { movieId, contentType });
      await loadData(undefined, false);
      setNewName('');
      setShowCreate(false);
      showToast(`已创建并加入“${createdList.name}”`, 'success');
      window.dispatchEvent(new CustomEvent('movie-status-changed', { detail: { movieId, contentType, action: 'added' } }));
    } catch {
      const message = createdList ? '片单已创建，但内容加入失败，请重试' : '创建片单失败，请重试';
      setActionError(message);
      showToast(message, createdList ? 'warning' : 'error');
      if (createdList) await loadData(undefined, false);
    } finally {
      setCreating(false);
    }
  };

  const noteComposer = (list: UserList) => (
    <NoteComposer
      value={addNote}
      busy={toggling === list.id}
      onChange={setAddNote}
      onSubmit={() => void handleToggle(list, addNote)}
      onCancel={resetNote}
    />
  );

  return (
    <Modal open={open} onClose={onClose} title="加入片单" description={movieTitle} width="md">
      {!isAuthenticated ? (
        <div className="grid place-items-center py-14 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-accent-light text-accent"><BookmarkPlus className="size-5" aria-hidden /></span>
          <h3 className="mt-4 text-base font-semibold text-foreground">登录后管理你的片单</h3>
          <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">把内容加入想看、在看、看过或自定义片单，并在不同设备间同步。</p>
          <button type="button" onClick={() => { onClose(); router.push(`/login?from=${encodeURIComponent(window.location.pathname)}`); }} className="mt-5 h-10 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">
            去登录
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-3 py-2" aria-label="正在加载片单">
          <div className="grid grid-cols-3 gap-2">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
          {[1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : loadError ? (
        <div className="grid place-items-center py-14 text-center" role="alert">
          <p className="text-sm text-secondary-foreground">{loadError}</p>
          <button type="button" onClick={() => void loadData()} className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">
            <RotateCcw className="size-4" aria-hidden />重新加载
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          <section aria-labelledby="default-lists-title">
            <div>
              <h3 id="default-lists-title" className="text-sm font-semibold text-foreground">观看状态</h3>
              <p className="mt-1 text-xs text-muted-foreground">状态按想看 → 在看 → 看过流转，也可以点击当前状态移除。</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="默认片单">
              {defaultLists.map(({ type, label, Icon, list }) => {
                const isIn = Boolean(list && movieStatus[list.id]);
                const busy = Boolean(list && toggling === list.id);
                const disabled = !list || isDefaultDisabled(type) || busy;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (!list || disabled) return;
                      if (isIn) void handleToggle(list);
                      else { setShowNoteInput(list.id); setAddNote(''); }
                    }}
                    disabled={disabled}
                    aria-pressed={isIn}
                    className={`relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition-colors ${isIn ? 'border-accent bg-accent-light text-accent' : 'border-border bg-card text-secondary-foreground hover:border-accent/50 hover:text-foreground'} disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Icon className={`size-5 ${type === 'want_to_watch' && isIn ? 'text-red-500' : ''}`} fill={type === 'want_to_watch' && isIn ? 'currentColor' : 'none'} aria-hidden />}
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-[11px] text-muted-foreground">{list ? `${list.itemCount} 部` : '不可用'}</span>
                    {isIn && <Check className="absolute right-2 top-2 size-3.5" aria-hidden />}
                  </button>
                );
              })}
            </div>
            {showNoteInput && defaultLists.some(({ list }) => list?.id === showNoteInput) && noteComposer(defaultLists.find(({ list }) => list?.id === showNoteInput)!.list!)}
          </section>

          <section aria-labelledby="custom-lists-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 id="custom-lists-title" className="text-sm font-semibold text-foreground">自定义片单</h3>
                <p className="mt-1 text-xs text-muted-foreground">按主题整理内容，可同时加入多个自定义片单。</p>
              </div>
              {!showCreate && (
                <button type="button" onClick={() => setShowCreate(true)} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg text-xs font-semibold text-accent hover:text-accent-hover">
                  <Plus className="size-3.5" aria-hidden />新建片单
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {customLists.length === 0 && !showCreate && (
                <div className="rounded-2xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">还没有自定义片单</div>
              )}
              {customLists.map((list) => {
                const isIn = Boolean(movieStatus[list.id]);
                const busy = toggling === list.id;
                return (
                  <div key={list.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (busy) return;
                        if (isIn) void handleToggle(list);
                        else { setShowNoteInput(list.id); setAddNote(''); }
                      }}
                      disabled={busy}
                      aria-pressed={isIn}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${isIn ? 'border-accent bg-accent-light' : 'border-border bg-card hover:border-accent/40'} disabled:opacity-60`}
                    >
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${isIn ? 'bg-accent text-white' : 'bg-muted text-muted-foreground'}`}>
                        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : isIn ? <Check className="size-4" aria-hidden /> : <BookmarkPlus className="size-4" aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{list.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{list.description || `${list.itemCount} 部内容`}</span>
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{isIn ? '已加入' : '加入'}</span>
                    </button>
                    {showNoteInput === list.id && !isIn && noteComposer(list)}
                  </div>
                );
              })}
            </div>

            {showCreate && (
              <form className="mt-3 rounded-2xl border border-border bg-card p-4" onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}>
                <label htmlFor="new-list-name" className="text-xs font-medium text-secondary-foreground">片单名称</label>
                <input
                  id="new-list-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="例如：周末家庭影院"
                  maxLength={50}
                  className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowCreate(false); setNewName(''); }} disabled={creating} className="h-9 rounded-xl border border-border px-3 text-xs font-medium text-secondary-foreground hover:bg-muted disabled:opacity-50">取消</button>
                  <button type="submit" disabled={creating || !newName.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
                    {creating && <Loader2 className="size-3.5 animate-spin" aria-hidden />}创建并加入
                  </button>
                </div>
              </form>
            )}
          </section>

          {actionError && <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{actionError}</p>}
        </div>
      )}
    </Modal>
  );
}
