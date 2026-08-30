'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Check,
  ChevronRight,
  Edit3,
  FolderHeart,
  Inbox,
  ListPlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { listApi, type UserList, type UserListItem } from '@/lib/userApi';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '@/components/Toast';
import { cleanTitle as cleanTitleUtil, formatRelativeTime, parseRegion } from '@/lib/utils';
import { parseJsonArr } from '@/lib/contentConstants';
import { formatWatchedAt } from '@/lib/uiContracts';
import { GenreTags, MediaHorizontalCard, RatingBadge, TypeBadge } from '@/components/ContentShared';
import LazyImage from '@/components/ui/lazy-image';
import { usePosterUrl } from '@/hooks/usePosterUrl';
import { useContentStatusStore } from '@/stores/contentStatusStore';
import { Modal } from '@/components/ui/modal';
import Dialog from '@/components/Dialog';
import NoteEditModal from '@/components/NoteEditModal';
import Pagination from '@/components/Pagination';
import CustomSelect from '@/components/CustomSelect';

const PAGE_SIZE = 20;

const contentTypeRoute: Record<string, string> = {
  movie: '/movie',
  drama: '/drama',
  variety: '/variety',
  anime: '/anime',
  short_drama: '/short',
};

const TYPE_FILTERS = [
  { label: '全部', value: '' },
  { label: '电影', value: 'movie' },
  { label: '剧集', value: 'drama' },
  { label: '综艺', value: 'variety' },
  { label: '动漫', value: 'anime' },
  { label: '短剧', value: 'short_drama' },
];

const SORT_OPTIONS = [
  { label: '最近加入', value: 'addedAt' },
  { label: '上映年份', value: 'year' },
  { label: '豆瓣评分', value: 'douban' },
  { label: '我的评分', value: 'userRating' },
];

const DEFAULT_STATUS_ORDER = ['want_to_watch', 'watching', 'watched'];

function statusLabel(type: string) {
  if (type === 'want_to_watch') return '想看';
  if (type === 'watching') return '在看';
  if (type === 'watched') return '看过';
  return '片单';
}

function activityLabel(type: string) {
  if (type === 'want_to_watch') return '加入想看';
  if (type === 'watching') return '开始观看';
  if (type === 'watched') return '标记看过';
  return '加入片单';
}

function listKind(list: UserList) {
  return list.isDefault === 1 ? statusLabel(list.type) : '自定义片单';
}

