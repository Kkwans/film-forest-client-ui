'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clapperboard, RefreshCw } from 'lucide-react';
import { relatedApi, type RelatedItem } from '@/lib/api';
import MovieCard from '@/components/MovieCard';
import { contentStatusKey, useContentStatuses } from '@/hooks/useMovieStatuses';

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
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const statusQueries = useMemo(
    () => items.map((item) => ({ contentType: item.type, contentId: item.id })),
    [items],
  );
  const statusMap = useContentStatuses(statusQueries);

  useEffect(() => {
    if (!contentId || !contentType) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    void relatedApi
      .get(contentType, contentId, limit, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        const data = res.data?.data;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setItems([]);
        setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [contentType, contentId, limit, retryKey]);

  if (!loading && !loadError && items.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Clapperboard aria-hidden className="h-5 w-5 text-accent" />
        <span>相关推荐</span>
      </h2>

      {loadError ? (
        <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">相关推荐加载失败</p>
            <p className="mt-1 text-xs text-muted-foreground">当前内容不受影响，可以稍后重试。</p>
          </div>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            重新加载
          </button>
        </div>
      ) : loading ? (
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
            <MovieCard
              key={`${item.type}-${item.id}`}
              id={item.id}
              title={item.title}
              cover={item.posterUrl}
              year={item.year}
              region={item.region}
              rating={item.scoreDouban}
              type={item.type}
              genre={item.genre}
              duration={item.duration}
              episodes={item.totalEpisode}
              href={`${getTypePath(item.type)}/${item.id}`}
              movieStatus={statusMap[contentStatusKey(item.type, item.id)] || null}
            />
          ))}
        </div>
      )}
    </section>
  );
}
