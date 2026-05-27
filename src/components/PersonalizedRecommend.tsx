'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import MovieCard from '@/components/MovieCard';
import { usePlayHistoryStore } from '@/stores/playHistoryStore';
import { recommendApi, type RecommendItem } from '@/lib/api';
import { parseGenre } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  movie: '电影',
  drama: '剧集',
  variety: '综艺',
  anime: '动漫',
  short_drama: '短剧',
};

const TYPE_HREF: Record<string, string> = {
  movie: '/movie',
  drama: '/drama',
  variety: '/variety',
  anime: '/anime',
  short_drama: '/short',
};

interface ContentItem {
  id: number;
  title: string;
  cover: string;
  year: number;
  region: string | string[];
  rating?: number;
  genre?: string[];
  episodes?: number;
}

/**
 * 个性化推荐组件
 * 基于用户播放历史推荐相关内容
 */
export default function PersonalizedRecommend() {
  const history = usePlayHistoryStore((s) => s.history);
  const [items, setItems] = useState<RecommendItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 从历史中提取已看过的 ID
  const excludeIds = useMemo(() => {
    const ids = new Set<number>();
    for (const h of history) {
      ids.add(h.contentId);
    }
    return Array.from(ids).join(',');
  }, [history]);

  useEffect(() => {
    // 不够历史数据时跳过
    if (history.length < 3) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 从历史中提取偏好类型
    const typeCount: Record<string, number> = {};
    for (const h of history) {
      typeCount[h.contentType] = (typeCount[h.contentType] || 0) + 1;
    }
    const topTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    // 构造推荐请求参数
    // 用 topTypes 作为 hint（传给后端的 genres 参数留空，让后端按评分推荐）
    // 但排除已看过的
    recommendApi
      .personalized({
        excludeIds,
        limit: 12,
      })
      .then((res) => {
        const data = res.data?.data;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .then(() => setLoading(false));
  }, [history.length, excludeIds]);

  // 不够历史时隐藏
  if (!loading && history.length < 3) return null;
  if (!loading && items.length === 0) return null;

  const mapItem = (item: RecommendItem): ContentItem => ({
    id: item.id,
    title: item.title,
    cover: item.posterUrl || '',
    year: item.year || 0,
    region: item.region || '',
    rating: item.scoreDouban || undefined,
    genre: item.genre ? parseGenre(item.genre) : undefined,
    episodes: item.totalEpisode || undefined,
  });

  return (
    <section className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">✨</span>
          <h2 className="text-xl font-bold text-foreground section-accent-line pb-2">
            猜你喜欢
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">基于你的观影偏好</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 animate-pulse">
              <div className="aspect-[2/3] rounded-xl bg-muted" />
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-2 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* PC: grid */}
          <div className="hidden md:grid grid-cols-6 gap-3.5">
            {items.map((item, idx) => {
              const ci = mapItem(item);
              return (
                <div key={`personalized-${item.type}-${item.id}`} className={`animate-fade-in-up stagger-${Math.min(idx + 1, 12)}`}>
                  <MovieCard
                    id={ci.id}
                    title={ci.title}
                    cover={ci.cover}
                    year={ci.year}
                    region={ci.region}
                    rating={ci.rating}
                    genre={ci.genre}
                    type={item.type}
                    episodes={ci.episodes}
                    href={`/${item.type === 'short_drama' ? 'short' : item.type}/${ci.id}`}
                    movieStatus={null}
                  />
                </div>
              );
            })}
          </div>

          {/* Mobile: horizontal scroll */}
          <div className="md:hidden relative">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
              {items.map((item) => {
                const ci = mapItem(item);
                return (
                  <div key={`personalized-m-${item.type}-${item.id}`} className="flex-shrink-0 w-[120px] snap-start">
                    <MovieCard
                      id={ci.id}
                      title={ci.title}
                      cover={ci.cover}
                      year={ci.year}
                      region={ci.region}
                      rating={ci.rating}
                      genre={ci.genre}
                      type={item.type}
                      episodes={ci.episodes}
                      href={`/${item.type === 'short_drama' ? 'short' : item.type}/${ci.id}`}
                      movieStatus={null}
                    />
                  </div>
                );
              })}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, var(--bg-primary))' }} />
          </div>
        </>
      )}
    </section>
  );
}