function parseListId(value: string | null) {
  if (!value) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function CollectionItemCard({
  item,
  list,
  batchMode,
  selected,
  onToggle,
  onEdit,
  onRemove,
}: {
  item: UserListItem;
  list: UserList;
  batchMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onEdit: (readOnly: boolean) => void;
  onRemove: () => void;
}) {
  const route = contentTypeRoute[item.contentType] || '/movie';
  const href = `${route}/${item.movieId}`;
  const posterUrl = usePosterUrl(item.contentType, item.movieId, item.cover);
  const title = cleanTitleUtil(item.title) || '未知标题';
  const regions = parseRegion(item.region);
  const genres = parseJsonArr(item.genre);
  const directors = parseJsonArr(item.director);
  const watched = list.type === 'watched';
  const hasRating = watched && item.userRating != null && Number(item.userRating) > 0;
  const hasNote = Boolean(item.note?.trim());
  const dateLabel = watched
    ? formatWatchedAt(item.watchedAt || item.addedAt)
    : formatRelativeTime(item.addedAt || '');

  return (
    <MediaHorizontalCard
      className={`group relative min-h-[12.25rem] transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 ${selected ? 'border-accent ring-2 ring-accent/20' : ''}`}
      poster={(
        <div className={batchMode ? 'pointer-events-none opacity-70' : ''}>
          <Link href={href} prefetch={false} className="relative block aspect-[2/3] w-full overflow-hidden rounded-xl" aria-label={`查看《${title}》详情`}>
            <LazyImage src={posterUrl} alt={title} className="h-full rounded-xl" aspectRatio={null} fallbackSrc="/poster-placeholder.svg" rootMargin="160px" />
            {item.rating != null && Number(item.rating) > 0 && (
              <span className="absolute bottom-1 left-1">
                <RatingBadge score={Number(item.rating)} />
              </span>
            )}
          </Link>
        </div>
      )}
      actions={!batchMode && (
        <Link href={href} prefetch={false} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-accent no-underline hover:bg-accent/10" aria-label={`查看《${title}》详情`}>
          查看详情<ChevronRight aria-hidden className="size-4" />
        </Link>
      )}
      footer={!batchMode && (
        <section className="flex min-w-0 items-center gap-2" aria-label={`《${title}》的收藏记录`}>
          <button type="button" onClick={() => onEdit(true)} className="min-w-0 flex-1 truncate text-left text-xs text-secondary-foreground hover:text-accent">
            <span className="font-semibold text-foreground">{hasRating || hasNote ? '我的记录' : '备注与评价'}</span>
            <span className="ml-2 truncate text-muted-foreground">{hasRating ? `${Number(item.userRating).toFixed(1)} 分` : hasNote ? item.note : '点击添加记录'}</span>
          </button>
          <button type="button" onClick={() => onEdit(false)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted hover:text-accent" aria-label={`${watched ? '评价' : '备注'}《${title}》`} title={watched ? '评价' : '备注'}>
            <Edit3 aria-hidden className="size-4" />
          </button>
          <button type="button" onClick={onRemove} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-500/10 dark:text-red-400" aria-label={`移除《${title}》`} title="移除">
            <Trash2 aria-hidden className="size-4" />
          </button>
        </section>
      )}
    >
      {batchMode && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={`${selected ? '取消选择' : '选择'}《${title}》`}
          className="absolute inset-0 z-20 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          <span className={`absolute left-3 top-3 grid size-7 place-items-center rounded-lg border-2 shadow-sm ${selected ? 'border-accent bg-accent text-white' : 'border-border bg-card text-transparent'}`}>
            <Check aria-hidden className="h-4 w-4" />
          </span>
        </button>
      )}

      <div className={`flex min-h-full min-w-0 flex-col ${batchMode ? 'pointer-events-none opacity-70' : ''}`}>
          <div className="flex min-w-0 items-start justify-between gap-2">
            <Link href={href} prefetch={false} className="min-w-0 truncate text-sm font-bold leading-5 text-foreground no-underline hover:text-accent" title={title}>{title}</Link>
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <TypeBadge contentType={item.contentType} size="xs" />
            {item.year && <span>{item.year}</span>}
            {regions.length > 0 && <span className="min-w-0 truncate" title={regions.join(' / ')}>{regions.join(' / ')}</span>}
            {item.duration && <span>{item.duration} 分钟</span>}
            {item.totalEpisode && <span>{item.totalEpisode} 集</span>}
          </div>
          <div className="mt-2 min-w-0"><GenreTags genres={genres} max={2} /></div>
          {directors.length > 0 && <p className="mt-1.5 min-w-0 truncate text-[11px] text-muted-foreground" title={directors.join(' / ')}>导演：{directors.join(' / ')}</p>}

          <div className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-2">
            <span className="min-w-0 truncate text-[10px] text-muted-foreground">{dateLabel} · {activityLabel(list.type)}</span>
          </div>
      </div>
    </MediaHorizontalCard>
  );
}

function EmptyCollection({ filtered }: { filtered: boolean }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center">
      <Inbox aria-hidden className="size-9 text-muted-foreground" />
      <p className="mt-3 text-sm font-semibold text-foreground">{filtered ? '该筛选下暂无内容' : '片单还是空的'}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{filtered ? '切换内容类型或清除筛选，看看其他收藏。' : '浏览影视详情并加入片单后，会显示在这里。'}</p>
      {!filtered && <Link href="/category" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white no-underline hover:bg-accent-hover">浏览内容分类</Link>}
    </div>
  );
}

export default function CollectionWorkspace({
  onStatsChange,
}: {
  onStatsChange?: (stats: { listCount: number; wantCount: number; watchedCount: number; customCount: number }) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userId = useUserStore((state) => state.user?.id ?? null);
  const { showToast } = useToast();
  const invalidateStatus = useContentStatusStore((state) => state.invalidateStatus);
  const [lists, setLists] = useState<UserList[]>([]);
  const [items, setItems] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingList, setEditingList] = useState<UserList | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deletingList, setDeletingList] = useState<UserList | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<UserListItem | null>(null);
  const [noteEdit, setNoteEdit] = useState<UserListItem | null>(null);
  const [noteReadOnly, setNoteReadOnly] = useState(false);

  const requestedListId = parseListId(searchParams.get('listId'));
  const legacyStatus = searchParams.get('status');
  const activeList = useMemo(() => {
    if (requestedListId) {
      const requested = lists.find((list) => list.id === requestedListId);
      if (requested) return requested;
    }
    if (legacyStatus) {
      const byStatus = lists.find((list) => list.type === legacyStatus && list.isDefault === 1);
      if (byStatus) return byStatus;
    }
    return DEFAULT_STATUS_ORDER.map((type) => lists.find((list) => list.type === type && list.isDefault === 1)).find(Boolean)
      || lists[0]
      || null;
  }, [legacyStatus, lists, requestedListId]);

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const typeFilter = TYPE_FILTERS.some((type) => type.value === (searchParams.get('type') || '')) ? (searchParams.get('type') || '') : '';
  const requestedSort = SORT_OPTIONS.some((option) => option.value === searchParams.get('sort')) ? (searchParams.get('sort') || 'addedAt') : 'addedAt';
  const watched = activeList?.type === 'watched';
  const sort = !watched && requestedSort === 'userRating' ? 'addedAt' : requestedSort;
  const sortOptions = watched ? SORT_OPTIONS : SORT_OPTIONS.filter((option) => option.value !== 'userRating');

  const navigate = useCallback((updates: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const loadLists = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await listApi.getAll({ signal });
      if (signal?.aborted) return;
      const nextLists = Array.isArray(response.data.data) ? response.data.data : [];
      setLists(nextLists);
      const defaults = nextLists.filter((list) => list.isDefault === 1);
      onStatsChange?.({
        listCount: nextLists.length,
        wantCount: defaults.find((list) => list.type === 'want_to_watch')?.itemCount || 0,
        watchedCount: defaults.find((list) => list.type === 'watched')?.itemCount || 0,
        customCount: nextLists.filter((list) => list.isDefault !== 1).length,
      });
    } catch {
      if (!signal?.aborted) setError('片单加载失败，请检查网络后重试');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [onStatsChange]);

  useEffect(() => {
    const controller = new AbortController();
    void loadLists(controller.signal);
    return () => controller.abort();
  }, [loadLists, reloadKey]);

  useEffect(() => {
    if (!activeList) {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }
    const controller = new AbortController();
    setItemsLoading(true);
    setItemsError(null);
    setSelectedIds(new Set());
    void listApi.getItems(activeList.id, {
      page,
      size: PAGE_SIZE,
      sort: watched && sort === 'userRating' ? sort : sort === 'userRating' ? 'addedAt' : sort,
      sortDir: 'desc',
      contentType: typeFilter || undefined,
    }, { signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      const result = response.data.data;
      const records = Array.isArray(result?.records) ? result.records : [];
      const nextTotal = typeof result?.total === 'number' ? result.total : Number(result?.total || 0);
      const size = typeof result?.size === 'number' && result.size > 0 ? result.size : PAGE_SIZE;
      setItems(records);
      setTotal(nextTotal);
      setTotalPages(Math.max(1, Math.ceil(nextTotal / size)));
    }).catch(() => {
      if (!controller.signal.aborted) {
        setItems([]);
        setItemsError('片单内容加载失败，请检查网络后重试');
      }
    }).finally(() => {
      if (!controller.signal.aborted) setItemsLoading(false);
    });
    return () => controller.abort();
  }, [activeList, page, reloadKey, sort, typeFilter, watched]);

  const selectList = (list: UserList) => {
    setBatchMode(false);
    navigate({ listId: list.id, status: null, page: null, type: null, sort: null });
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    if (name.length > 30 || newDescription.trim().length > 200) {
      showToast('片单名称最多 30 字，描述最多 200 字', 'warning');
      return;
    }
    setCreating(true);
    try {
      const response = await listApi.create({ name, description: newDescription.trim() || undefined });
      const created = response.data.data;
      setNewName('');
      setNewDescription('');
      setCreateOpen(false);
      await loadLists();
      if (created && typeof created === 'object' && 'id' in created) {
        navigate({ listId: Number((created as UserList).id), status: null, page: null, type: null, sort: null });
      }
      showToast('片单创建成功', 'success');
    } catch {
      showToast('片单创建失败，请重试', 'error');
    } finally {
      setCreating(false);
    }
  };

  const openEditor = (list: UserList) => {
    setEditingList(list);
    setEditName(list.name);
    setEditDescription(list.description || '');
  };

  const handleUpdate = async () => {
    const name = editName.trim();
    if (!editingList || !name || updating) return;
    if (name.length > 30 || editDescription.trim().length > 200) {
      showToast('片单名称最多 30 字，描述最多 200 字', 'warning');
      return;
    }
    setUpdating(true);
    try {
      await listApi.update(editingList.id, { name, description: editDescription.trim() });
      setEditingList(null);
      await loadLists();
      showToast('片单已更新', 'success');
    } catch {
      showToast('片单更新失败，请重试', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteList = async () => {
    if (!deletingList || deleting) return;
    setDeleting(true);
    try {
      await listApi.remove(deletingList.id);
      setDeletingList(null);
      await loadLists();
      navigate({ listId: null, page: null, type: null, sort: null });
      showToast('片单已删除', 'success');
    } catch {
      showToast('片单删除失败，请重试', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemove = async () => {
    if (!activeList || !confirmDelete) return;
    try {
      await listApi.removeItem(activeList.id, { movieId: confirmDelete.movieId, contentType: confirmDelete.contentType });
      if (userId) invalidateStatus(`user:${userId}`, confirmDelete.contentType, confirmDelete.movieId);
      setConfirmDelete(null);
      showToast('已从片单移除', 'info');
      setReloadKey((key) => key + 1);
    } catch {
      showToast('移除失败，请稍后再试', 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (!activeList || selectedIds.size === 0 || batchDeleting) return;
    setBatchDeleting(true);
    try {
      const selectedItems = items.filter((item) => selectedIds.has(item.id));
      await listApi.batchRemoveItems(activeList.id, selectedItems.map((item) => ({ movieId: item.movieId, contentType: item.contentType })));
      if (userId) selectedItems.forEach((item) => invalidateStatus(`user:${userId}`, item.contentType, item.movieId));
      setSelectedIds(new Set());
      setBatchMode(false);
      showToast(`已移除 ${selectedItems.length} 部内容`, 'success');
      setReloadKey((key) => key + 1);
    } catch {
      showToast('批量移除失败，请稍后再试', 'error');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleNoteSave = async (note: string, rating?: number) => {
    if (!activeList || !noteEdit) return;
    await listApi.updateItem(activeList.id, {
      movieId: noteEdit.movieId,
      contentType: noteEdit.contentType,
      note: note || undefined,
      rating,
    });
    setItems((current) => current.map((item) => item.id === noteEdit.id ? { ...item, note: note || undefined, userRating: rating } : item));
    setNoteEdit((current) => current ? { ...current, note: note || undefined, userRating: rating } : null);
    setNoteReadOnly(true);
    if (userId) invalidateStatus(`user:${userId}`, noteEdit.contentType, noteEdit.movieId);
    showToast('备注与评价已更新', 'success');
  };

  if (loading && lists.length === 0) {
    return <div className="space-y-4" aria-busy="true" aria-label="正在加载片单"><div className="h-16 animate-pulse rounded-2xl bg-muted" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-muted" />)}</div></div>;
  }

  if (error && lists.length === 0) {
    return <div role="alert" className="grid place-items-center rounded-2xl border border-border bg-card px-5 py-16 text-center"><RefreshCw aria-hidden className="size-8 text-muted-foreground" /><p className="mt-3 text-sm text-secondary-foreground">{error}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"><RefreshCw aria-hidden className="size-4" />重新加载</button></div>;
  }

  const allCurrentPageSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className="space-y-5" aria-busy={itemsLoading}>
      <section className="rounded-2xl border border-border bg-card/75 p-3 sm:p-4" aria-labelledby="collection-workspace-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><FolderHeart aria-hidden className="size-5 text-accent" /><h2 id="collection-workspace-title" className="text-base font-semibold text-foreground">收藏工作区</h2></div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">默认状态与自定义片单使用同一套内容卡片、筛选和操作。</p>
          </div>
          <button type="button" onClick={() => setCreateOpen((open) => !open)} aria-expanded={createOpen} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"><Plus aria-hidden className="size-4" />新建片单</button>
        </div>

        <div className="mt-4 overflow-x-auto border-t border-border pt-3" role="tablist" aria-label="收藏片单">
          <div className="flex min-w-max items-center gap-1">
            {lists.map((list) => {
              const active = activeList?.id === list.id;
              return <button key={list.id} type="button" role="tab" aria-selected={active} onClick={() => selectList(list)} className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors ${active ? 'bg-accent text-white shadow-sm' : 'text-secondary-foreground hover:bg-muted'}`}><span className="max-w-32 truncate">{list.name}</span><span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>{list.itemCount}</span></button>;
            })}
          </div>
        </div>
      </section>

      {createOpen && (
        <form className="rounded-2xl border border-border bg-card p-4" onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}>
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-foreground">新建自定义片单</h3><p className="mt-1 text-xs text-muted-foreground">把主题、档期或共同观看计划放在一个清晰的位置。</p></div><ListPlus aria-hidden className="size-5 text-accent" /></div>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <label className="text-sm font-medium text-foreground">片单名称<input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={30} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent" placeholder="例如：周末合家欢" /></label>
            <label className="text-sm font-medium text-foreground">描述 <span className="font-normal text-muted-foreground">（可选）</span><textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} maxLength={200} rows={2} className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent" placeholder="说明这个片单的用途" /></label>
          </div>
          <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} disabled={creating} className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">取消</button><button type="submit" disabled={creating || !newName.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50">{creating && <Loader2 aria-hidden className="size-4 animate-spin" />}{creating ? '创建中' : '创建片单'}</button></div>
        </form>
      )}

      {activeList && (
        <section aria-labelledby="active-collection-title">
          <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 id="active-collection-title" className="truncate text-xl font-bold tracking-tight text-foreground">{activeList.name}</h3><span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">{listKind(activeList)}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{activeList.description || `${total} 部内容 · 可按类型、年份与评分整理`}</p></div>
            <div className="flex shrink-0 items-center gap-2"><span className="text-xs tabular-nums text-muted-foreground">{total} 部</span>{activeList.isDefault !== 1 && <><button type="button" onClick={() => openEditor(activeList)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:border-accent/40 hover:text-accent"><Pencil aria-hidden className="size-3.5" />编辑</button><button type="button" onClick={() => setDeletingList(activeList)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-red-600 hover:border-red-500/40 hover:bg-red-500/10 dark:text-red-400"><Trash2 aria-hidden className="size-3.5" />删除</button></>}</div>
          </div>

          <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-border bg-card/70 p-2.5 lg:flex-row lg:items-center lg:justify-between" aria-label="片单筛选与排序">
            <div className="filter-scroll-row min-w-0" role="group" aria-label="内容类型">{TYPE_FILTERS.map((type) => <button key={type.value} type="button" aria-pressed={typeFilter === type.value} onClick={() => navigate({ type: type.value || null, page: null })} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${typeFilter === type.value ? 'border-accent bg-accent text-white' : 'border-border bg-card text-secondary-foreground hover:border-accent/30'}`}>{type.label}</button>)}</div>
            <div className="flex shrink-0 items-center justify-between gap-2"><div>{batchMode && <button type="button" onClick={() => setSelectedIds(allCurrentPageSelected ? new Set() : new Set(items.map((item) => item.id)))} className="min-h-9 rounded-lg border border-border px-3 text-xs font-medium text-foreground">{allCurrentPageSelected ? '取消全选' : '全选本页'}</button>}</div><div className="flex items-center gap-2"><CustomSelect ariaLabel="片单排序方式" value={sort} options={sortOptions} onChange={(value) => navigate({ sort: value === 'addedAt' ? null : value, page: null })} /><button type="button" onClick={() => { setBatchMode((enabled) => !enabled); setSelectedIds(new Set()); }} className={`min-h-9 rounded-lg border px-3 text-xs font-medium ${batchMode ? 'border-accent bg-accent/10 text-accent' : 'border-border text-secondary-foreground'}`}>{batchMode ? '退出批量' : '批量管理'}</button></div></div>
          </div>

          {itemsError ? <div role="alert" className="mt-4 grid place-items-center rounded-2xl border border-border bg-card px-5 py-14 text-center"><p className="text-sm text-secondary-foreground">{itemsError}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-4 min-h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-white">重新加载</button></div> : itemsLoading ? <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="正在加载片单内容">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-muted" />)}</div> : items.length === 0 ? <div className="mt-4"><EmptyCollection filtered={Boolean(typeFilter)} /></div> : <><div className="mt-4 grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <CollectionItemCard key={item.id} item={item} list={activeList} batchMode={batchMode} selected={selectedIds.has(item.id)} onToggle={() => setSelectedIds((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} onEdit={(readOnly) => { setNoteEdit(item); setNoteReadOnly(readOnly); }} onRemove={() => setConfirmDelete(item)} />)}</div>{totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={(nextPage) => navigate({ page: nextPage === 1 ? null : nextPage })} />}</>}
        </section>
      )}

      {batchMode && selectedIds.size > 0 && <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur md:bottom-4"><span className="text-sm font-medium text-foreground">本页已选 {selectedIds.size} 项</span><button type="button" onClick={() => void handleBatchDelete()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700" disabled={batchDeleting}>{batchDeleting && <Loader2 aria-hidden className="size-4 animate-spin" />}<Trash2 aria-hidden className="size-4" />批量移除</button></div>}

      {confirmDelete && <Dialog open onClose={() => setConfirmDelete(null)} onConfirm={() => void handleRemove()} title="确认移除" message={`确定要将《${confirmDelete.title || ''}》从片单中移除吗？`} confirmText="确认移除" variant="danger" />}
      {editingList && <Modal open onClose={() => { if (!updating) setEditingList(null); }} title="编辑片单" description={editingList.name} width="sm" footer={<><button type="button" onClick={() => setEditingList(null)} disabled={updating} className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">取消</button><button type="button" onClick={() => void handleUpdate()} disabled={updating || !editName.trim()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50">{updating && <Loader2 aria-hidden className="size-4 animate-spin" />}{updating ? '保存中' : '保存修改'}</button></>}><label className="text-sm font-medium text-foreground">片单名称<input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={30} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent" autoFocus /></label><label className="mt-4 block text-sm font-medium text-foreground">片单描述<textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={200} rows={4} className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent" /></label></Modal>}
      {deletingList && <Dialog open onClose={() => { if (!deleting) setDeletingList(null); }} onConfirm={() => void handleDeleteList()} title="删除自定义片单" message={`确定删除“${deletingList.name}”及其中的收藏关系吗？内容本身不会被删除。`} confirmText="删除片单" variant="danger" loading={deleting} />}
      {noteEdit && <NoteEditModal open onClose={() => { setNoteEdit(null); setNoteReadOnly(false); }} onSave={handleNoteSave} initialNote={noteEdit.note || ''} initialRating={noteEdit.userRating} isWatchedList={watched} movieTitle={noteEdit.title || ''} isReadOnly={noteReadOnly} onEdit={() => setNoteReadOnly(false)} />}
    </div>
  );
}
