// @ts-nocheck
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore, hasStoredToken } from '@/stores/userStore';
import { listApi, type UserList, type UserListItem } from '@/lib/userApi';
import { useToast } from '@/components/Toast';
import Pagination from '@/components/Pagination';
import CustomSelect from '@/components/CustomSelect';
import SortDirButton from '@/components/SortDirButton';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import dynamic from 'next/dynamic';

const NoteEditModal = dynamic(() => import('@/components/NoteEditModal'), { ssr: false });
const Dialog = dynamic(() => import('@/components/Dialog'), { ssr: false });

const contentTypeRoute: Record<string, string> = {
  movie: '/movie', drama: '/drama', variety: '/variety', anime: '/anime', short_drama: '/short',
};

const typeLabel: Record<string, string> = {
  movie: '电影', drama: '电视剧', variety: '综艺', anime: '动漫', short_drama: '短剧',
};

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

// 时间显示规则：
// 1天内：x小时前 想看/开始看/看过/收藏
// 1周内：x天前 想看/开始看/看过/收藏
// 超过1周但在今年：x月xx日
// 今年之前：xxxx年x月xx日
function formatTimeWithLabel(dateStr: string, listType: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const diffHours = Math.floor(diffMs / hour);
  const diffDays = Math.floor(diffMs / day);

  const label = listType === 'want_to_watch' ? '想看' :
                listType === 'watching' ? '开始看' :
                listType === 'watched' ? '看过' : '收藏';

  const thisYear = now.getFullYear();
  const thatYear = then.getFullYear();

  // 1天内
  if (diffMs < day) {
    const h = diffHours || 1;
    return `${h}小时前 ${label}`;
  }
  // 1周内
  if (diffDays < 7) {
    return `${diffDays}天前 ${label}`;
  }
  // 今年内
  if (thatYear === thisYear) {
    return `${then.getMonth() + 1}月${then.getDate()}日`;
  }
  // 今年之前
  return `${thatYear}年${then.getMonth() + 1}月${then.getDate()}日`;
}

// 评分等级样式
function getRatingStyle(rating: number): React.CSSProperties {
  if (rating >= 9) return { color: 'var(--rating-9)', fontWeight: 'bold' };
  if (rating >= 8) return { color: 'var(--rating-8)', fontWeight: 'bold' };
  if (rating >= 7) return { color: 'var(--rating-7)' };
  if (rating >= 6) return { color: 'var(--rating-6)' };
  return { color: 'var(--rating-low)' };
}

