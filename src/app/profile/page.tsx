
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore, hasStoredToken } from '@/stores/userStore';
import { listApi, type UserList } from '@/lib/userApi';
import { useToast } from '@/components/Toast';

const DEFAULT_LISTS = [
  { key: 'want_to_watch', label: '想看', icon: '🔖', apiName: '想看' },
  { key: 'watching', label: '在看', icon: '👁️', apiName: '在看' },
  { key: 'watched', label: '看过', icon: '✅', apiName: '看过' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useUserStore();
  const { showToast } = useToast();
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Check localStorage directly to avoid rehydration race condition
    if (!hasStoredToken()) {
      router.replace('/login?from=/profile');
      return;
    }
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

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  // Split lists: default first, then custom
  // Backend uses isDefault=1 for default lists, type stores want_to_watch/watching/watched/custom
  const defaultLists = lists.filter((l) => l.isDefault === 1);
  const customLists = lists.filter((l) => l.isDefault !== 1);

  // Match default lists by type (want_to_watch, watching, watched) or name
  const findDefaultMatch = (d: typeof DEFAULT_LISTS[number]) => {
    // Match by type field
    const byType = defaultLists.find((l) => l.type === d.key);
    if (byType) return byType;
    // Fallback: match by name
    return defaultLists.find((l) => l.name === d.apiName);
  };

  if (!hasStoredToken()) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* User Info Card */}
      <div
        className="rounded-2xl border p-6 flex items-center gap-4"

      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"

        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>{(user?.nickname || user?.username || '用').charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold truncate text-foreground" >
            {user?.nickname || user?.username || '用户'}
          </h1>
          {user?.nickname && user?.username && (
            <p className="text-sm mt-0.5 text-muted-foreground" >
              @{user.username}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
          }}
        >
          退出登录
        </button>
      </div>

      {/* Default Lists */}
      <section>
        <h2 className="text-lg font-bold mb-3 text-foreground" >
          我的标记
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {DEFAULT_LISTS.map((d) => {
            const matched = findDefaultMatch(d);
            const href = matched ? `/user/lists/${matched.id}` : '#';
            return (
              <Link
                key={d.key}
                href={href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors hover:shadow-md no-underline"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <span className="text-3xl">{d.icon}</span>
                <span className="text-sm font-medium text-foreground" >
                  {d.label}
                </span>
                {matched && (
                  <span className="text-xs text-muted-foreground" >
                    {matched.itemCount} 部
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Custom Lists */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground" >
            我的片单
          </h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"

          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建
          </button>
        </div>

        {/* Inline create form */}
        {showCreate && (
          <div
            className="rounded-xl border p-4 mb-3"

          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="片单名称"
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none mb-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="描述（可选）"
              className="w-full h-10 px-3 rounded-lg text-sm border outline-none mb-3"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border"

              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"

              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse bg-card"  />
            ))}
          </div>
        ) : customLists.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl border"

          >
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm text-muted-foreground" >
              还没有创建过片单
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm font-medium"

            >
              <span className="inline-flex items-center gap-1">创建第一个片单 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {customLists.map((list) => (
              <Link
                key={list.id}
                href={`/user/lists/${list.id}`}
                className="flex items-center justify-between p-4 rounded-xl border transition-colors hover:shadow-md no-underline"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate text-foreground" >
                    {list.name}
                  </p>
                  {list.description && (
                    <p className="text-xs mt-0.5 truncate text-muted-foreground" >
                      {list.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs text-muted-foreground" >
                    {list.itemCount} 部
                  </span>
                  <svg
                    className="w-4 h-4"

                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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
