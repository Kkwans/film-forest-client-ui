'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import MovieCard from '@/components/MovieCard';
import { usePlayHistoryStore } from '@/stores/playHistoryStore';
import { recommendApi, type RecommendItem } from '@/lib/api';
import { parseGenre } from '@/lib/utils';
import { contentStatusKey, useContentStatuses } from '@/hooks/useMovieStatuses';

function topValues(values: string[], limit: number) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'))
    .slice(0, limit)
    .map(([value]) => value);
}

export default function PersonalizedRecommend() {
  const history = usePlayHistoryStore((state) => state.history);
  const [items, setItems] = useState<RecommendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const statusQueries = useMemo(() => items.map((item) => ({ contentType: item.type, contentId: item.id })), [items]);
  const statuses = useContentStatuses(statusQueries);

  const preferences = useMemo(() => {
    const genres = topValues(history.flatMap((item) => item.genres || []), 3);
    const regions = topValues(history.map((item) => item.region || ''), 1);
    const excludeKeys = Array.from(new Set(history.map((item) => `${item.contentType}:${item.contentId}`))).join(',');
    return { genres, region: regions[0], excludeKeys };
  }, [history]);

  useEffect(() => {
    if (history.length < 3) {
      setItems([]);
      setLoadError(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    void recommendApi.personalized({
      genres: preferences.genres.length > 0 ? preferences.genres.join(',') : undefined,
      region: preferences.region,
      excludeKeys: preferences.excludeKeys,
      limit: 12,
    }, { signal: controller.signal }).then((response) => {
      if (!controller.signal.aborted) setItems(Array.isArray(response.data.data) ? response.data.data : []);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setItems([]);
        setLoadError(true);
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [history.length, preferences, retryKey]);

  if (!loading && !loadError && items.length === 0) return null;

  return (
    <section className="animate-fade-in-up" aria-labelledby="personalized-title">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Sparkles aria-hidden className="h-5 w-5 text-accent" />
            <h2 id="personalized-title" className="text-xl font-bold text-foreground">猜你喜欢</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {preferences.genres.length > 0 ? `偏好题材：${preferences.genres.join('、')}` : '根据你的最近观看与高分内容推荐'}
          </p>
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">个性化推荐加载失败</p>
            <p className="mt-1 text-xs text-muted-foreground">其他首页内容不受影响，可以单独重试。</p>
          </div>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:border-accent/40 hover:text-accent"><RefreshCw aria-hidden className="h-4 w-4" />重新加载</button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6" aria-label="正在加载个性化推荐">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="flex animate-pulse flex-col gap-2"><div className="aspect-[2/3] rounded-xl bg-muted" /><div className="h-3 w-3/4 rounded bg-muted" /><div className="h-2 w-1/2 rounded bg-muted" /></div>
          ))}
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-6 gap-3.5 md:grid">
              {items.map((item) => (
                <MovieCard key={`personalized-${item.type}-${item.id}`} id={item.id} title={item.title} cover={item.posterUrl || ''} year={item.year || 0} region={item.region || ''} rating={item.scoreDouban || undefined} genre={item.genre ? parseGenre(item.genre) : undefined} type={item.type} episodes={item.totalEpisode || undefined} href={`/${item.type === 'short_drama' ? 'short' : item.type}/${item.id}`} movieStatus={statuses[contentStatusKey(item.type, item.id)] || null} />
            ))}
          </div>
          <div className="relative md:hidden">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {items.map((item) => (
                <div key={`personalized-mobile-${item.type}-${item.id}`} className="w-[124px] flex-shrink-0 snap-start">
                  <MovieCard id={item.id} title={item.title} cover={item.posterUrl || ''} year={item.year || 0} region={item.region || ''} rating={item.scoreDouban || undefined} genre={item.genre ? parseGenre(item.genre) : undefined} type={item.type} episodes={item.totalEpisode || undefined} href={`/${item.type === 'short_drama' ? 'short' : item.type}/${item.id}`} movieStatus={statuses[contentStatusKey(item.type, item.id)] || null} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
