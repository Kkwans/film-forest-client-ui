// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import { listApi, type UserList, type UserListItem } from '@/lib/userApi';
import Pagination from '@/components/Pagination';

// Map contentType to route prefix
const contentTypeRoute: Record<string, string> = {
  movie: '/movie',
  drama: '/drama',
  variety: '/variety',
  anime: '/anime',
  short_drama: '/short',
};

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
  const [removing, setRemoving] = useState<number | null>(null);

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
      // Get list metadata
      const allRes = await listApi.getAll();
      const allLists: UserList[] = allRes.data.data || allRes.data;
      const found = allLists.find((l) => l.id === listId);
      if (found) setList(found);

      // Get items
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

  const handleRemove = async (item: UserListItem) => {
    setRemoving(item.id);
    try {
      await listApi.removeItem(listId, { movieId: item.movieId, contentType: item.contentType });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (list) setList({ ...list, itemCount: Math.max(0, list.itemCount - 1) });
    } catch {
      // silent
    } finally {
      setRemoving(null);
    }
  };

  if (!isAuthenticated) return null;

  const fallbackCover = (id: number) => `https://picsum.photos/seed/${id}/120/180`;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href="/profile" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>
          我的
        </Link>
        <span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{list?.name || '片单'}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {list?.name || '片单'}
        </h1>
        {list?.description && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {list.description}
          </p>
        )}
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          共 {list?.itemCount ?? items.length} 部
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-3 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="w-[80px] h-[110px] rounded-lg shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />
              <div className="flex-1 space-y-2 py-2">
                <div className="h-4 w-2/3 rounded" style={{ backgroundColor: 'var(--border-color)' }} />
                <div className="h-3 w-1/3 rounded" style={{ backgroundColor: 'var(--border-color)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            片单还是空的，去发现更多影视吧
          </p>
          <Link
            href="/"
            className="inline-block mt-3 text-sm font-medium"
            style={{ color: 'var(--accent)' }}
          >
            去首页看看 →
          </Link>
        </div>
      ) : (
        <>
          {/* Horizontal list layout (like Douban) */}
          <div className="space-y-2">
            {items.map((item) => {
              const route = contentTypeRoute[item.contentType] || '/movie';
              const href = `${route}/${item.movieId}`;
              return (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 rounded-xl border transition-colors hover:shadow-md group"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  {/* Poster */}
                  <Link href={href} className="shrink-0">
                    <img
                      src={item.cover || fallbackCover(item.movieId)}
                      alt={item.title || ''}
                      className="w-[80px] h-[110px] md:w-[100px] md:h-[140px] object-cover rounded-lg"
                      loading="lazy"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <Link
                        href={href}
                        className="font-medium text-sm md:text-base hover:text-[var(--accent)] transition-colors line-clamp-2 no-underline"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {item.title || '未知标题'}
                      </Link>
                      <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {item.year && <span>{item.year}</span>}
                        {item.rating && (
                          <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                            ★ {Number(item.rating).toFixed(1)}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-xs" style={{
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-secondary)',
                        }}>
                          {item.contentType === 'movie' ? '电影' :
                           item.contentType === 'drama' ? '电视剧' :
                           item.contentType === 'variety' ? '综艺' :
                           item.contentType === 'anime' ? '动漫' :
                           item.contentType === 'short_drama' ? '短剧' : item.contentType}
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleRemove(item)}
                        disabled={removing === item.id}
                        className="px-3 py-1 rounded-lg text-xs font-medium border transition-colors opacity-0 group-hover:opacity-100"
                        style={{
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-muted)',
                        }}
                        title="从片单移除"
                      >
                        {removing === item.id ? '移除中...' : '移除'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => loadList(p)}
            />
          )}
        </>
      )}
    </div>
  );
}
