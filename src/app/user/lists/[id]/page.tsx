// @ts-nocheck
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import { listApi, type UserList, type UserListItem } from '@/lib/userApi';
import Pagination from '@/components/Pagination';
import CustomSelect from '@/components/CustomSelect';
import SortDirButton from '@/components/SortDirButton';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import dynamic from 'next/dynamic';

const NoteEditModal = dynamic(() => import('@/components/NoteEditModal'), { ssr: false });

const contentTypeRoute: Record<string, string> = {
  movie: '/movie', drama: '/drama', variety: '/variety', anime: '/anime', short_drama: '/short',
};

const typeLabel: Record<string, string> = {
  movie: '电影', drama: '电视剧', variety: '综艺', anime: '动漫', short_drama: '短剧',
};

// Sort options per list type
const SORT_OPTIONS_BY_TYPE: Record<string, { label: string; value: string }[]> = {
  want_to_watch: [
    { label: '最新收藏', value: 'addedAt' },
    { label: '上映时间', value: 'year' },
    { label: '豆瓣评分', value: 'douban' },
  ],
  watching: [
    { label: '最新收藏', value: 'addedAt' },
    { label: '上映时间', value: 'year' },
    { label: '豆瓣评分', value: 'douban' },
  ],
  watched: [
    { label: '最新收藏', value: 'addedAt' },
    { label: '上映时间', value: 'year' },
    { label: '豆瓣评分', value: 'douban' },
    { label: '我的评分', value: 'userRating' },
  ],
  custom: [
    { label: '最新收藏', value: 'addedAt' },
    { label: '上映时间', value: 'year' },
    { label: '豆瓣评分', value: 'douban' },
  ],
};

const TYPE_FILTERS = [
  { label: '全部', value: '' },
  { label: '电影', value: 'movie' },
  { label: '电视剧', value: 'drama' },
  { label: '综艺', value: 'variety' },
  { label: '动漫', value: 'anime' },
  { label: '短剧', value: 'short_drama' },
];

function parseJsonArr(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
}

