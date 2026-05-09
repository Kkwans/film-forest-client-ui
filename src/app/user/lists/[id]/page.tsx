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
import dynamic from 'next/dynamic';

const NoteEditModal = dynamic(() => import('@/components/NoteEditModal'), { ssr: false });

const contentTypeRoute: Record<string, string> = {
  movie: '/movie', drama: '/drama', variety: '/variety', anime: '/anime', short_drama: '/short',
};

const typeLabel: Record<string, string> = {
  movie: '电影', drama: '电视剧', variety: '综艺', anime: '动漫', short_drama: '短剧',
};

const SORT_OPTIONS = [
  { label: '最新收藏', value: 'addedAt' },
  { label: '上映时间', value: 'year' },
  { label: '豆瓣评分', value: 'douban' },
  { label: '我的评分', value: 'userRating' },
];

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
  const [confirmDelete, setConfirmDelete] = useState<UserListItem | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const [noteEdit, setNoteEdit] = useState<{ item: UserListItem; listId: number } | null>(null);

  // Swipe state for mobile
  const [swipedId, setSwipedId] = useState<number | null>(null);
  const touchStartX = useRef(0);
  const touchCurrentId = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?from=/user/lists/' + listId);
      return;
    }
    loadList();
  }, [isAuthenticated, listId]);

  const loadList = async (page = 1) => {
    setLoading(true);
    try {
      const allRes = await listApi.getAll();
      const allLists: UserList[] = allRes.data.data || allRes.data;
      const found = allLists.find((l) => l.id === listId);
      if (found) setList(found);

      const itemsRes = await listApi.getItems(listId, { page, size: 20 });
      const data = itemsRes.data.data || itemsRes.data;
      setItems(data.records || data || []);
      setCurrentPage(page);
      setTotalPages(data.size ? Math.ceil(data.total / data.size) : 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!confirmDelete) return;
    setRemoving(confirmDelete.id);
    try {
      await listApi.removeItem(listId, { movieId: confirmDelete.movieId, contentType: confirmDelete.contentType });
      setItems((prev) => prev.filter((i) => i.id !== confirmDelete.id));
      if (list) setList({ ...list, itemCount: Math.max(0, list.itemCount - 1) });
    } catch {
      // silent
    } finally {
      setRemoving(null);
      setConfirmDelete(null);
    }
  };

  const handleNoteSave = async (note: string, rating?: number) => {
    if (!noteEdit) return;
    try {
      await listApi.updateItem(listId, {
        movieId: noteEdit.item.movieId,
        contentType: noteEdit.item.contentType,
        note,
        rating,
      });
      // Update local state
      setItems(prev => prev.map(i =>
        i.id === noteEdit.item.id ? { ...i, note, userRating: rating ?? i.userRating } : i
      ));
    } catch {
      // silent
    }
    setNoteEdit(null);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = useCallback((e: React.TouchEvent, itemId: number) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentId.current = itemId;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff < -50 && touchCurrentId.current !== null) {
      setSwipedId(touchCurrentId.current);
    } else if (diff > 30) {
      setSwipedId(null);
    }
    touchCurrentId.current = null;
  }, []);

  // Client-side sort
  const sortedItems = [...items].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'addedAt') {
      cmp = (a.addedAt ? new Date(a.addedAt).getTime() : 0) - (b.addedAt ? new Date(b.addedAt).getTime() : 0);
    } else if (sortBy === 'year') {
      cmp = (a.year ?? 0) - (b.year ?? 0);
    } else if (sortBy === 'douban') {
      cmp = (Number(a.rating) ?? 0) - (Number(b.rating) ?? 0);
    } else if (sortBy === 'userRating') {
      cmp = (Number(a.userRating) ?? 0) - (Number(b.userRating) ?? 0);
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  if (!isAuthenticated) return null;

  const isWatchedList = list?.type === 'watched';
  const fallbackCover = (id: number) => `https://picsum.photos/seed/${id}/120/180`;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href="/profile" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>我的</Link>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        <span style={{ color: 'var(--text-primary)' }}>{list?.name || '片单'}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{list?.name || '片单'}</h1>
        {list?.description && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{list.description}</p>}
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>共 {list?.itemCount ?? items.length} 部</p>
      </div>

      {/* Sort controls */}
      {items.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <CustomSelect value={sortBy} options={SORT_OPTIONS} onChange={v => setSortBy(v)} />
          <SortDirButton direction={sortDir} onToggle={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>片单还是空的，去发现更多影视吧</p>
          <Link href="/" className="inline-flex items-center gap-1 mt-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
            去首页看看 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>
      ) : (
        <>
          {/* Grid layout - same as search results: PC 2 columns, mobile 1 column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {sortedItems.map((item) => {
              const route = contentTypeRoute[item.contentType] || '/movie';
              const href = `${route}/${item.movieId}`;
              const isSwiped = swipedId === item.id;

              return (
                <div
                  key={item.id}
                  className="relative overflow-hidden rounded-xl"
                  onTouchStart={(e) => handleTouchStart(e, item.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Mobile swipe action layer */}
                  <div className="md:hidden absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-2 z-10" style={{ opacity: isSwiped ? 1 : 0, transition: 'opacity 0.2s' }}>
                    <button
                      onClick={() => setNoteEdit({ item, listId })}
                      className="h-8 px-3 rounded-lg text-xs font-medium text-white"
                      style={{ backgroundColor: 'var(--accent)' }}
                    >
                      备注
                    </button>
                    <button
                      onClick={() => setConfirmDelete(item)}
                      className="h-8 px-3 rounded-lg text-xs font-medium text-white"
                      style={{ backgroundColor: '#ef4444' }}
                    >
                      移除
                    </button>
                  </div>

                  {/* Card content */}
                  <div
                    className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl border transition-all hover:shadow-md group relative"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      transform: isSwiped ? 'translateX(-120px)' : 'translateX(0)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    {/* Poster */}
                    <Link href={href} className="shrink-0">
                      <div className="w-[80px] h-[110px] md:w-[100px] md:h-[140px] rounded-lg overflow-hidden">
                        <img
                          src={item.cover || fallbackCover(item.movieId)}
                          alt={item.title || ''}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </Link>

                    {/* Info - like search result card */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <Link href={href} className="font-bold text-sm md:text-base line-clamp-1 no-underline hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                          {item.title || '未知标题'}
                        </Link>

                        {/* Ratings row */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] md:text-xs" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                            {typeLabel[item.contentType] || item.contentType}
                          </span>
                          {item.year && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.year}</span>}
                          {item.rating && (
                            <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                              豆瓣 {Number(item.rating).toFixed(1)}
                            </span>
                          )}
                        </div>

                        {/* User rating - only for watched list */}
                        {isWatchedList && item.userRating != null && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>我的评分</span>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(star => (
                                <svg key={star} className="w-3 h-3" viewBox="0 0 24 24" fill={star <= Math.round(item.userRating / 2) ? '#f59e0b' : 'none'} stroke={star <= Math.round(item.userRating / 2) ? '#f59e0b' : 'var(--text-muted)'} strokeWidth="2">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              ))}
                              <span className="text-[10px] font-bold ml-0.5" style={{ color: 'var(--accent)' }}>{Number(item.userRating).toFixed(1)}</span>
                            </div>
                          </div>
                        )}

                        {/* Note - styled specially */}
                        {item.note ? (
                          <div className="mt-1.5 flex items-start gap-1.5 p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                            <svg className="w-3 h-3 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            <p className="text-[10px] md:text-xs italic line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{item.note}</p>
                          </div>
                        ) : null}
                      </div>

                      {/* Bottom: time + actions */}
                      <div className="flex items-center justify-between mt-2">
                        {item.addedAt && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            收藏于 {new Date(item.addedAt).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                        {/* PC action buttons */}
                        <div className="hidden md:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setNoteEdit({ item, listId })}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
                            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                          >
                            {item.note ? '编辑备注' : '添加备注'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(item)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
                            style={{ borderColor: '#fecaca', color: '#ef4444' }}
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => loadList(p)} />
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-[90%] max-w-sm rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>确认移除</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              确定要将「{confirmDelete.title}」从片单中移除吗？
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={handleRemoveConfirm}
                disabled={removing === confirmDelete.id}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#ef4444' }}
              >
                {removing === confirmDelete.id ? '移除中...' : '确认移除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note edit modal */}
      {noteEdit && (
        <NoteEditModal
          open={true}
          onClose={() => setNoteEdit(null)}
          onSave={handleNoteSave}
          initialNote={noteEdit.item.note || ''}
          initialRating={noteEdit.item.userRating}
          isWatchedList={isWatchedList}
          movieTitle={noteEdit.item.title || ''}
        />
      )}
    </div>
  );
}
