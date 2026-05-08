// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import { listApi, type UserList, type UserListItem } from '@/lib/userApi';
import Pagination from '@/components/Pagination';
import MovieCard from '@/components/MovieCard';

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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {items.map((item) => {
              const route = contentTypeRoute[item.contentType] || '/movie';
              return (
                <div key={item.id} className="relative group">
                  <MovieCard
                    id={item.movieId}
                    title={item.title}
                    cover={item.cover}
                    year={item.year}
                    rating={item.rating}
                    type={item.contentType}
                    href={`${route}/${item.movieId}`}
                  />
                  {/* Remove button overlay */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemove(item);
                    }}
                    disabled={removing === item.id}
                    className="absolute top-1 left-1 z-20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.9)',
                      color: '#fff',
                    }}
                    title="从片单移除"
                  >
                    ✕
                  </button>
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
