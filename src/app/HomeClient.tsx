// @ts-nocheck
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

function HorizontalSection({ title, href, items, type }: { title: string; href: string; items: ContentItem[]; type: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };
  if (items.length === 0) return null;

  const displayItems = items.slice(0, 12);
  const movieIds = useMemo(() => displayItems.map(i => i.id), [displayItems]);
  const statusMap = useMovieStatuses(movieIds, type);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground" >{title}</h2>
        <Link href={href} className="text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all bg-accent" >
          更多
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </Link>
      </div>

      {/* PC: grid 2 rows x 6 cols */}
      <div className="hidden md:grid grid-cols-6 gap-3">
        {displayItems.map((item) => (
          <MovieCard key={item.id} id={item.id} title={item.title} cover={item.cover} year={item.year} region={item.region} rating={item.rating} genre={item.genre} type={type} duration={item.duration} episodes={item.episodes} href={`/${type}/${item.id}`} movieStatus={statusMap[item.id] || null} />
        ))}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="md:hidden relative">
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory" style={{ WebkitOverflowScrolling: 'touch' }}>
          {displayItems.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-[120px] snap-start">
              <MovieCard id={item.id} title={item.title} cover={item.cover} year={item.year} region={item.region} rating={item.rating} genre={item.genre} type={type} duration={item.duration} episodes={item.episodes} href={`/${type}/${item.id}`} movieStatus={statusMap[item.id] || null} />
            </div>
          ))}
        </div>
        {/* Scroll hint gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, var(--bg-primary))' }} />
      </div>
    </section>
  );
}

export default function HomeClient({ initialMovies, initialDramas, initialVarieties, initialAnimes, initialShorts }: {
  initialMovies: ContentItem[]; initialDramas: ContentItem[]; initialVarieties: ContentItem[]; initialAnimes: ContentItem[]; initialShorts: ContentItem[];
}) {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border" style={{ background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-card))' }}>
        <div className="relative px-6 py-6 md:px-16 md:py-14">
          <div className="max-w-2xl">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 bg-accent-light text-accent" >影视资源聚合平台</div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight text-foreground" >
              发现精彩<span className="bg-accent" >影视世界</span>
            </h1>
            <p className="text-base md:text-lg mb-6 md:mb-8 text-secondary-foreground" >聚合全网优质影视资源，电影、剧集、综艺、动漫一网打尽</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/movie" className="inline-flex items-center justify-center px-6 py-3 rounded-full font-medium transition-colors text-sm text-white bg-accent">探索电影</Link>
              <Link href="/search" className="inline-flex items-center justify-center px-6 py-3 rounded-full font-medium transition-colors text-sm border border-border text-secondary-foreground" >搜索影视</Link>
            </div>
          </div>
        </div>
      </section>

      <HorizontalSection title="热门电影" href="/movie" items={initialMovies} type="movie" />
      <HorizontalSection title="热播剧集" href="/drama" items={initialDramas} type="drama" />
      <HorizontalSection title="热门综艺" href="/variety" items={initialVarieties} type="variety" />
      <HorizontalSection title="最新动漫" href="/anime" items={initialAnimes} type="anime" />
      <HorizontalSection title="短剧推荐" href="/short" items={initialShorts} type="short" />
    </div>
  );
}