// 评分等级标签
function getRatingLabel(rating: number): string {
  if (rating >= 9) return '神作';
  if (rating >= 8) return '顶级';
  if (rating >= 7) return '推荐';
  if (rating >= 6) return '还行';
  if (rating >= 4) return '很差';
  if (rating >= 2) return '拉完了';
  if (rating >= 0.5) return '屎';
  return '未评价';
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useUserStore();
  const { showToast } = useToast();
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
  const listType = list?.type || 'custom';

  useEffect(() => {
    if (!hasStoredToken()) { router.replace('/login?from=/user/lists/' + listId); return; }
    loadList(1);
  }, [listId]);

  useEffect(() => {
    if (isAuthenticated && listId) loadList(1);
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
      showToast('已从片单移除', 'error');
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

  const filteredItems = typeFilter ? items.filter(i => i.contentType === typeFilter) : items;

  if (!hasStoredToken()) return null;

  const isWatchedList = listType === 'watched';
  const fallbackCover = (id: number) => `https://picsum.photos/seed/${id}/120/180`;

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href="/profile" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>我的</Link>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        <span style={{ color: 'var(--text-primary)' }}>{list?.name || '片单'}</span>
      </nav>

      {/* Title row with type filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{list?.name || '片单'}</h1>
          {list?.description && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{list.description}</p>}
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>共 {list?.itemCount ?? items.length} 部</p>
        </div>
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
              const hasNote = !!item.note;
              const hasRating = isWatchedList && item.userRating != null && Number(item.userRating) > 0;

              return (
                <div key={item.id} className="relative" onTouchStart={(e) => handleTouchStart(e, item.id)} onTouchEnd={handleTouchEnd}>
                  {/* Mobile swipe action buttons - behind the card */}
                  <div className="md:hidden absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-2 z-0" style={{ opacity: isSwiped ? 1 : 0, transition: 'opacity 0.2s' }}>
                    <button onClick={() => setNoteEdit({ item, listId })} className="h-8 px-3 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: 'var(--accent)' }}>{isWatchedList ? '编辑' : '备注'}</button>
                    <button onClick={() => setConfirmDelete(item)} className="h-8 px-3 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: 'var(--danger)' }}>移除</button>
                  </div>
                  {/* Card wrapper that slides */}
                  <div className="flex flex-col" style={{ transform: isSwiped ? 'translateX(-120px)' : 'translateX(0)', transition: 'transform 0.2s ease', position: 'relative', zIndex: 1 }}>
                  {/* Main card - remove bottom radius when note card exists */}
                  <div className={`flex gap-3 md:gap-4 p-3 md:p-4 border transition-all hover:shadow-md group ${(hasNote || hasRating) ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>

                    <Link href={href} className="shrink-0">
                      <div className="relative w-[80px] h-[110px] md:w-[100px] md:h-[140px] rounded-lg overflow-hidden">
                        <img src={item.cover || fallbackCover(item.movieId)} alt={item.title || ''} className="w-full h-full object-cover" loading="lazy" />
                        {/* Douban rating on poster */}
                        {item.rating && (
                          <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: 'rgba(220,38,38,0.85)' }}>
                            {Number(item.rating).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={href} className="font-bold text-sm md:text-base line-clamp-1 no-underline hover:text-[var(--accent)] transition-colors flex-1 min-w-0" style={{ color: 'var(--text-primary)' }}>
                          {cleanTitleUtil(item.title) || '未知标题'}
                        </Link>
                        {/* PC delete button */}
                        <button onClick={() => setConfirmDelete(item)} className="hidden md:flex w-6 h-6 rounded items-center justify-center transition-colors opacity-0 group-hover:opacity-100 hover:text-red-500 shrink-0" style={{ color: 'var(--text-muted)' }} title="移除">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="px-1.5 py-0.5 rounded text-[10px] md:text-xs" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>{typeLabel[item.contentType] || item.contentType}</span>
                        {item.year && <span>{item.year}</span>}
                        {regionArr.length > 0 && <span className="truncate max-w-[8em]">{regionArr.join('/')}</span>}
                        {item.duration && <span>{item.duration}分钟</span>}
                        {item.totalEpisode && <span>{item.totalEpisode}集</span>}
                      </div>

                      {genreArr.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {genreArr.slice(0, 3).map((g, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>{g}</span>
                          ))}
                        </div>
                      )}

                      {directorArr.length > 0 && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>导演:</span> {directorArr.join(' / ')}</p>}
                    </div>
                  </div>

                  {/* Note hook card - attached below */}
                  {(hasNote || hasRating) && (
                    <div className="mx-0 -mt-px px-3 py-2.5 text-xs relative" style={{ backgroundColor: 'var(--notes-bg)', borderRadius: '0 0 12px 12px', border: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)' }}>
                      <button onClick={() => setNoteEdit({ item, listId })} className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }} title={isWatchedList ? '编辑评分和感想' : '编辑备注'}>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <div className="pr-6">
                        {/* Line 1: time label + rating stars + score */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatTimeWithLabel(item.addedAt || '', listType)}</span>
                          {hasRating && (
                            <>
                              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>|</span>
                              <span className="text-[10px] font-medium" style={{ color: getRatingStyle(Number(item.userRating)).color }}>{getRatingLabel(Number(item.userRating))}</span>
                              <span className="inline-flex items-center gap-px">
                                {Array.from({ length: 10 }, (_, si) => (
                                  <svg key={si} width="10" height="10" viewBox="0 0 24 24">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                                      fill={si < Math.round(Number(item.userRating)) ? getRatingStyle(Number(item.userRating)).color : 'none'}
                                      stroke={getRatingStyle(Number(item.userRating)).color} strokeWidth="2" />
                                  </svg>
                                ))}
                              </span>
                              <span className="text-[11px] font-bold" style={{ color: getRatingStyle(Number(item.userRating)).color }}>{Number(item.userRating).toFixed(1)}分</span>
                            </>
                          )}
                        </div>
                        {/* Line 2: note content */}
                        {hasNote && <p className="mt-1.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.note}</p>}
                      </div>
                    </div>
                  )}
                  </div>{/* end sliding wrapper */}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => loadList(p)} />}
        </>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleRemoveConfirm}
        title="确认移除"
        message={`确定要将「${confirmDelete?.title || ''}」从片单中移除吗？`}
        confirmText="确认移除"
        variant="danger"
        loading={removing === confirmDelete?.id}
      />

      {noteEdit && (
        <NoteEditModal open={true} onClose={() => setNoteEdit(null)} onSave={handleNoteSave}
          initialNote={noteEdit.item.note || ''} initialRating={noteEdit.item.userRating} isWatchedList={isWatchedList} movieTitle={noteEdit.item.title || ''} />
      )}
    </div>
  );
}
