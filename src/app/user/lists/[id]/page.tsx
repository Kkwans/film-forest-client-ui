'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Check, ChevronRight, Edit3, Inbox, ListChecks, Star, Trash2 } from 'lucide-react';
import { hasStoredToken } from '@/stores/userStore';
import { listApi, type UserList, type UserListItem } from '@/lib/userApi';
import { useToast } from '@/components/Toast';
import Pagination from '@/components/Pagination';
import CustomSelect from '@/components/CustomSelect';
import { cleanTitle as cleanTitleUtil, formatRelativeTime, parseRegion } from '@/lib/utils';
import { parseJsonArr } from '@/lib/contentConstants';
import { formatWatchedAt } from '@/lib/uiContracts';
import { TypeBadge, GenreTags } from '@/components/ContentShared';
import LazyImage from '@/components/ui/lazy-image';
import { usePosterUrl } from '@/hooks/usePosterUrl';

const NoteEditModal = dynamic(() => import('@/components/NoteEditModal'), { ssr: false });
const Dialog = dynamic(() => import('@/components/Dialog'), { ssr: false });

const PAGE_SIZE = 20;

const contentTypeRoute: Record<string, string> = {
  movie: '/movie',
  drama: '/drama',
  variety: '/variety',
  anime: '/anime',
  short_drama: '/short',
};

const SORT_OPTIONS_BY_TYPE: Record<string, { label: string; value: string }[]> = {
  watched: [
    { label: '最近看过', value: 'addedAt' },
    { label: '上映时间', value: 'year' },
    { label: '豆瓣评分', value: 'douban' },
    { label: '我的评分', value: 'userRating' },
  ],
  default: [
    { label: '最近加入', value: 'addedAt' },
    { label: '上映时间', value: 'year' },
    { label: '豆瓣评分', value: 'douban' },
  ],
};

const TYPE_FILTERS = [
  { label: '全部', value: '' },
  { label: '电影', value: 'movie' },
  { label: '剧集', value: 'drama' },
  { label: '综艺', value: 'variety' },
  { label: '动漫', value: 'anime' },
  { label: '短剧', value: 'short_drama' },
];

function activityLabel(listType: string) {
  if (listType === 'want_to_watch') return '加入想看';
  if (listType === 'watching') return '开始观看';
  if (listType === 'watched') return '标记看过';
  return '加入片单';
}

function ratingColor(rating: number) {
  if (rating >= 9) return 'var(--rating-9)';
  if (rating >= 8) return 'var(--rating-8)';
  if (rating >= 7) return 'var(--rating-7)';
  if (rating >= 6) return 'var(--rating-6)';
  return 'var(--rating-low)';
}