// Format relative time (e.g., "3天前", "9小时前")
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}天前`;
  // Format as date
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// Get rating style based on score
function getRatingStyle(rating: number): React.CSSProperties {
  if (rating >= 9) return { color: '#dc2626', fontWeight: 'bold' }; // 红色 - 神作
  if (rating >= 8) return { color: '#ea580c', fontWeight: 'bold' }; // 橙色 - 优秀
  if (rating >= 7) return { color: '#16a34a' }; // 绿色 - 良好
  if (rating >= 6) return { color: '#2563eb' }; // 蓝色 - 还行
  return { color: '#6b7280' }; // 灰色 - 一般
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useUserStore();
  const listId = Number(params.id);

  const [list, setList] = useState<UserList | null>(null);
  const [items, setItems] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('addedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<UserListItem | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [noteEdit, setNoteEdit] = useState<{ item: UserListItem; listId: number } | null>(null);
  const [swipedId, setSwipedId] = useState<number | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentId = useRef<number | null>(null);

  const sortOptions = SORT_OPTIONS_BY_TYPE[list?.type || 'custom'] || SORT_OPTIONS_BY_TYPE.custom;

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login?from=/user/lists/' + listId); return; }
    loadList(1);
  }, [isAuthenticated, listId]);

  // Re-load when sort/filter changes
  useEffect(() => {
    if (isAuthenticated && listId) {
      loadList(1);
    }
  }, [sortBy, sortDir]);

  const loadList = async (page = 1) => {
    setLoading(true);
    try {
      const allRes = await listApi.getAll();
      const allLists: UserList[] = allRes.data.data || allRes.data;
      const found = allLists.find((l) => l.id === listId);
      if (found) setList(found);
      const itemsRes = await listApi.getItems(listId, { page, size: 50, sort: sortBy, sortDir });
      const data = itemsRes.data.data || itemsRes.data;
      setItems(data.records || data || []);
      setCurrentPage(page);
      setTotalPages(data.size ? Math.ceil(data.total / data.size) : 1);
    } catch { setItems([]); } finally { setLoading(false); }
  };

  const handleRemoveConfirm = async () => {
    if (!confirmDelete) return;
    setRemoving(confirmDelete.id);
    try {
      await listApi.removeItem(listId, { movieId: confirmDelete.movieId, contentType: confirmDelete.contentType });
      setItems((prev) => prev.filter((i) => i.id !== confirmDelete.id));
      if (list) setList({ ...list, itemCount: Math.max(0, list.itemCount - 1) });
    } catch {} finally { setRemoving(null); setConfirmDelete(null); }
  };

  const handleNoteSave = async (note: string, rating?: number) => {
    if (!noteEdit) return;
    try {
      await listApi.updateItem(listId, { movieId: noteEdit.item.movieId, contentType: noteEdit.item.contentType, note: note || undefined, rating });
      setItems(prev => prev.map(i => i.id === noteEdit.item.id ? { ...i, note: note || i.note, userRating: rating ?? i.userRating } : i));
    } catch (err) { console.error('Update item failed:', err); }
    setNoteEdit(null);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent, itemId: number) => { touchStartX.current = e.touches[0].clientX; touchCurrentId.current = itemId; }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff < -50 && touchCurrentId.current !== null) setSwipedId(touchCurrentId.current);
    else if (diff > 30) setSwipedId(null);
    touchCurrentId.current = null;
  }, []);

  // Client-side type filter (sorting is server-side)
  const filteredItems = typeFilter ? items.filter(i => i.contentType === typeFilter) : items;

  if (!isAuthenticated) return null;

  const isWatchedList = list?.type === 'watched';
  const isWantList = list?.type === 'want_to_watch';
  const isWatchingList = list?.type === 'watching';
  const fallbackCover = (id: number) => `https://picsum.photos/seed/${id}/120/180`;

  // Get status label for subtitle
  const getStatusLabel = () => {
    if (isWantList) return '想看';
    if (isWatchingList) return '在看';
    if (isWatchedList) return '看过';
    return '收藏';
  };

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href="/profile" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>我的</Link>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        <span style={{ color: 'var(--text-primary)' }}>{list?.name || '片单'}</span>
      </nav>

      {/* Title row with type filter on the right */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{list?.name || '片单'}</h1>
          {list?.description && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{list.description}</p>}
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>共 {list?.itemCount ?? items.length} 部</p>
        </div>
        {/* Type filter - right side of title */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {TYPE_FILTERS.map(t => (
              <button key={t.value} onClick={() => setTypeFilter(t.value)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: typeFilter === t.value ? 'var(--accent)' : 'var(--bg-card)', color: typeFilter === t.value ? '#fff' : 'var(--text-secondary)', border: typeFilter === t.value ? 'none' : '1px solid var(--border-color)' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort controls */}
      {items.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <CustomSelect value={sortBy} options={sortOptions} onChange={v => setSortBy(v)} />
          <SortDirButton direction={sortDir} onToggle={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>片单还是空的，去发现更多影视吧</p>
          <Link href="/" className="inline-flex items-center gap-1 mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>去首页看看 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const route = contentTypeRoute[item.contentType] || '/movie';
              const href = `${route}/${item.movieId}`;
              const isSwiped = swipedId === item.id;
              const regionArr = parseJsonArr(item.region);
              const genreArr = parseJsonArr(item.genre);
              const directorArr = parseJsonArr(item.director);
              const actorArr = parseJsonArr(item.actor);

              return (
                <div key={item.id} className="relative overflow-hidden rounded-xl" onTouchStart={(e) => handleTouchStart(e, item.id)} onTouchEnd={handleTouchEnd}>
                  {/* Mobile swipe actions */}
                  <div className="md:hidden absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-2 z-10" style={{ opacity: isSwiped ? 1 : 0, transition: 'opacity 0.2s' }}>
                    <button onClick={() => setNoteEdit({ item, listId })} className="h-8 px-3 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>{isWatchedList ? '编辑' : '备注'}</button>
                    <button onClick={() => setConfirmDelete(item)} className="h-8 px-3 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: '#ef4444' }}>移除</button>
                  </div>

                  <div className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl border transition-all hover:shadow-md group relative"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', transform: isSwiped ? 'translateX(-120px)' : 'translateX(0)', transition: 'transform 0.2s ease' }}>
                    <Link href={href} className="shrink-0">
                      <div className="w-[80px] h-[110px] md:w-[100px] md:h-[140px] rounded-lg overflow-hidden">
                        <img src={item.cover || fallbackCover(item.movieId)} alt={item.title || ''} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      {/* Title + actions row */}
                      <div className="flex items-start justify-between gap-2">
                        <Link href={href} className="font-bold text-sm md:text-base line-clamp-1 no-underline hover:text-[var(--accent)] transition-colors flex-1 min-w-0" style={{ color: 'var(--text-primary)' }}>
                          {cleanTitleUtil(item.title) || '未知标题'}
                        </Link>
                        {/* PC actions - inline with title */}
                        <div className="hidden md:flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setNoteEdit({ item, listId })} className="w-6 h-6 rounded flex items-center justify-center transition-colors" style={{ color: 'var(--text-muted)' }} title={isWatchedList ? '编辑评分和感想' : '编辑备注'}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button onClick={() => setConfirmDelete(item)} className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:text-red-500" style={{ color: 'var(--text-muted)' }} title="移除">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                        </div>
                      </div>

                      {/* Ratings */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.rating && <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>豆瓣 {Number(item.rating).toFixed(1)}</span>}
                        {isWatchedList && item.userRating != null && <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fefce8', ...getRatingStyle(Number(item.userRating)) as any }}>我的 {Number(item.userRating).toFixed(1)}</span>}
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="px-1.5 py-0.5 rounded text-[10px] md:text-xs" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>{typeLabel[item.contentType] || item.contentType}</span>
                        {item.year && <span>{item.year}</span>}
                        {regionArr.length > 0 && <span className="truncate max-w-[8em]">{regionArr.join('/')}</span>}
                        {item.duration && <span>{item.duration}分钟</span>}
                        {item.totalEpisode && <span>{item.totalEpisode}集</span>}
                      </div>

                      {/* Genre tags */}
                      {genreArr.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {genreArr.slice(0, 3).map((g, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>{g}</span>
                          ))}
                        </div>
                      )}

                      {/* Director */}
                      {directorArr.length > 0 && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>导演:</span> {directorArr.join(' / ')}</p>}
                    </div>
                  </div>

                  {/* Bottom hook: note info (豆瓣 style) - outside the card */}
                  <div className="px-3 md:px-4 pb-2 pt-1">
                    {/* Line 1: time + status label */}
                    <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {item.addedAt && <span>{formatRelativeTime(item.addedAt)}</span>}
                      <span style={{ color: 'var(--text-secondary)' }}>{getStatusLabel()}</span>
                      {isWatchedList && item.userRating != null && Number(item.userRating) > 0 && (
                        <>
                          <span>|</span>
                          <span style={getRatingStyle(Number(item.userRating))}>{Number(item.userRating).toFixed(1)}分</span>
                        </>
                      )}
                    </div>
                    {/* Line 2: note content */}
                    {item.note && (
                      <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{item.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => loadList(p)} />}
        </>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-[90%] max-w-sm rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>确认移除</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>确定要将「{confirmDelete.title}」从片单中移除吗？</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>取消</button>
              <button onClick={handleRemoveConfirm} disabled={removing === confirmDelete.id} className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#ef4444' }}>{removing === confirmDelete.id ? '移除中...' : '确认移除'}</button>
            </div>
          </div>
        </div>
      )}

      {noteEdit && (
        <NoteEditModal open={true} onClose={() => setNoteEdit(null)} onSave={handleNoteSave}
          initialNote={noteEdit.item.note || ''} initialRating={noteEdit.item.userRating} isWatchedList={isWatchedList} movieTitle={noteEdit.item.title || ''} />
      )}
    </div>
  );
}
