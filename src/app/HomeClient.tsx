'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock3, Clapperboard, Flame, Search, type LucideIcon } from 'lucide-react';
import ContinueWatching from '@/components/ContinueWatching';
import MovieCard from '@/components/MovieCard';
import PersonalizedRecommend from '@/components/PersonalizedRecommend';
import LazyImage from '@/components/ui/lazy-image';
import { CONTENT_TYPE_REGISTRY, getContentTypeConfig, normalizeContentType } from '@/lib/contentConstants';
import { contentStatusKey, useContentStatuses } from '@/hooks/useMovieStatuses';
import { usePosterUrl } from '@/hooks/usePosterUrl';

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

function FeaturedStory({ item }: { item: MixedItem }) {
  const type = normalizeContentType(item.type);
  const config = getContentTypeConfig(type);
  const href = `/${config.route}/${item.id}`;
  const poster = usePosterUrl(type, item.id, item.cover);
  const region = Array.isArray(item.region) ? item.region[0] : item.region;

  return (
    <section className="home-feature relative isolate overflow-hidden rounded-[1.75rem] border border-border" aria-labelledby="home-feature-title">
      <div className="relative z-10 grid min-h-[25rem] items-center gap-8 px-6 py-9 sm:px-9 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-14 lg:py-12">
        <div className="max-w-3xl">
          <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-accent">
            <Clapperboard className="size-4" aria-hidden />
            今日片单焦点 · {config.label}
          </p>
          <h1 id="home-feature-title" className="max-w-[16ch] text-balance text-4xl font-extrabold leading-[1.06] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
            {item.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-secondary-foreground">
            {item.year > 0 && <span className="tabular-nums">{item.year}</span>}
            {region && <span>{region}</span>}
            {item.genre?.slice(0, 3).map((genre) => <span key={genre}>{genre}</span>)}
            {item.rating != null && <span className="font-semibold text-foreground">豆瓣 {item.rating.toFixed(1)}</span>}
          </div>
          <p className="mt-5 max-w-[58ch] text-pretty text-sm leading-7 text-secondary-foreground sm:text-base">
            从真实入库内容中挑选，进入详情即可查看完整简介、主创信息与当前可用资源。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={href} className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover">
              查看详情 <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/search" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card/80 px-5 text-sm font-semibold text-secondary-foreground hover:text-foreground">
              <Search className="size-4" aria-hidden /> 搜索片库
            </Link>
          </div>
        </div>

        <Link href={href} className="home-feature-poster group relative mx-auto block w-[min(66vw,15rem)] lg:w-[17rem]" aria-label={`查看《${item.title}》详情`}>
          <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-accent/10 blur-2xl" aria-hidden />
          <LazyImage
            src={poster}
            alt={item.title}
            className="aspect-[2/3] rounded-[1.35rem] border border-white/20 bg-card shadow-2xl"
            imgClassName="transition-transform duration-300 group-hover:scale-[1.025]"
            placeholder="skeleton"
            fallbackSrc="/poster-placeholder.svg"
            lazy={false}
          />
          <span className="absolute bottom-3 left-3 rounded-lg bg-black/65 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
            {config.label}
          </span>
        </Link>
      </div>
    </section>
  );
}

function EmptyHero() {
  return (
    <section className="home-feature relative isolate overflow-hidden rounded-[1.75rem] border border-border px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
      <div className="relative z-10 max-w-3xl">
        <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-accent">
          <Clapperboard className="size-4" aria-hidden />影视森林
        </p>
        <h1 className="text-balance text-4xl font-extrabold leading-[1.06] tracking-[-0.045em] text-foreground sm:text-5xl">把找片时间，留给真正想看的内容</h1>
        <p className="mt-5 max-w-[58ch] text-pretty leading-7 text-secondary-foreground">浏览电影、剧集、综艺、动漫和短剧，按题材、地区与年份筛出下一部想看的作品。</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/movie" className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">浏览电影 <ArrowRight className="size-4" aria-hidden /></Link>
          <Link href="/search" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card/80 px-5 text-sm font-semibold text-secondary-foreground hover:text-foreground"><Search className="size-4" aria-hidden />搜索片库</Link>
        </div>
      </div>
    </section>
  );
}

function RecommendSection({ title, description, icon: Icon, items }: {
  title: string;
  description: string;
  icon: LucideIcon;
  items: MixedItem[];
}) {
  const queries = useMemo(
    () => items.map((item) => ({ contentType: item.type, contentId: item.id })),
    [items],
  );
  const statuses = useContentStatuses(queries);

  if (items.length === 0) return null;
  return (
    <section aria-labelledby={`home-${title}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 place-items-center rounded-xl bg-accent-light text-accent" aria-hidden>
            <Icon className="size-[1.125rem]" />
          </span>
          <div>
            <h2 id={`home-${title}`} className="text-xl font-bold tracking-[-0.02em] text-foreground">{title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Link href="/category" className="hidden items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover sm:inline-flex">
          查看分类 <ArrowRight className="size-3.5" aria-hidden />
        </Link>
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
  const featured = hotItems[0] || latestItems[0];
  const featuredKey = featured ? `${featured.type}-${featured.id}` : null;
  const visibleHotItems = featuredKey
    ? hotItems.filter((item) => `${item.type}-${item.id}` !== featuredKey)
    : hotItems;

  return (
    <div className="flex flex-col gap-12">
      {featured ? <FeaturedStory item={featured} /> : <EmptyHero />}

      <ContinueWatching />
      <PersonalizedRecommend />
      {error && hotItems.length === 0 && latestItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-14 text-center text-sm text-muted-foreground">首页内容暂时无法加载，请稍后刷新</div>
      ) : (
        <>
          <RecommendSection title="大家正在看" description="跨分类汇总近期高热内容" icon={Flame} items={visibleHotItems} />
          <RecommendSection title="最近入库" description="按更新时间呈现最新可用内容" icon={Clock3} items={latestItems} />
        </>
      )}
    </div>
  );
}
