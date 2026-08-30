'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  ChevronRight,
  Clock3,
  FolderHeart,
  Inbox,
  Info,
  ListPlus,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Pencil,
  RefreshCw,
  SearchX,
  Settings,
  Sun,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useUserStore, hasStoredToken } from '@/stores/userStore';
import { listApi, type UserList } from '@/lib/userApi';
import { useToast } from '@/components/Toast';
import { cleanTitle as cleanTitleUtil, formatRelativeTime, parseRegion } from '@/lib/utils';
import { parseJsonArr } from '@/lib/contentConstants';
import { formatWatchedAt, fractionalStarFill, parseProfileArchiveQuery } from '@/lib/uiContracts';
import { TypeBadge, GenreTags } from '@/components/ContentShared';
import LazyImage from '@/components/ui/lazy-image';
import PosterSettingsCard from '@/components/PosterSettingsCard';
import { usePosterUrl } from '@/hooks/usePosterUrl';
import { useContentStatusStore } from '@/stores/contentStatusStore';
import { Modal } from '@/components/ui/modal';
import Dialog from '@/components/Dialog';
import WatchedModal from '@/components/WatchedModal';
import CustomSelect from '@/components/CustomSelect';
import Pagination from '@/components/Pagination';
import UserAvatar from '@/components/ui/UserAvatar';

interface TabDefinition {
  key: ProfileView;
  label: string;
  description: string;
  href: string;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

export type ProfileView = 'home' | 'lists' | 'archive' | 'settings';

const PROFILE_NAV: TabDefinition[] = [
  { key: 'home', label: '个人主页', description: '账户与收藏概览', href: '/profile', Icon: UserRound },
  { key: 'lists', label: '我的收藏', description: '观看状态、评分与自定义片单', href: '/profile/lists', Icon: FolderHeart },
  { key: 'settings', label: '设置', description: '外观、账户与数据源', href: '/profile/settings', Icon: Settings },
];

interface ProfileStats {
  listCount: number;
  wantCount: number;
  watchedCount: number;
  customCount: number;
}

interface HistoryItem {
  id: number;
  listId?: number;
  movieId: number;
  contentType: string;
  title: string;
  cover: string;
  year?: number;
  rating?: number;
  userRating?: number;
  note?: string;
  addedAt?: string;
  watchedAt?: string;
  action: string;
  listType: string;
  region?: string;
  genre?: string;
}

const contentTypeRoute: Record<string, string> = {
  movie: '/movie',
  drama: '/drama',
  variety: '/variety',
  anime: '/anime',
  short_drama: '/short',
};

const inputClassName = 'w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent';

function useDelayedLoading(loading: boolean, delay = 180) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShowLoading(false);
      return;
    }

    const timer = window.setTimeout(() => setShowLoading(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay, loading]);

  return showLoading;
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="grid place-items-center rounded-2xl border border-border bg-card px-5 py-12 text-center">
      <RefreshCw aria-hidden className="h-7 w-7 text-muted-foreground" />
      <p className="mt-3 text-sm text-secondary-foreground">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:border-accent/40 hover:text-accent">
        <RefreshCw aria-hidden className="h-4 w-4" />重新加载
      </button>
    </div>
  );
}

function FractionalReviewStars({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-px text-amber-500" aria-label={`${score.toFixed(1)} 分，${(score / 2).toFixed(2)} 星`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <span key={index} className="relative inline-flex h-3.5 w-3.5">
          <Star aria-hidden className="absolute inset-0 h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fractionalStarFill(score, index) * 100}%` }}>
            <Star aria-hidden className="h-3.5 w-3.5 max-w-none fill-current" strokeWidth={1.5} />
          </span>
        </span>
      ))}
    </span>
  );
}

