'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { relatedApi, type RelatedItem } from '@/lib/api';
import LazyImage from '@/components/ui/lazy-image';

/** 获取内容类型对应的路由路径 */
function getTypePath(type: string): string {
  const map: Record<string, string> = {
    movie: '/movie',
    drama: '/drama',
    anime: '/anime',
    variety: '/variety',
    short_drama: '/short',
  };
  return map[type] || `/${type}`;
}

/** 相关推荐区域 */
export default function RelatedSection({
  contentType,
  contentId,
  limit = 6,
}: {
  contentType: string;
  contentId: number;
  limit?: number;
}) {
  const [items, setItems] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contentId || !contentType) return;
    setLoading(true);
    relatedApi
      .get(contentType, contentId, limit)
      .then((res) => {
        const data = res.data?.data;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .then(() => setLoading(false));
  }, [contentType, contentId, limit]);

  if (!loading && items.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <span>🎬</span>
        <span>相关推荐</span>
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 animate-pulse">
              <div className="aspect-[2/3] rounded-xl bg-muted" />
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-2 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {items.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={`${getTypePath(item.type)}/${item.id}`}
              className="group block no-underline"
              prefetch={true}
            >
              <div className="rounded-xl overflow-hidden border card-hover flex flex-col"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                }}
              >
                {/* 海报 */}
                <div className="relative aspect-[2/3] overflow-hidden">
                  <LazyImage
                    src={item.posterUrl || `https://picsum.photos/seed/r${item.id}/300/450`}
                    alt={item.title}
                    className="rounded-none"
                    imgClassName="img-zoom"
                    placeholder="blur"
                    aspectRatio={null}
                    fallbackSrc={`https://picsum.photos/seed/r${item.id}/300/450`}
                    rootMargin="300px"
                  />
                  {item.scoreDouban != null && item.scoreDouban > 0 && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-xs font-bold text-white bg-amber-500/90">
                      {item.scoreDouban.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* 信息 */}
                <div className="p-2 flex flex-col gap-0.5" style={{ minHeight: '56px' }}>
                  <p className="font-medium text-xs truncate group-hover:text-[var(--accent)] transition-colors">
                    {item.title}
                  </p>
                  {item.year ? (
                    <span className="text-[10px] text-muted-foreground">{item.year}</span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
