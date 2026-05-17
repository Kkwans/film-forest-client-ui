'use client';

import { useRef, useMemo } from 'react';
import Link from 'next/link';
import MovieCard from '@/components/MovieCard';
import { useMovieStatuses } from '@/hooks/useMovieStatuses';

interface ContentItem {
  id: number;
  title: string;
  cover: string;
  year: number;
  region: string | string[];
  rating?: number;
  genre?: string[];
  status?: string;
  episodes?: number;
  duration?: number;
}

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

function HorizontalSection({ title, href, items, type, hasError }: { title: string; href: string; items: ContentItem[]; type: string; hasError?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };
  if (items.length === 0 && !hasError) return null;
  if (items.length === 0 && hasError) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <Link href={href} className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all text-accent">更多<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></Link>
        </div>
        <div className="flex items-center justify-center py-12 rounded-xl border border-border bg-card">
          <div className="text-center">
            <p className="text-4xl mb-2">😵</p>
            <p className="text-sm text-muted-foreground">数据加载失败</p>
            <Link href={href} className="text-xs text-accent mt-2 inline-block">去{title.replace(/热门|热播|最新|推荐/, '')}看看 →</Link>
          </div>
        </div>
      </section>
    );
  }

  const displayItems = items.slice(0, 12);
  const movieIds = useMemo(() => displayItems.map(i => i.id), [displayItems]);
  const statusMap = useMovieStatuses(movieIds, type);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground" >{title}</h2>
        <Link href={href} className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all text-accent" >
          更多
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      </div>

      {/* PC: grid 2 rows x 6 cols */}
      <div className="hidden md:grid grid-cols-6 gap-3">
        {displayItems.map((item) => (
          <MovieCard key={`${type}-${item.id}`} id={item.id} title={item.title} cover={item.cover} year={item.year} region={item.region} rating={item.rating} genre={item.genre} type={type} duration={item.duration} episodes={item.episodes} href={`/${type}/${item.id}`} movieStatus={statusMap[item.id] || null} />
        ))}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="md:hidden relative">
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
          {displayItems.map((item) => (
            <div key={`${type}-${item.id}`} className="flex-shrink-0 w-[120px] snap-start">
              <MovieCard id={item.id} title={item.title} cover={item.cover} year={item.year} region={item.region} rating={item.rating} genre={item.genre} type={type} duration={item.duration} episodes={item.episodes} href={`/${type}/${item.id}`} movieStatus={statusMap[item.id] || null} />
            </div>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, var(--bg-primary))' }} />
      </div>
    </section>
  );
}

/**
 * 跨类型推荐区域
 * 将多个类型的推荐内容混合展示，每个类型最多 3 条
 */
function RecommendSection({ title, icon, data, hasError }: {
  title: string;
  icon: string;
  data: Record<string, ContentItem[]>;
  hasError?: boolean;
}) {
  // 将各类型数据混合，每类型最多取 3 条
  const mixedItems = useMemo(() => {
    const items: Array<ContentItem & { type: string }> = [];
    for (const [type, typeItems] of Object.entries(data)) {
      for (const item of typeItems.slice(0, 3)) {
        items.push({ ...item, type });
      }
    }
    return items;
  }, [data]);

  if (mixedItems.length === 0 && !hasError) return null;

  if (mixedItems.length === 0 && hasError) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{icon}</span>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
        </div>
        <div className="flex items-center justify-center py-12 rounded-xl border border-border bg-card">
          <p className="text-sm text-muted-foreground">推荐数据加载中...</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>

      {/* PC: grid */}
      <div className="hidden md:grid grid-cols-6 gap-3">
        {mixedItems.slice(0, 12).map((item) => (
          <MovieCard
            key={`rec-${item.type}-${item.id}`}
            id={item.id}
            title={item.title}
            cover={item.cover}
            year={item.year}
            region={item.region}
            rating={item.rating}
            genre={item.genre}
            type={item.type}
            episodes={item.episodes}
            href={`/${item.type}/${item.id}`}
            movieStatus={null}
          />
        ))}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="md:hidden relative">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
          {mixedItems.slice(0, 12).map((item) => (
            <div key={`rec-${item.type}-${item.id}`} className="flex-shrink-0 w-[120px] snap-start">
              <MovieCard
                id={item.id}
                title={item.title}
                cover={item.cover}
                year={item.year}
                region={item.region}
                rating={item.rating}
                genre={item.genre}
                type={item.type}
                episodes={item.episodes}
                href={`/${item.type}/${item.id}`}
                movieStatus={null}
              />
            </div>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, var(--bg-primary))' }} />
      </div>
    </section>
  );
}

export default function HomeClient({ initialMovies, initialDramas, initialVarieties, initialAnimes, initialShorts, recommendHot, recommendLatest, errors }: {
  initialMovies: ContentItem[]; initialDramas: ContentItem[]; initialVarieties: ContentItem[]; initialAnimes: ContentItem[]; initialShorts: ContentItem[];
  recommendHot?: Record<string, ContentItem[]>;
  recommendLatest?: Record<string, ContentItem[]>;
  errors?: { movies?: boolean; dramas?: boolean; varieties?: boolean; animes?: boolean; shorts?: boolean; recommend?: boolean };
}) {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border" style={{ background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-card))' }}>
        <div className="relative px-6 py-6 md:px-16 md:py-14">
          <div className="max-w-2xl">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 bg-accent-light text-accent" >影视资源聚合平台</div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight text-foreground" >
              发现精彩<span className="text-accent" >影视世界</span>
            </h1>
            <p className="text-base md:text-lg mb-6 md:mb-8 text-secondary-foreground" >聚合全网优质影视资源，电影、剧集、综艺、动漫一网打尽</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/movie" className="inline-flex items-center justify-center px-6 py-3 rounded-full font-medium transition-colors text-sm text-white bg-accent">探索电影</Link>
              <Link href="/search" className="inline-flex items-center justify-center px-6 py-3 rounded-full font-medium transition-colors text-sm border border-border text-secondary-foreground" >搜索影视</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 推荐区域 */}
      {recommendHot && Object.keys(recommendHot).length > 0 && (
        <RecommendSection title="热门推荐" icon="🔥" data={recommendHot} hasError={errors?.recommend} />
      )}
      {recommendLatest && Object.keys(recommendLatest).length > 0 && (
        <RecommendSection title="最新更新" icon="🆕" data={recommendLatest} hasError={errors?.recommend} />
      )}

      {/* 分类列表 */}
      <HorizontalSection title="热门电影" href="/movie" items={initialMovies} type="movie" hasError={errors?.movies} />
      <HorizontalSection title="热播剧集" href="/drama" items={initialDramas} type="drama" hasError={errors?.dramas} />
      <HorizontalSection title="热门综艺" href="/variety" items={initialVarieties} type="variety" hasError={errors?.varieties} />
      <HorizontalSection title="最新动漫" href="/anime" items={initialAnimes} type="anime" hasError={errors?.animes} />
      <HorizontalSection title="短剧推荐" href="/short" items={initialShorts} type="short" hasError={errors?.shorts} />
    </div>
  );
}
