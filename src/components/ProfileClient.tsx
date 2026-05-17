'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore, hasStoredToken } from '@/stores/userStore';
import { listApi, type UserList, type UserListItem } from '@/lib/userApi';
import { useToast } from '@/components/Toast';
import { cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { parseJsonArr } from '@/lib/contentConstants';
import { TypeBadge, GenreTags } from '@/components/ContentShared';

// ─── Tab 定义 ───
const TABS = [
  { key: 'lists', label: '收藏夹', icon: '📋' },
  { key: 'history', label: '最近动态', icon: '🕐' },
  { key: 'settings', label: '设置', icon: '⚙️' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ─── 默认片单 ───
const DEFAULT_LISTS = [
  { key: 'want_to_watch', label: '想看', icon: '🔖', apiName: '想看' },
  { key: 'watching', label: '在看', icon: '👁️', apiName: '在看' },
  { key: 'watched', label: '看过', icon: '✅', apiName: '看过' },
];

// ─── 时间格式化 ───
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return '刚刚';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}分钟前`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}小时前`;
  if (diffDays(diffMs) < 7) return `${Math.floor(diffMs / day)}天前`;

  const thisYear = now.getFullYear();
  const thatYear = then.getFullYear();
  if (thatYear === thisYear) return `${then.getMonth() + 1}月${then.getDate()}日`;
  return `${thatYear}年${then.getMonth() + 1}月${then.getDate()}日`;
}

function diffDays(ms: number): number {
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

// ─── 最近动态条目类型 ───
interface HistoryItem {
  id: number;
  movieId: number;
  contentType: string;
  title: string;
  cover: string;
  year?: number;
  rating?: number;
  addedAt?: string;
  action: string; // '看过' | '想看' | '在看' | '收藏'
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

// ═══════════════════════════════════════════════
//  收藏夹 Tab
// ═══════════════════════════════════════════════
function ListsTab() {
  const { showToast } = useToast();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    setLoading(true);
    try {
      const res = await listApi.getAll();
      const data = res.data.data || res.data;
      setLists(Array.isArray(data) ? data : []);
    } catch {
      setLists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    if (newName.trim().length > 30) {
      showToast('片单名称不能超过30个字符', 'warning');
      return;
    }
    setCreating(true);
    try {
      await listApi.create({ name: newName.trim(), description: newDesc.trim() || undefined });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      showToast('片单创建成功', 'success');
      loadLists();
    } catch {
      showToast('创建失败，请稍后再试', 'error');
    } finally {
      setCreating(false);
    }
  };

  const defaultLists = lists.filter((l) => l.isDefault === 1);
  const customLists = lists.filter((l) => l.isDefault !== 1);

  const findDefaultMatch = (d: (typeof DEFAULT_LISTS)[number]) => {
    return defaultLists.find((l) => l.type === d.key) || defaultLists.find((l) => l.name === d.apiName);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 默认片单 */}
      <section>
        <h2 className="text-base font-bold mb-3 text-foreground">我的标记</h2>
        <div className="grid grid-cols-3 gap-3">
          {DEFAULT_LISTS.map((d) => {
            const matched = findDefaultMatch(d);
            const href = matched ? `/user/lists/${matched.id}` : '#';
            return (
              <Link
                key={d.key}
                href={href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors hover:shadow-md no-underline"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <span className="text-2xl">{d.icon}</span>
                <span className="text-sm font-medium text-foreground">{d.label}</span>
                {matched && (
                  <span className="text-xs text-muted-foreground">{matched.itemCount} 部</span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* 自定义片单 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">我的片单</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建
          </button>
        </div>

        {showCreate && (
          <div className="rounded-xl border p-4 mb-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="片单名称"
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none mb-2"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="描述（可选）"
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none mb-3"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border-color)' }}>
                取消
              </button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--accent)' }}>
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        )}

        {customLists.length === 0 ? (
          <div className="text-center py-10 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-2xl mb-2">📋</p>
            <p className="text-sm text-muted-foreground">还没有创建过片单</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
              创建第一个片单
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {customLists.map((list) => (
              <Link
                key={list.id}
                href={`/user/lists/${list.id}`}
                className="flex items-center justify-between p-4 rounded-xl border transition-colors hover:shadow-md no-underline"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate text-foreground">{list.name}</p>
                  {list.description && (
                    <p className="text-xs mt-0.5 truncate text-muted-foreground">{list.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs text-muted-foreground">{list.itemCount} 部</span>
                  <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  最近动态 Tab
// ═══════════════════════════════════════════════
function HistoryTab() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await listApi.getAll();
      const allLists = (res.data.data || res.data) as UserList[];
      if (!Array.isArray(allLists)) { setItems([]); return; }

      // 从所有默认片单中获取条目，按时间倒序
      const defaultLists = allLists.filter((l) => l.isDefault === 1);
      const allItems: HistoryItem[] = [];

      for (const list of defaultLists) {
        try {
          const itemsRes = await listApi.getItems(list.id, { page: 1, size: 20, sort: 'addedAt', sortDir: 'desc' });
          const pageData = itemsRes.data.data || itemsRes.data;
          const records = (pageData as { records?: HistoryItem[] }).records || [];
          const actionLabel = list.type === 'want_to_watch' ? '想看' : list.type === 'watching' ? '在看' : list.type === 'watched' ? '看过' : '收藏';

          for (const item of records) {
            allItems.push({
              id: item.id,
              movieId: item.movieId,
              contentType: item.contentType,
              title: item.title,
              cover: item.cover,
              year: item.year,
              rating: item.rating,
              addedAt: item.addedAt,
              action: actionLabel,
              listType: list.type,
              region: item.region,
              genre: item.genre,
            });
          }
        } catch { /* skip failed list */ }
      }

      // 按时间倒序排列
      allItems.sort((a, b) => {
        const ta = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const tb = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return tb - ta;
      });

      setItems(allItems);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = activeFilter === 'all' ? items : items.filter((i) => i.listType === activeFilter);

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'watched', label: '看过' },
    { key: 'watching', label: '在看' },
    { key: 'want_to_watch', label: '想看' },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 筛选栏 */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0"
            style={{
              backgroundColor: activeFilter === f.key ? 'var(--accent)' : 'var(--bg-card)',
              color: activeFilter === f.key ? '#fff' : 'var(--text-secondary)',
              border: activeFilter === f.key ? 'none' : '1px solid var(--border-color)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-muted-foreground">
            {activeFilter === 'all' ? '还没有任何动态' : '该分类下暂无动态'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const route = contentTypeRoute[item.contentType] || '/movie';
            const href = `${route}/${item.movieId}`;
            const regionArr = parseJsonArr(item.region);
            const genreArr = parseJsonArr(item.genre);

            return (
              <Link
                key={`${item.listType}-${item.id}`}
                href={href}
                className="flex gap-3 p-3 rounded-xl border transition-colors hover:shadow-md no-underline"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                {/* 封面 */}
                <div className="relative w-[60px] h-[84px] rounded-lg overflow-hidden shrink-0">
                  <img
                    src={item.cover || `https://picsum.photos/seed/${item.movieId}/120/168`}
                    alt={item.title || ''}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {item.rating != null && Number(item.rating) > 0 && (
                    <span className="absolute bottom-0.5 right-0.5 px-1 py-0.5 rounded text-[9px] font-bold text-white" style={{ backgroundColor: 'rgba(220,38,38,0.85)' }}>
                      {Number(item.rating).toFixed(1)}
                    </span>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate text-foreground">{cleanTitleUtil(item.title) || '未知标题'}</p>
                      <span
                        className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: item.listType === 'watched' ? 'var(--accent)' : item.listType === 'watching' ? '#f59e0b' : '#6366f1',
                          color: '#fff',
                        }}
                      >
                        {item.action}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <TypeBadge contentType={item.contentType} />
                      {item.year && <span>{item.year}</span>}
                      {regionArr.length > 0 && <span className="truncate max-w-[6em]">{regionArr[0]}</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <GenreTags genres={genreArr} max={2} />
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(item.addedAt || '')}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  设置 Tab
// ═══════════════════════════════════════════════
function SettingsTab() {
  const { user, logout } = useUserStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 账户信息 */}
      <section className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-bold text-foreground mb-3">账户信息</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">用户名</span>
            <span className="text-sm font-medium text-foreground">{user?.username || '-'}</span>
          </div>
          {user?.nickname && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">昵称</span>
              <span className="text-sm font-medium text-foreground">{user.nickname}</span>
            </div>
          )}
          {user?.email && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">邮箱</span>
              <span className="text-sm font-medium text-foreground">{user.email}</span>
            </div>
          )}
        </div>
      </section>

      {/* 外观设置（预留） */}
      <section className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-bold text-foreground mb-3">外观设置</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">暗色模式</p>
            <p className="text-xs text-muted-foreground mt-0.5">即将在三期 Phase 3 支持</p>
          </div>
          <div
            className="w-10 h-6 rounded-full relative cursor-not-allowed opacity-50"
            style={{ backgroundColor: 'var(--border-color)' }}
          >
            <div
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-sm"
              style={{ backgroundColor: 'var(--bg-card)' }}
            />
          </div>
        </div>
      </section>

      {/* 关于 */}
      <section className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-bold text-foreground mb-3">关于</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">版本</span>
          <span className="text-sm font-medium text-foreground">v3.0.0-dev</span>
        </div>
      </section>

      {/* 退出登录 */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl text-sm font-medium border transition-colors hover:bg-red-50"
        style={{ borderColor: '#ef4444', color: '#ef4444' }}
      >
        退出登录
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  Profile 主页
// ═══════════════════════════════════════════════
export default function ProfileClient() {
  const router = useRouter();
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabKey>('lists');

  useEffect(() => {
    if (!hasStoredToken()) {
      router.replace('/login?from=/profile');
    }
  }, []);

  if (!hasStoredToken()) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* 用户信息卡片 */}
      <div className="rounded-2xl border p-5 flex items-center gap-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>{(user?.nickname || user?.username || '用').charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold truncate text-foreground">{user?.nickname || user?.username || '用户'}</h1>
          {user?.nickname && user?.username && (
            <p className="text-xs mt-0.5 text-muted-foreground">@{user.username}</p>
          )}
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.key ? 'var(--accent)' : 'var(--bg-card)',
              color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div>
        {activeTab === 'lists' && <ListsTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
