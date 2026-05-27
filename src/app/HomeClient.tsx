'use client';

import { useRef, useMemo } from 'react';
import Link from 'next/link';
import MovieCard from '@/components/MovieCard';
import ContinueWatching from '@/components/ContinueWatching';
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

/** 统计数字展示 */
function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg md:text-2xl font-bold text-accent">{value}</span>
      <span className="text-[10px] md:text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function HorizontalSection({ title, href, items, type, hasError, sectionIndex }: { title: string; href: string; items: ContentItem[]; type: string; hasError?: boolean; sectionIndex?: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };
  if (items.length === 0 && !hasError) return null;
  if (items.length === 0 && hasError) {
    return (
      <section className={`animate-fade-in-up ${sectionIndex ? `stagger-${Math.min(sectionIndex, 12)}` : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground section-accent-line pb-2">{title}</h2>
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
    <section className={`animate-fade-in-up ${sectionIndex ? `stagger-${Math.min(sectionIndex, 12)}` : ''}`}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-foreground section-accent-line pb-2">{title}</h2>
        <Link href={href} className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all text-accent group/link">
          更多
          <svg className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      </div>

      {/* PC: grid 2 rows x 6 cols */}
      <div className="hidden md:grid grid-cols-6 gap-3.5">
        {displayItems.map((item, idx) => (
          <div key={`${type}-${item.id}`} className={`animate-fade-in-up stagger-${Math.min(idx + 1, 12)}`}>
            <MovieCard id={item.id} title={item.title} cover={item.cover} year={item.year} region={item.region} rating={item.rating} genre={item.genre} type={type} duration={item.duration} episodes={item.episodes} href={`/${type}/${item.id}`} movieStatus={statusMap[item.id] || null} />
          </div>
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
 */
function RecommendSection({ title, icon, data, hasError, sectionIndex }: {
  title: string;
  icon: string;
  data: Record<string, ContentItem[]>;
  hasError?: boolean;
  sectionIndex?: number;
}) {
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
      <section className={`animate-fade-in-up ${sectionIndex ? `stagger-${Math.min(sectionIndex, 12)}` : ''}`}>
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
    <section className={`animate-fade-in-up ${sectionIndex ? `stagger-${Math.min(sectionIndex, 12)}` : ''}`}>
      <div className="flex items-center gap-2.5 mb-5">
        <span className="text-xl">{icon}</span>
        <h2 className="text-xl font-bold text-foreground section-accent-line pb-2">{title}</h2>
      </div>

      {/* PC: grid */}
      <div className="hidden md:grid grid-cols-6 gap-3.5">
        {mixedItems.slice(0, 12).map((item, idx) => (
          <div key={`rec-${item.type}-${item.id}`} className={`animate-fade-in-up stagger-${Math.min(idx + 1, 12)}`}>
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
      {/* Hero - Enhanced */}
      <section className="relative overflow-hidden rounded-2xl border border-border hero-gradient">
        {/* Floating decorative elements */}
        <div className="absolute top-4 right-8 w-20 h-20 rounded-full opacity-10 animate-float" style={{ background: 'var(--accent)' }} />
        <div className="absolute bottom-6 right-24 w-12 h-12 rounded-full opacity-[0.06] animate-float-delayed" style={{ background: 'var(--accent)' }} />
        <div className="absolute top-12 right-40 w-6 h-6 rounded-full opacity-[0.08] animate-float" style={{ background: 'var(--accent)', animationDelay: '1s' }} />

        <div className="relative px-6 py-8 md:px-16 md:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 bg-accent-light text-accent border border-accent/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              影视资源聚合平台
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight text-foreground tracking-tight">
              发现精彩<span className="text-accent">影视世界</span>
            </h1>
            <p className="text-base md:text-lg mb-3 text-secondary-foreground leading-relaxed">
              聚合全网优质影视资源，电影、剧集、综艺、动漫一网打尽
            </p>

            {/* Stats */}
            <div className="flex items-center gap-6 mb-6 md:mb-8">
              <StatBadge value="5大" label="内容分类" />
              <div className="w-px h-8 bg-border" />
              <StatBadge value="实时" label="热度推荐" />
              <div className="w-px h-8 bg-border" />
              <StatBadge value="免费" label="在线观看" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/movie" className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full font-semibold transition-all text-sm text-white bg-accent hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.97]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                探索电影
              </Link>
              <Link href="/search" className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full font-semibold transition-all text-sm border border-border text-secondary-foreground hover:bg-card hover:border-accent/30 active:scale-[0.97]">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                搜索影视
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 继续观看 */}
      <ContinueWatching />

      {/* 推荐区域 */}
      {recommendHot && Object.keys(recommendHot).length > 0 && (
        <RecommendSection title="热门推荐" icon="🔥" data={recommendHot} hasError={errors?.recommend} sectionIndex={1} />
      )}
      {recommendLatest && Object.keys(recommendLatest).length > 0 && (
        <RecommendSection title="最新更新" icon="🆕" data={recommendLatest} hasError={errors?.recommend} sectionIndex={2} />
      )}

      {/* 分类列表 */}
      <HorizontalSection title="热门电影" href="/movie" items={initialMovies} type="movie" hasError={errors?.movies} sectionIndex={3} />
      <HorizontalSection title="热播剧集" href="/drama" items={initialDramas} type="drama" hasError={errors?.dramas} sectionIndex={4} />
      <HorizontalSection title="热门综艺" href="/variety" items={initialVarieties} type="variety" hasError={errors?.varieties} sectionIndex={5} />
      <HorizontalSection title="最新动漫" href="/anime" items={initialAnimes} type="anime" hasError={errors?.animes} sectionIndex={6} />
      <HorizontalSection title="短剧推荐" href="/short" items={initialShorts} type="short" hasError={errors?.shorts} sectionIndex={7} />
    </div>
  );
}
