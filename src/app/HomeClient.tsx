'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import ContinueWatching from '@/components/ContinueWatching';
import MovieCard from '@/components/MovieCard';
import PersonalizedRecommend from '@/components/PersonalizedRecommend';
import { CONTENT_TYPE_REGISTRY, getContentTypeConfig, normalizeContentType } from '@/lib/contentConstants';
import { contentStatusKey, useContentStatuses } from '@/hooks/useMovieStatuses';

export interface HomeContentItem {
  id: number;
  title: string;
  cover: string;
  year: number;
  region: string | string[];
  rating?: number;
  genre?: string[];
  episodes?: number;
}

interface MixedItem extends HomeContentItem {
  type: string;
}

function roundRobin(data: Record<string, HomeContentItem[]>, limit = 12): MixedItem[] {
  const types = Object.keys(CONTENT_TYPE_REGISTRY);
  const result: MixedItem[] = [];
  for (let index = 0; result.length < limit; index += 1) {
    let appended = false;
    for (const type of types) {
      const item = data[type]?.[index];
      if (item && result.length < limit) {
        result.push({ ...item, type });
        appended = true;
      }
    }
    if (!appended) break;
  }
  return result;
}

function RecommendSection({ title, icon, items }: { title: string; icon: string; items: MixedItem[] }) {
  const queries = useMemo(
    () => items.map((item) => ({ contentType: item.type, contentId: item.id })),
    [items],
  );
  const statuses = useContentStatuses(queries);

  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-5 flex items-center gap-2.5">
        <span className="text-xl" aria-hidden>{icon}</span>
        <h2 className="section-accent-line pb-2 text-xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6">
        {items.map((item) => {
          const type = normalizeContentType(item.type);
          const config = getContentTypeConfig(type);
          return (
            <MovieCard
              key={`${type}-${item.id}`}
              id={item.id}
              title={item.title}
              cover={item.cover}
              year={item.year}
              region={item.region}
              rating={item.rating}
              genre={item.genre}
              type={type}
              episodes={item.episodes}
              href={`/${config.route}/${item.id}`}
              movieStatus={statuses[contentStatusKey(type, item.id)] || null}
            />
          );
        })}
      </div>
    </section>
  );
}

export default function HomeClient({ hot, latest, error }: {
  hot: Record<string, HomeContentItem[]>;
  latest: Record<string, HomeContentItem[]>;
  error: boolean;
}) {
  const hotItems = useMemo(() => roundRobin(hot), [hot]);
  const latestItems = useMemo(() => roundRobin(latest), [latest]);

  return (
    <div className="flex flex-col gap-10">
      <section className="hero-gradient relative overflow-hidden rounded-2xl border border-border">
        <div className="relative px-6 py-10 md:px-16 md:py-16">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-light px-3.5 py-1.5 text-xs font-semibold text-accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />影视资源聚合平台
            </div>
            <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl">
              发现精彩<span className="text-accent">影视世界</span>
            </h1>
            <p className="mb-7 text-base leading-relaxed text-secondary-foreground md:text-lg">电影、剧集、综艺、动漫与短剧，一次聚合，快速发现。</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/movie" className="rounded-full bg-accent px-7 py-3 text-center text-sm font-semibold text-white hover:bg-accent-hover">探索电影</Link>
              <Link href="/search" className="rounded-full border border-border px-7 py-3 text-center text-sm font-semibold text-secondary-foreground hover:bg-card">搜索影视</Link>
            </div>
          </div>
        </div>
      </section>

      <ContinueWatching />
      <PersonalizedRecommend />
      {error && hotItems.length === 0 && latestItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-14 text-center text-sm text-muted-foreground">首页内容暂时无法加载，请稍后刷新</div>
      ) : (
        <>
          <RecommendSection title="热门推荐" icon="🔥" items={hotItems} />
          <RecommendSection title="最新更新" icon="🆕" items={latestItems} />
        </>
      )}
    </div>
  );
}
