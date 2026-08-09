'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FolderHeart,
  History,
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
  Trash2,
} from 'lucide-react';
import { useUserStore, hasStoredToken } from '@/stores/userStore';
import { listApi, type UserList } from '@/lib/userApi';
import { useToast } from '@/components/Toast';
import { cleanTitle as cleanTitleUtil, formatRelativeTime } from '@/lib/utils';
import { parseJsonArr } from '@/lib/contentConstants';
import { TypeBadge, GenreTags } from '@/components/ContentShared';
import LazyImage from '@/components/ui/lazy-image';
import PosterSettingsCard from '@/components/PosterSettingsCard';
import { usePosterUrl } from '@/hooks/usePosterUrl';
import { Modal } from '@/components/ui/modal';
import Dialog from '@/components/Dialog';

interface TabDefinition {
  key: 'lists' | 'history' | 'settings';
  label: string;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

const TABS: TabDefinition[] = [
  { key: 'lists', label: '我的片单', Icon: FolderHeart },
  { key: 'history', label: '最近动态', Icon: History },
  { key: 'settings', label: '设置', Icon: Settings },
];

type TabKey = TabDefinition['key'];

const DEFAULT_LISTS = [
  { key: 'want_to_watch', label: '想看', apiName: '想看', Icon: Bookmark, tone: 'text-violet-600 bg-violet-500/10 dark:text-violet-300' },
  { key: 'watching', label: '在看', apiName: '在看', Icon: Eye, tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-300' },
  { key: 'watched', label: '看过', apiName: '看过', Icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-300' },
];

interface HistoryItem {
  id: number;
  movieId: number;
  contentType: string;
  title: string;
  cover: string;
  year?: number;
  rating?: number;
  addedAt?: string;
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

const inputClassName = 'w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20';

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

function ListsTab() {
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

  const loadLists = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await listApi.getAll({ signal });
      if (signal?.aborted) return;
      setLists(Array.isArray(response.data.data) ? response.data.data : []);
    } catch {
      if (!signal?.aborted) {
        setLists([]);
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

  if (loading) {
    return <div className="grid gap-3" aria-label="正在加载片单">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }
  if (loadError) return <InlineError message={loadError} onRetry={() => setReloadKey((key) => key + 1)} />;

  const defaultLists = lists.filter((list) => list.isDefault === 1);
  const customLists = lists.filter((list) => list.isDefault !== 1);

  return (
    <div className="space-y-8">
      <section aria-labelledby="default-lists-title">
        <div>
          <h2 id="default-lists-title" className="text-base font-semibold text-foreground">观看状态</h2>
          <p className="mt-1 text-xs text-muted-foreground">想看、在看与看过互斥流转，数量来自当前真实片单。</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {DEFAULT_LISTS.map((definition) => {
            const matched = defaultLists.find((list) => list.type === definition.key) || defaultLists.find((list) => list.name === definition.apiName);
            const content = (
              <>
                <span className={`grid size-10 place-items-center rounded-xl ${definition.tone}`}><definition.Icon aria-hidden className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{definition.label}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{matched ? `${matched.itemCount} 部内容` : '默认片单暂不可用'}</p>
                </div>
                {matched && <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground" />}
              </>
            );
            return matched ? (
              <Link key={definition.key} href={`/user/lists/${matched.id}`} prefetch={false} className="flex min-h-24 items-center gap-3 rounded-2xl border border-border bg-card p-4 no-underline transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-md">{content}</Link>
            ) : (
              <div key={definition.key} className="flex min-h-24 items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/25 p-4 opacity-70">{content}</div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="custom-lists-title">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="custom-lists-title" className="text-base font-semibold text-foreground">自定义片单</h2>
            <p className="mt-1 text-xs text-muted-foreground">为主题、档期或共同观看计划建立独立收藏。</p>
          </div>
          <button type="button" onClick={() => setShowCreate((open) => !open)} aria-expanded={showCreate} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium text-foreground hover:border-accent/40 hover:text-accent">
            <ListPlus aria-hidden className="h-4 w-4" />新建片单
          </button>
        </div>

        {showCreate && (
          <form className="mt-4 rounded-2xl border border-border bg-card p-4" onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}>
            <label htmlFor="new-list-name" className="text-sm font-medium text-foreground">片单名称</label>
            <input id="new-list-name" value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={30} autoFocus className={`mt-2 h-10 ${inputClassName}`} placeholder="例如：周末合家欢" />
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
          <div className="mt-4 grid gap-2">
            {customLists.map((list) => (
              <div key={list.id} className="flex items-stretch overflow-hidden rounded-xl border border-border bg-card transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-sm">
                <Link href={`/user/lists/${list.id}`} prefetch={false} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 p-4 no-underline">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{list.name}</p>
                    {list.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{list.description}</p>}
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{list.itemCount} 部</span>
                  <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
                <div className="flex shrink-0 items-center border-l border-border px-1.5" aria-label={`${list.name}片单操作`}>
                  <button type="button" onClick={() => openEditor(list)} className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`编辑片单“${list.name}”`} title="编辑片单"><Pencil aria-hidden className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setDeletingList(list)} className="grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-600" aria-label={`删除片单“${list.name}”`} title="删除片单"><Trash2 aria-hidden className="h-4 w-4" /></button>
                </div>
              </div>
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
  const region = parseJsonArr(item.region)[0];
  const genres = parseJsonArr(item.genre);
  const statusTone = item.listType === 'watched' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : item.listType === 'watching' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-violet-500/10 text-violet-700 dark:text-violet-300';

  return (
    <Link href={`${route}/${item.movieId}`} prefetch={false} className="flex gap-3 rounded-2xl border border-border bg-card p-3 no-underline transition-[border-color,box-shadow] hover:border-accent/30 hover:shadow-sm">
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
            {region && <span className="max-w-24 truncate">{region}</span>}
            {item.rating != null && Number(item.rating) > 0 && <span className="font-semibold text-amber-600 dark:text-amber-400">{Number(item.rating).toFixed(1)} 分</span>}
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <GenreTags genres={genres} max={2} />
          <span className="shrink-0 text-[10px] text-muted-foreground">{formatRelativeTime(item.addedAt || '')}</span>
        </div>
      </div>
    </Link>
  );
}

function HistoryTab() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partialError, setPartialError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setPartialError(false);

    void listApi.getAll({ signal: controller.signal }).then(async (response) => {
      const allLists = Array.isArray(response.data.data) ? response.data.data : [];
      const defaultLists = allLists.filter((list) => list.isDefault === 1);
      const results = await Promise.allSettled(defaultLists.map(async (list) => ({
        list,
        response: await listApi.getItems(list.id, { page: 1, size: 20, sort: 'addedAt', sortDir: 'desc' }, { signal: controller.signal }),
      })));
      if (controller.signal.aborted) return;

      const nextItems: HistoryItem[] = [];
      for (const result of results) {
        if (result.status === 'rejected') continue;
        const { list, response: itemResponse } = result.value;
        const page = itemResponse.data.data as { records?: HistoryItem[] } | undefined;
        const records = Array.isArray(page?.records) ? page.records : [];
        const action = list.type === 'want_to_watch' ? '想看' : list.type === 'watching' ? '在看' : list.type === 'watched' ? '看过' : '收藏';
        records.forEach((item) => nextItems.push({ ...item, action, listType: list.type }));
      }
      nextItems.sort((left, right) => new Date(right.addedAt || 0).getTime() - new Date(left.addedAt || 0).getTime());
      setItems(nextItems);
      setPartialError(results.some((result) => result.status === 'rejected'));
    }).catch(() => {
      if (!controller.signal.aborted) {
        setItems([]);
        setLoadError('最近动态加载失败，请检查网络后重试');
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [reloadKey]);

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'watched', label: '看过' },
    { key: 'watching', label: '在看' },
    { key: 'want_to_watch', label: '想看' },
  ];
  const filteredItems = activeFilter === 'all' ? items : items.filter((item) => item.listType === activeFilter);

  if (loading) return <div className="space-y-3" aria-label="正在加载最近动态">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>;
  if (loadError) return <InlineError message={loadError} onRetry={() => setReloadKey((key) => key + 1)} />;

  return (
    <div className="space-y-4">
      {partialError && (
        <div role="status" className="flex flex-col gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-secondary-foreground">部分片单暂未加载，下面仍保留已成功读取的动态。</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="text-sm font-medium text-accent">重新加载</button>
        </div>
      )}
      <div className="filter-scroll-row" role="group" aria-label="动态类型筛选">
        {filters.map((filter) => (
          <button key={filter.key} type="button" onClick={() => setActiveFilter(filter.key)} aria-pressed={activeFilter === filter.key} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activeFilter === filter.key ? 'border-accent bg-accent text-white' : 'border-border bg-card text-secondary-foreground hover:border-accent/30'}`}>{filter.label}</button>
        ))}
      </div>
      {filteredItems.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <Clock3 aria-hidden className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">{activeFilter === 'all' ? '还没有观看动态' : '该状态下暂无动态'}</p>
          <p className="mt-1 text-xs text-muted-foreground">浏览内容并加入片单后，记录会出现在这里。</p>
        </div>
      ) : (
        <div className="grid gap-2">{filteredItems.map((item) => <HistoryRow key={`${item.listType}-${item.id}`} item={item} />)}</div>
      )}
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
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2"><Info aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">账户信息</h2></div>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">用户名</dt><dd className="truncate font-medium text-foreground">{user?.username || '—'}</dd></div>
          {user?.nickname && <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">昵称</dt><dd className="truncate font-medium text-foreground">{user.nickname}</dd></div>}
          {user?.email && <div className="flex items-center justify-between gap-4"><dt className="text-muted-foreground">邮箱</dt><dd className="truncate font-medium text-foreground">{user.email}</dd></div>}
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
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

      <div className="lg:col-span-2"><PosterSettingsCard /></div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2"><SearchX aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">本地数据</h2></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">搜索历史仅保存在当前浏览器，清除不会影响片单或账户数据。</p>
        <button type="button" onClick={clearSearchHistory} className="mt-4 min-h-10 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:border-accent/40 hover:text-accent">清除搜索历史</button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2"><Info aria-hidden className="h-4 w-4 text-accent" /><h2 className="text-sm font-semibold text-foreground">项目信息</h2></div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">查看影视森林的数据来源、TMDB 署名与项目说明。</p>
        <Link href="/about" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground no-underline hover:border-accent/40 hover:text-accent">查看项目说明<ChevronRight aria-hidden className="h-4 w-4" /></Link>
      </section>

      <button type="button" onClick={() => { logout(); router.replace('/'); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/40 text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-400 lg:col-span-2">
        <LogOut aria-hidden className="h-4 w-4" />退出登录
      </button>
    </div>
  );
}

export default function ProfileClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabKey>('lists');

  useEffect(() => {
    if (!hasStoredToken()) router.replace('/login?from=/profile');
  }, [router]);

  if (!hasStoredToken()) return null;

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="h-20 bg-[radial-gradient(circle_at_15%_10%,color-mix(in_srgb,var(--accent)_30%,transparent),transparent_45%),linear-gradient(120deg,color-mix(in_srgb,var(--bg-secondary)_90%,var(--accent)_10%),var(--bg-secondary))]" />
        <div className="flex items-end gap-4 px-5 pb-5 sm:px-6">
          <div className="-mt-7 grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-card bg-accent text-xl font-bold text-white shadow-md">
            {user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt={`${user.nickname || user.username || '用户'}头像`} className="h-full w-full object-cover" />
            ) : (
              <span>{(user?.nickname || user?.username || '用').charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">My Forest</p>
            <h1 className="mt-1 truncate text-xl font-bold text-foreground">{user?.nickname || user?.username || '影视森林用户'}</h1>
            {user?.nickname && user?.username && <p className="mt-0.5 text-xs text-muted-foreground">@{user.username}</p>}
          </div>
        </div>
      </header>

      <div className="filter-scroll-row rounded-2xl border border-border bg-card p-1.5" role="tablist" aria-label="个人中心">
        {TABS.map((tab) => (
          <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} aria-controls={`profile-panel-${tab.key}`} onClick={() => setActiveTab(tab.key)} className={`inline-flex min-h-10 flex-1 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-accent text-white shadow-sm' : 'text-secondary-foreground hover:bg-muted'}`}>
            <tab.Icon aria-hidden className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      <div id={`profile-panel-${activeTab}`} role="tabpanel">
        {activeTab === 'lists' && <ListsTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