function ListsTab({ onStatsChange }: { onStatsChange?: (stats: ProfileStats) => void }) {
  const { showToast } = useToast();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingList, setEditingList] = useState<UserList | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deletingList, setDeletingList] = useState<UserList | null>(null);
  const [deleting, setDeleting] = useState(false);
  const showLoading = useDelayedLoading(loading);

  const loadLists = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listApi.getAll({ signal });
      if (signal?.aborted) return;
      setLists(Array.isArray(response.data.data) ? response.data.data : []);
    } catch {
      if (!signal?.aborted) {
        setLoadError('片单加载失败，请检查网络后重试');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadLists(controller.signal);
    return () => controller.abort();
  }, [loadLists, reloadKey]);

  useEffect(() => {
    if (loading || loadError) return;
    const defaultLists = lists.filter((list) => list.isDefault === 1);
    onStatsChange?.({
      listCount: lists.length,
      wantCount: defaultLists.find((list) => list.type === 'want_to_watch' || list.name === '想看')?.itemCount || 0,
      watchedCount: defaultLists.find((list) => list.type === 'watched' || list.name === '看过')?.itemCount || 0,
      customCount: lists.filter((list) => list.isDefault !== 1).length,
    });
  }, [lists, loadError, loading, onStatsChange]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    if (name.length > 30) {
      showToast('片单名称不能超过 30 个字符', 'warning');
      return;
    }
    setCreating(true);
    try {
      await listApi.create({ name, description: newDesc.trim() || undefined });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      await loadLists();
      showToast('片单创建成功', 'success');
    } catch {
      showToast('创建失败，请稍后再试', 'error');
    } finally {
      setCreating(false);
    }
  };

  const openEditor = (list: UserList) => {
    setEditingList(list);
    setEditName(list.name);
    setEditDesc(list.description || '');
  };

  const handleUpdate = async () => {
    const name = editName.trim();
    if (!editingList || !name || updating) return;
    if (name.length > 30 || editDesc.trim().length > 200) {
      showToast('片单名称最多 30 字，描述最多 200 字', 'warning');
      return;
    }
    setUpdating(true);
    try {
      await listApi.update(editingList.id, { name, description: editDesc.trim() });
      setEditingList(null);
      await loadLists();
      showToast('片单已更新', 'success');
    } catch {
      showToast('片单更新失败，请重试', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingList || deleting) return;
    setDeleting(true);
    try {
      await listApi.remove(deletingList.id);
      setDeletingList(null);
      await loadLists();
      showToast('片单已删除', 'success');
    } catch {
      showToast('片单删除失败，请重试', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && lists.length === 0) {
    return <div className={`grid gap-3 transition-opacity duration-150 ${showLoading ? 'opacity-100' : 'opacity-0'}`} aria-busy="true" aria-label="正在加载片单">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }
  if (loadError && lists.length === 0) return <InlineError message={loadError} onRetry={() => setReloadKey((key) => key + 1)} />;

  const customLists = lists.filter((list) => list.isDefault !== 1);

  return (
    <div className="space-y-6" aria-busy={loading}>
      {loading && showLoading && <p className="text-xs text-muted-foreground" role="status">正在更新片单…</p>}
      <section aria-labelledby="collection-records-title">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 id="collection-records-title" className="text-base font-semibold text-foreground">观看记录</h2>
            <p className="mt-1 text-xs text-muted-foreground">看过、在看和想看统一在这里管理，不再维护两套列表样式。</p>
          </div>
        </div>
        <HistoryTab lists={lists} />
      </section>

      <section aria-labelledby="custom-lists-title">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="custom-lists-title" className="text-base font-semibold text-foreground">自定义片单</h2>
            <p className="mt-1 text-xs text-muted-foreground">为主题、档期或共同观看计划建立独立收藏。</p>
          </div>
          <button type="button" onClick={() => setShowCreate((open) => !open)} aria-expanded={showCreate} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium text-foreground hover:border-accent/40 hover:text-accent">
            <ListPlus aria-hidden className="h-4 w-4" />新建片单
          </button>
        </div>

        {showCreate && (
          <form className="mt-4 rounded-2xl border border-border bg-card p-4" onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}>
            <label htmlFor="new-list-name" className="text-sm font-medium text-foreground">片单名称</label>
            <input id="new-list-name" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={30} className={`mt-2 h-11 ${inputClassName}`} placeholder="例如：周末合家欢" />
            <label htmlFor="new-list-description" className="mt-4 block text-sm font-medium text-foreground">片单描述 <span className="font-normal text-muted-foreground">（可选）</span></label>
            <textarea id="new-list-description" value={newDesc} onChange={(event) => setNewDesc(event.target.value)} maxLength={200} rows={3} className={`mt-2 resize-y py-2.5 ${inputClassName}`} placeholder="说明这个片单的用途" />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowCreate(false)} disabled={creating} className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">取消</button>
              <button type="submit" disabled={creating || !newName.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
                {creating && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}{creating ? '创建中' : '创建片单'}
              </button>
            </div>
          </form>
        )}

        {customLists.length === 0 ? (
          <div className="mt-4 grid place-items-center rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <Inbox aria-hidden className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">还没有自定义片单</p>
            <p className="mt-1 text-xs text-muted-foreground">默认观看状态已足够使用，也可以按自己的主题继续整理。</p>
          </div>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {customLists.map((list) => (
              <article key={list.id} className="flex min-h-28 flex-col rounded-2xl border border-border bg-card transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-sm sm:flex-row">
                <Link href={`/user/lists/${list.id}`} prefetch={false} className="flex min-h-20 min-w-0 flex-1 items-start gap-3 p-3 no-underline">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent"><FolderHeart aria-hidden className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{list.name}</span>
                    <span className="mt-1 block line-clamp-1 text-xs leading-5 text-muted-foreground">{list.description || '为喜欢的内容留一处清晰的位置。'}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{list.itemCount} 部</span>
                  <ChevronRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
                <div className="flex items-center justify-end gap-1 px-3 pb-3 sm:flex-col sm:justify-center sm:border-l sm:border-border sm:py-3" aria-label={`${list.name}片单操作`}>
                  <button type="button" onClick={() => openEditor(list)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`编辑片单“${list.name}”`}><Pencil aria-hidden className="h-3.5 w-3.5" />编辑</button>
                  <button type="button" onClick={() => setDeletingList(list)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground hover:bg-red-500/10 hover:text-red-600" aria-label={`删除片单“${list.name}”`}><Trash2 aria-hidden className="h-3.5 w-3.5" />删除</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(editingList)}
        onClose={() => { if (!updating) setEditingList(null); }}
        title="编辑片单"
        description={editingList?.name}
        width="sm"
        footer={(
          <>
            <button type="button" onClick={() => setEditingList(null)} disabled={updating} className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">取消</button>
            <button type="button" onClick={() => void handleUpdate()} disabled={updating || !editName.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
              {updating && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}{updating ? '保存中' : '保存修改'}
            </button>
          </>
        )}
      >
        <form onSubmit={(event) => { event.preventDefault(); void handleUpdate(); }}>
          <label htmlFor="edit-list-name" className="text-sm font-medium text-foreground">片单名称</label>
          <input id="edit-list-name" value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={30} className={`mt-2 h-10 ${inputClassName}`} autoFocus />
          <label htmlFor="edit-list-description" className="mt-4 block text-sm font-medium text-foreground">片单描述 <span className="font-normal text-muted-foreground">（可选）</span></label>
          <textarea id="edit-list-description" value={editDesc} onChange={(event) => setEditDesc(event.target.value)} maxLength={200} rows={4} className={`mt-2 resize-y py-2.5 ${inputClassName}`} />
        </form>
      </Modal>

      <Dialog
        open={Boolean(deletingList)}
        onClose={() => { if (!deleting) setDeletingList(null); }}
        onConfirm={handleDelete}
        title="删除自定义片单"
        message={`确定删除“${deletingList?.name || ''}”及其中的收藏关系吗？内容本身不会被删除。`}
        confirmText="删除片单"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const route = contentTypeRoute[item.contentType] || '/movie';
  const posterUrl = usePosterUrl(item.contentType, item.movieId, item.cover);
  const region = parseRegion(item.region).join(' / ');
  const genres = parseJsonArr(item.genre);
  const statusTone = item.listType === 'watched' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : item.listType === 'watching' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-violet-500/10 text-violet-700 dark:text-violet-300';
  const [reviewMode, setReviewMode] = useState<'view' | 'edit' | null>(null);
  const userRating = item.userRating != null && Number(item.userRating) > 0 ? Number(item.userRating) : null;
  const hasReview = item.listType === 'watched';

  return (
    <article className="rounded-2xl border border-border bg-card p-3 transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-sm sm:p-4">
      <Link href={`${route}/${item.movieId}`} prefetch={false} className="flex gap-3 no-underline">
        <div className="relative h-24 w-[68px] shrink-0 overflow-hidden rounded-xl">
          <LazyImage src={posterUrl} alt={item.title || ''} className="rounded-xl" aspectRatio={null} fallbackSrc="/poster-placeholder.svg" rootMargin="100px" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-foreground">{cleanTitleUtil(item.title) || '未知标题'}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone}`}>{item.action}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <TypeBadge contentType={item.contentType} />
              {item.year && <span>{item.year}</span>}
              {region && <span className="break-words">{region}</span>}
              {item.rating != null && Number(item.rating) > 0 && <span className="font-semibold text-amber-700 dark:text-amber-400">{Number(item.rating).toFixed(1)} 分</span>}
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <GenreTags genres={genres} max={2} />
            <span className="shrink-0 text-[10px] text-muted-foreground">{item.listType === 'watched' ? formatWatchedAt(item.watchedAt || item.addedAt) : formatRelativeTime(item.addedAt || '')}</span>
          </div>
        </div>
      </Link>

      {hasReview && (
        <section className="mt-4 flex items-stretch gap-3 border-l-2 border-accent/35 pl-4" aria-label={`《${item.title}》的评价`}>
          <button type="button" onClick={() => setReviewMode('view')} className="min-h-11 min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-semibold text-foreground">我的记录</span>
              {userRating ? (
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                  <FractionalReviewStars score={userRating} />
                  {userRating.toFixed(1)} 分
                </span>
              ) : (
                <span className="text-muted-foreground">暂未评分</span>
              )}
              <span className="text-muted-foreground">看过 · {formatWatchedAt(item.watchedAt || item.addedAt)}</span>
            </div>
            <p className="mt-1 line-clamp-3 text-sm leading-6 text-secondary-foreground">{item.note || '暂未记录观后感，点击查看或补充评价。'}</p>
          </button>
          <button type="button" onClick={() => setReviewMode('edit')} className="min-h-11 shrink-0 self-center rounded-lg px-3 text-xs font-semibold text-accent hover:bg-accent/10 hover:text-accent-hover" aria-label={`编辑《${item.title}》的评价`}>编辑</button>
        </section>
      )}

      {reviewMode && (
        <WatchedModal
          open
          onClose={() => setReviewMode(null)}
          movieId={item.movieId}
          contentType={item.contentType}
          movieTitle={item.title}
          watchedListId={item.listId}
          initialRating={userRating || undefined}
          initialNote={item.note}
          initialWatchedAt={item.watchedAt || item.addedAt}
          isExisting
          isReadOnly={reviewMode === 'view'}
          onEdit={() => setReviewMode('edit')}
        />
      )}
    </article>
  );
}

function HistoryTab({ lists: providedLists }: { lists?: UserList[] } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const archiveQuery = parseProfileArchiveQuery({
    status: searchParams.get('status'),
    type: searchParams.get('type'),
    page: searchParams.get('page'),
    sort: searchParams.get('sort'),
  });
  const activeFilter = archiveQuery.status;
  const contentType = archiveQuery.type;
  const sort = archiveQuery.sort;
  const page = archiveQuery.page;
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const showLoading = useDelayedLoading(loading);
  const statusRevision = useContentStatusStore((state) => state.revision);

  const navigate = (updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    const listsRequest = providedLists
      ? Promise.resolve(providedLists)
      : listApi.getAll({ signal: controller.signal }).then((response) => Array.isArray(response.data.data) ? response.data.data : []);
    void listsRequest.then(async (allLists) => {
      const list = allLists.find((candidate) => candidate.isDefault === 1 && candidate.type === activeFilter);
      if (!list) {
        setItems([]);
        setTotalPages(1);
        return;
      }
      const itemResponse = await listApi.getItems(list.id, {
        page,
        size: 20,
        sort,
        sortDir: 'desc',
        contentType: contentType || undefined,
      }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const resultPage = itemResponse.data.data as { records?: HistoryItem[]; total?: number; size?: number } | undefined;
      const records = Array.isArray(resultPage?.records) ? resultPage.records : [];
      const action = activeFilter === 'want_to_watch' ? '想看' : activeFilter === 'watching' ? '在看' : '看过';
      setItems(records.map((item) => ({ ...item, listId: list.id, action, listType: activeFilter })));
      const total = Number(resultPage?.total || 0);
      const size = Number(resultPage?.size || 20);
      setTotalPages(Math.max(1, Math.ceil(total / size)));
    }).catch(() => {
      if (!controller.signal.aborted) {
        setLoadError('影视档案加载失败，请检查网络后重试');
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [activeFilter, contentType, page, providedLists, reloadKey, sort, statusRevision]);

  const filters = [
    { key: 'watched', label: '看过' },
    { key: 'watching', label: '在看' },
    { key: 'want_to_watch', label: '想看' },
  ];

  if (loading && items.length === 0) return <div className={`space-y-3 transition-opacity duration-150 ${showLoading ? 'opacity-100' : 'opacity-0'}`} aria-busy="true" aria-label="正在加载影视档案">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted" />)}</div>;
  if (loadError && items.length === 0) return <InlineError message={loadError} onRetry={() => setReloadKey((key) => key + 1)} />;

  return (
    <div className="space-y-4" aria-busy={loading}>
      {loading && showLoading && <p className="text-xs text-muted-foreground" role="status">正在更新影视档案…</p>}
      {loadError && items.length > 0 && <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-secondary-foreground" role="status">影视档案更新失败，仍显示上一次成功读取的内容。</p>}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="filter-scroll-row" role="group" aria-label="档案状态筛选">
          {filters.map((filter) => (
            <button key={filter.key} type="button" onClick={() => navigate({ status: filter.key === 'watched' ? null : filter.key, page: 1 })} aria-pressed={activeFilter === filter.key} className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors sm:min-h-9 ${activeFilter === filter.key ? 'border-accent bg-accent text-white' : 'border-border bg-card text-secondary-foreground hover:border-accent/30'}`}>{filter.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <CustomSelect ariaLabel="档案内容类型" value={contentType || 'all'} options={[{ label: '全部类型', value: 'all' }, { label: '电影', value: 'movie' }, { label: '剧集', value: 'drama' }, { label: '综艺', value: 'variety' }, { label: '动漫', value: 'anime' }, { label: '短剧', value: 'short_drama' }]} onChange={(value) => navigate({ type: value === 'all' ? null : value, page: 1 })} />
          <CustomSelect ariaLabel="档案排序" value={sort} options={activeFilter === 'watched' ? [{ label: '最近记录', value: 'addedAt' }, { label: '我的评分', value: 'userRating' }, { label: '上映年份', value: 'year' }, { label: '豆瓣评分', value: 'douban' }] : [{ label: '最近加入', value: 'addedAt' }, { label: '上映年份', value: 'year' }, { label: '豆瓣评分', value: 'douban' }]} onChange={(value) => navigate({ sort: value === 'addedAt' ? null : value, page: 1 })} />
        </div>
      </div>
      {items.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <Clock3 aria-hidden className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">该状态下暂无档案</p>
          <p className="mt-1 text-xs text-muted-foreground">浏览内容并加入片单后，记录会出现在这里。</p>
        </div>
      ) : (
        <div className="grid gap-3">{items.map((item) => <HistoryRow key={`${item.listType}-${item.id}`} item={item} />)}</div>
      )}
      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={(nextPage) => navigate({ page: nextPage })} />}
    </div>
  );
}

const THEME_OPTIONS = [
  { key: 'light', label: '浅色', description: '明亮暖中性色', Icon: Sun },
  { key: 'dark', label: '深色', description: '炭黑沉浸观影', Icon: Moon },
  { key: 'system', label: '跟随系统', description: '自动切换', Icon: Monitor },
] as const;

function SettingsTab() {
  const { user, logout } = useUserStore();
  const router = useRouter();
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  useEffect(() => setThemeMounted(true), []);

  const clearSearchHistory = () => {
    try {
      localStorage.removeItem('search_history');
      showToast('搜索历史已清除', 'success');
    } catch {
      showToast('搜索历史清除失败', 'error');
    }
  };

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-2">
      <section className="border-b border-border p-5 md:border-r">
        <div className="flex items-center gap-2"><Info aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">账户信息</h2></div>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">用户名</dt><dd className="truncate font-medium text-foreground">{user?.username || '—'}</dd></div>
          {user?.nickname && <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">昵称</dt><dd className="truncate font-medium text-foreground">{user.nickname}</dd></div>}
          {user?.email && <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">邮箱</dt><dd className="truncate font-medium text-foreground">{user.email}</dd></div>}
        </dl>
      </section>

      <section className="border-b border-border p-5">
        <div className="flex items-center gap-2"><Palette aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">显示外观</h2></div>
        <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="主题模式">
          {THEME_OPTIONS.map((option) => {
            const active = themeMounted && theme === option.key;
            return (
              <button key={option.key} type="button" role="radio" aria-checked={active} onClick={() => setTheme(option.key)} className={`grid min-h-24 place-items-center rounded-xl border p-2 text-center transition-[border-color,background-color] ${active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-secondary-foreground hover:border-accent/30'}`}>
                <option.Icon aria-hidden className="h-5 w-5" />
                <span className="text-xs font-semibold">{option.label}</span>
                <span className="hidden text-[10px] text-muted-foreground sm:block">{option.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="order-5 border-t border-border p-5 md:col-span-2">
        <div className="mb-4">
          <p className="text-xs font-semibold text-accent">高级设置</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">海报与数据源</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">只有需要替换来源站海报时才需要配置；所有失败都会保留原图。</p>
        </div>
        <PosterSettingsCard />
      </div>

      <section className="order-3 border-b border-border p-5 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2"><SearchX aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">本地数据</h2></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">搜索历史仅保存在当前浏览器，清除不会影响片单或账户数据。</p>
        <button type="button" onClick={clearSearchHistory} className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:border-accent/40 hover:text-accent">清除搜索历史</button>
      </section>

      <section className="order-4 border-b border-border p-5 md:border-b-0">
        <div className="flex items-center gap-2"><Info aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">项目信息</h2></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">查看影视森林的数据来源、TMDB 署名与项目说明。</p>
        <Link href="/about" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground no-underline hover:border-accent/40 hover:text-accent">查看项目说明<ChevronRight aria-hidden className="h-4 w-4" /></Link>
      </section>

      <div className="order-6 border-t border-border p-5 md:col-span-2">
      <button type="button" onClick={() => { logout(); router.replace('/'); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/40 px-5 text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-400">
        <LogOut aria-hidden className="h-4 w-4" />退出登录
      </button>
      </div>
    </div>
  );
}

function ProfileOverview({ stats }: { stats: ProfileStats | null }) {
  const entries = PROFILE_NAV.filter((item) => item.key !== 'home');

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)]">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
      {entries.map((entry) => (
        <Link
          key={entry.key}
          href={entry.href}
          className="group flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card p-4 no-underline transition-[border-color,box-shadow] hover:border-accent/35 hover:shadow-sm"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <entry.Icon aria-hidden className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-base font-semibold text-foreground">{entry.label}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{entry.description}</span>
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
          </span>
        </Link>
      ))}
      </div>
      <section className="rounded-2xl border border-border bg-card p-4" aria-labelledby="profile-summary-title">
        <h2 id="profile-summary-title" className="text-sm font-semibold text-foreground">收藏概览</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {[
            { label: '全部片单', value: stats?.listCount },
            { label: '想看', value: stats?.wantCount },
            { label: '看过', value: stats?.watchedCount },
            { label: '自定义片单', value: stats?.customCount },
          ].map((stat) => (
            <div key={stat.label} className="border-t border-border pt-2">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-foreground">{stat.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export default function ProfileClient({ view = 'home' }: { view?: ProfileView }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUserStore();
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    if (!hasStoredToken()) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (view !== 'home') return;
    const controller = new AbortController();
    void listApi.getAll({ signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      const lists = Array.isArray(response.data.data) ? response.data.data : [];
      const defaults = lists.filter((list) => list.isDefault === 1);
      setStats({
        listCount: lists.length,
        wantCount: defaults.find((list) => list.type === 'want_to_watch' || list.name === '想看')?.itemCount || 0,
        watchedCount: defaults.find((list) => list.type === 'watched' || list.name === '看过')?.itemCount || 0,
        customCount: lists.filter((list) => list.isDefault !== 1).length,
      });
    }).catch(() => undefined);
    return () => controller.abort();
  }, [pathname, router, view]);

  if (!hasStoredToken()) return null;

  const current = PROFILE_NAV.find((item) => item.key === view) || PROFILE_NAV[0];

  return (
    <div className="w-full space-y-5">
      <header className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between" aria-label="个人信息与页面导航">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar
            name={user?.nickname || user?.username}
            src={user?.avatar || user?.avatarUrl}
            size="lg"
            className="shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{user?.nickname || user?.username || '影视森林用户'}</p>
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{user?.username ? `@${user.username}` : '个人收藏'}</span><span aria-hidden>·</span><span>{current.label}</span>
            </div>
          </div>
        </div>
        <nav className="filter-scroll-row rounded-xl bg-card p-1" aria-label="个人中心">
          {PROFILE_NAV.map((item) => (
            <Link key={item.key} href={item.href} aria-current={view === item.key ? 'page' : undefined} className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium no-underline transition-colors ${view === item.key ? 'bg-accent text-white shadow-sm' : 'text-secondary-foreground hover:bg-muted'}`}>
              <item.Icon aria-hidden className="h-4 w-4" />{item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{current.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>
      </div>

      {view === 'home' && <ProfileOverview stats={stats} />}
      {view === 'lists' && <ListsTab onStatsChange={setStats} />}
      {view === 'archive' && <HistoryTab />}
      {view === 'settings' && <SettingsTab />}
    </div>
  );
}