function ListItemCard({
  item,
  listType,
  batchMode,
  selected,
  onToggle,
  onEdit,
  onRemove,
}: {
  item: UserListItem;
  listType: string;
  batchMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onEdit: (readOnly: boolean) => void;
  onRemove: () => void;
}) {
  const route = contentTypeRoute[item.contentType] || '/movie';
  const href = `${route}/${item.movieId}`;
  const posterUrl = usePosterUrl(item.contentType, item.movieId, item.cover);
  const regions = parseRegion(item.region);
  const genres = parseJsonArr(item.genre);
  const directors = parseJsonArr(item.director);
  const hasRating = listType === 'watched' && item.userRating != null && Number(item.userRating) > 0;
  const hasNote = Boolean(item.note);

  return (
    <article className={`relative overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow] ${selected ? 'border-accent ring-2 ring-accent/20' : 'border-border hover:border-accent/25 hover:shadow-md'}`}>
      {batchMode && (
        <button type="button" onClick={onToggle} aria-pressed={selected} aria-label={`${selected ? '取消选择' : '选择'}《${item.title}》`} className="absolute inset-0 z-20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
          <span className={`absolute left-3 top-3 grid size-7 place-items-center rounded-lg border-2 shadow-sm ${selected ? 'border-accent bg-accent text-white' : 'border-border bg-card text-transparent'}`}><Check aria-hidden className="h-4 w-4" /></span>
        </button>
      )}

      <div className={`flex gap-3 p-3 sm:gap-4 sm:p-4 ${batchMode ? 'pointer-events-none opacity-75' : ''}`}>
        <Link href={href} prefetch={false} className="shrink-0" aria-label={`查看《${item.title}》详情`}>
          <div className="relative h-[112px] w-20 overflow-hidden rounded-xl sm:h-[140px] sm:w-[100px]">
            <LazyImage src={posterUrl} alt={item.title || ''} className="rounded-xl" aspectRatio={null} fallbackSrc="/poster-placeholder.svg" rootMargin="100px" />
            {item.rating != null && Number(item.rating) > 0 && (
              <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{Number(item.rating).toFixed(1)}</span>
            )}
          </div>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <Link href={href} prefetch={false} className="line-clamp-2 text-sm font-bold leading-5 text-foreground no-underline hover:text-accent sm:text-base">
            {cleanTitleUtil(item.title) || '未知标题'}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <TypeBadge contentType={item.contentType} />
            {item.year && <span>{item.year}</span>}
            {regions.length > 0 && <span className="break-words">{regions.join(' / ')}</span>}
            {item.duration && <span>{item.duration} 分钟</span>}
            {item.totalEpisode && <span>{item.totalEpisode} 集</span>}
          </div>
          <div className="mt-2"><GenreTags genres={genres} max={3} /></div>
          {directors.length > 0 && <p className="mt-2 truncate text-xs text-muted-foreground">导演：{directors.join(' / ')}</p>}
          {(hasNote || hasRating) && (
            <button type="button" onClick={() => onEdit(true)} disabled={batchMode} className="mt-3 min-h-11 border-l-2 border-accent/35 pl-3 text-left disabled:pointer-events-none">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-foreground">我的记录</span>
                {hasRating && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: ratingColor(Number(item.userRating)) }}>
                    <Star aria-hidden className="h-3.5 w-3.5 fill-current" />{Number(item.userRating).toFixed(1)}
                  </span>
                )}
              </span>
              <span className="mt-1 line-clamp-3 block text-sm leading-6 text-secondary-foreground">{item.note || '查看我的评分'}</span>
            </button>
          )}
          <p className="mt-auto pt-2 text-[11px] text-muted-foreground">{listType === 'watched' ? formatWatchedAt(item.watchedAt || item.addedAt) : formatRelativeTime(item.addedAt || '')} · {activityLabel(listType)}</p>
        </div>
      </div>

      {!batchMode && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2.5 sm:px-4">
          <Link href={href} prefetch={false} className="mr-auto inline-flex min-h-11 items-center gap-1 text-xs font-medium text-accent no-underline">查看详情<ChevronRight aria-hidden className="h-3.5 w-3.5" /></Link>
          <button type="button" onClick={() => onEdit(false)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:border-accent/30 hover:text-accent"><Edit3 aria-hidden className="h-3.5 w-3.5" />{listType === 'watched' ? '评价' : '备注'}</button>
          <button type="button" onClick={onRemove} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-red-500/25 px-3 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"><Trash2 aria-hidden className="h-3.5 w-3.5" />移除</button>
        </div>
      )}
    </article>
  );
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const listId = Number(params.id);
  const [hydrated, setHydrated] = useState(false);
  const [list, setList] = useState<UserList | null>(null);
  const [items, setItems] = useState<UserListItem[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [sortBy, setSortBy] = useState('addedAt');
  const sortDir: 'asc' | 'desc' = 'desc';
  const [typeFilter, setTypeFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<UserListItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const [noteEdit, setNoteEdit] = useState<UserListItem | null>(null);
  const [noteReadOnly, setNoteReadOnly] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (!hasStoredToken()) router.replace(`/login?from=/user/lists/${listId}`);
  }, [listId, router]);

  useEffect(() => {
    if (!hasStoredToken() || !Number.isFinite(listId)) return;
    const controller = new AbortController();
    setMetadataLoading(true);
    setMetadataError(null);
    void listApi.getAll({ signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      const lists = Array.isArray(response.data.data) ? response.data.data : [];
      const found = lists.find((candidate) => candidate.id === listId);
      if (!found) {
        setMetadataError('片单不存在或当前账户无权访问');
        return;
      }
      setList(found);
    }).catch(() => {
      if (!controller.signal.aborted) setMetadataError('片单信息加载失败，请重试');
    }).finally(() => {
      if (!controller.signal.aborted) setMetadataLoading(false);
    });
    return () => controller.abort();
  }, [listId, reloadKey]);

  useEffect(() => {
    if (!hasStoredToken() || !Number.isFinite(listId)) return;
    const controller = new AbortController();
    setItemsLoading(true);
    setItemsError(null);
    setSelectedIds(new Set());
    void listApi.getItems(listId, {
      page: currentPage,
      size: PAGE_SIZE,
      sort: sortBy,
      sortDir,
      contentType: typeFilter || undefined,
    }, { signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      const page = response.data.data as { records?: UserListItem[]; total?: number; size?: number } | undefined;
      const records = Array.isArray(page?.records) ? page.records : [];
      const total = typeof page?.total === 'number' ? page.total : 0;
      const size = typeof page?.size === 'number' && page.size > 0 ? page.size : PAGE_SIZE;
      setItems(records);
      setFilteredTotal(total);
      setTotalPages(Math.max(1, Math.ceil(total / size)));
    }).catch(() => {
      if (!controller.signal.aborted) {
        setItems([]);
        setItemsError('片单内容加载失败，请检查网络后重试');
      }
    }).finally(() => {
      if (!controller.signal.aborted) setItemsLoading(false);
    });
    return () => controller.abort();
  }, [currentPage, listId, reloadKey, sortBy, sortDir, typeFilter]);

  const toggleSelection = useCallback((itemId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const handleRemove = async () => {
    if (!confirmDelete || removing) return;
    setRemoving(true);
    try {
      await listApi.removeItem(listId, { movieId: confirmDelete.movieId, contentType: confirmDelete.contentType });
      showToast('已从片单移除', 'info');
      setConfirmDelete(null);
      if (items.length === 1 && currentPage > 1) setCurrentPage((page) => page - 1);
      else setReloadKey((key) => key + 1);
    } catch {
      showToast('移除失败，请稍后再试', 'error');
    } finally {
      setRemoving(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0 || batchDeleting) return;
    setBatchDeleting(true);
    try {
      const selectedItems = items.filter((item) => selectedIds.has(item.id));
      await listApi.batchRemoveItems(listId, selectedItems.map((item) => ({ movieId: item.movieId, contentType: item.contentType })));
      showToast(`已移除 ${selectedItems.length} 部内容`, 'success');
      setSelectedIds(new Set());
      setBatchMode(false);
      setConfirmBatchDelete(false);
      if (selectedItems.length === items.length && currentPage > 1) setCurrentPage((page) => page - 1);
      else setReloadKey((key) => key + 1);
    } catch {
      showToast('批量移除失败，请稍后再试', 'error');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleNoteSave = async (note: string, rating?: number) => {
    if (!noteEdit) return;
    await listApi.updateItem(listId, { movieId: noteEdit.movieId, contentType: noteEdit.contentType, note: note || undefined, rating });
    setItems((current) => current.map((item) => item.id === noteEdit.id ? { ...item, note: note || undefined, userRating: rating } : item));
    setNoteEdit((current) => current ? { ...current, note: note || undefined, userRating: rating } : null);
    setNoteReadOnly(true);
    showToast('备注与评价已更新', 'success');
    window.dispatchEvent(new CustomEvent('movie-status-changed', { detail: { movieId: noteEdit.movieId, contentType: noteEdit.contentType, action: 'updated' } }));
  };

  if (!hydrated || !hasStoredToken()) return null;

  const listType = list?.type || 'custom';
  const watchedList = listType === 'watched';
  const sortOptions = watchedList ? SORT_OPTIONS_BY_TYPE.watched : SORT_OPTIONS_BY_TYPE.default;
  const allCurrentPageSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="面包屑">
        <Link href="/profile" className="text-secondary-foreground no-underline hover:text-accent">个人中心</Link>
        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
        <span className="truncate text-foreground">{list?.name || '片单'}</span>
      </nav>

      {metadataError ? (
        <div role="alert" className="grid place-items-center rounded-2xl border border-border bg-card px-5 py-16 text-center">
          <p className="text-sm text-secondary-foreground">{metadataError}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-4 min-h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-white">重新加载</button>
        </div>
      ) : (
        <>
          <header className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Collection</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{metadataLoading ? '正在加载片单…' : list?.name || '片单'}</h1>
              {list?.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{list.description}</p>}
              <p className="mt-2 text-xs tabular-nums text-muted-foreground">{typeFilter ? `${filteredTotal} 部筛选结果 · ${list?.itemCount ?? 0} 部总计` : `${list?.itemCount ?? filteredTotal} 部内容`}</p>
            </div>
            {!metadataLoading && list && <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"><ListChecks aria-hidden className="h-3.5 w-3.5" />{watchedList ? '观看与评价' : '个人收藏'}</span>}
          </header>

          <section className="space-y-3 rounded-2xl border border-border bg-card/70 p-3 sm:p-4" aria-label="片单筛选与排序">
            <div className="filter-scroll-row" role="group" aria-label="内容类型">
              {TYPE_FILTERS.map((type) => (
                <button key={type.value} type="button" aria-pressed={typeFilter === type.value} onClick={() => { setTypeFilter(type.value); setCurrentPage(1); }} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${typeFilter === type.value ? 'border-accent bg-accent text-white' : 'border-border bg-card text-secondary-foreground hover:border-accent/30'}`}>{type.label}</button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {batchMode && (
                  <button type="button" onClick={() => setSelectedIds(allCurrentPageSelected ? new Set() : new Set(items.map((item) => item.id)))} className="min-h-9 rounded-lg border border-border px-3 text-xs font-medium text-foreground">{allCurrentPageSelected ? '取消全选' : '全选本页'}</button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CustomSelect ariaLabel="片单排序方式" value={sortBy} options={sortOptions} onChange={(value) => { setSortBy(value); setCurrentPage(1); }} />
                <button type="button" onClick={() => { setBatchMode((enabled) => !enabled); setSelectedIds(new Set()); }} className={`min-h-9 rounded-lg border px-3 text-xs font-medium ${batchMode ? 'border-accent bg-accent/10 text-accent' : 'border-border text-secondary-foreground'}`}>{batchMode ? '退出批量管理' : '批量管理'}</button>
              </div>
            </div>
          </section>

          {itemsError ? (
            <div role="alert" className="grid place-items-center rounded-2xl border border-border bg-card px-5 py-14 text-center">
              <p className="text-sm text-secondary-foreground">{itemsError}</p>
              <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-4 min-h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-white">重新加载</button>
            </div>
          ) : itemsLoading ? (
            <div className="grid gap-3 lg:grid-cols-2" aria-label="正在加载片单内容">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />)}</div>
          ) : items.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card px-5 py-16 text-center">
              <Inbox aria-hidden className="h-9 w-9 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">{typeFilter ? '该类型下暂无内容' : '片单还是空的'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{typeFilter ? '切换到全部内容或选择其他类型。' : '浏览影视详情并加入片单后，会显示在这里。'}</p>
              {typeFilter ? (
                <button type="button" onClick={() => { setTypeFilter(''); setCurrentPage(1); }} className="mt-4 min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-accent">查看全部内容</button>
              ) : (
                <Link href="/category" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white no-underline">浏览内容分类</Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((item) => (
                  <ListItemCard key={item.id} item={item} listType={listType} batchMode={batchMode} selected={selectedIds.has(item.id)} onToggle={() => toggleSelection(item.id)} onEdit={(readOnly) => { setNoteEdit(item); setNoteReadOnly(readOnly); }} onRemove={() => setConfirmDelete(item)} />
                ))}
              </div>
              {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            </>
          )}
        </>
      )}

      {confirmDelete && <Dialog open onClose={() => setConfirmDelete(null)} onConfirm={() => void handleRemove()} title="确认移除" message={`确定要将《${confirmDelete.title || ''}》从片单中移除吗？`} confirmText="确认移除" variant="danger" loading={removing} />}
      {confirmBatchDelete && <Dialog open onClose={() => setConfirmBatchDelete(false)} onConfirm={() => void handleBatchDelete()} title="批量移除" message={`确定要将本页选中的 ${selectedIds.size} 部内容从片单中移除吗？`} confirmText={`移除 ${selectedIds.size} 部`} variant="danger" loading={batchDeleting} />}

      {batchMode && selectedIds.size > 0 && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur md:bottom-4">
          <span className="text-sm font-medium text-foreground">本页已选 {selectedIds.size} 项</span>
          <button type="button" onClick={() => setConfirmBatchDelete(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"><Trash2 aria-hidden className="h-4 w-4" />批量移除</button>
        </div>
      )}

      {noteEdit && (
        <NoteEditModal open onClose={() => { setNoteEdit(null); setNoteReadOnly(false); }} onSave={handleNoteSave} initialNote={noteEdit.note || ''} initialRating={noteEdit.userRating} isWatchedList={watchedList} movieTitle={noteEdit.title || ''} isReadOnly={noteReadOnly} onEdit={() => setNoteReadOnly(false)} />
      )}
    </div>
  );
}
