'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock3, FolderHeart, RefreshCw, Star, Tag } from 'lucide-react';
import { profileApi, type ProfileFacet, type ProfileOverview, type ProfileOverviewItem } from '@/lib/userApi';
import { cleanTitle as cleanTitleUtil, formatRelativeTime, parseRegion } from '@/lib/utils';
import { parseJsonArr } from '@/lib/contentConstants';
import { formatWatchedAt } from '@/lib/uiContracts';
import { GenreTags, RatingBadge, TypeBadge } from '@/components/ContentShared';
import LazyImage from '@/components/ui/lazy-image';
import { usePosterUrl } from '@/hooks/usePosterUrl';
import ContinueWatching from '@/components/ContinueWatching';

const contentTypeRoute: Record<string, string> = {
  movie: '/movie',
  drama: '/drama',
  variety: '/variety',
  anime: '/anime',
  short_drama: '/short',
};

function OverviewItemCard({ item, showListName = false }: { item: ProfileOverviewItem; showListName?: boolean }) {
  const route = contentTypeRoute[item.contentType] || '/movie';
  const title = cleanTitleUtil(item.title) || '未知标题';
  const posterUrl = usePosterUrl(item.contentType, item.movieId, item.cover);
  const genres = parseJsonArr(item.genre);
  const regions = parseRegion(item.region);
  const timestamp = item.watchedAt || item.addedAt;

  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-3 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[var(--shadow-md)]">
      <Link href={`${route}/${item.movieId}`} prefetch={false} className="flex min-w-0 gap-3 no-underline" aria-label={`查看《${title}》详情`}>
        <div className="relative h-28 w-[4.75rem] shrink-0 overflow-hidden rounded-xl">
          <LazyImage src={posterUrl} alt={title} className="h-full rounded-xl" aspectRatio={null} fallbackSrc="/poster-placeholder.svg" rootMargin="160px" />
          {item.rating != null && Number(item.rating) > 0 && <span className="absolute bottom-1 left-1"><RatingBadge score={Number(item.rating)} /></span>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <div className="flex min-w-0 items-start justify-between gap-2"><h3 className="min-w-0 truncate text-sm font-semibold text-foreground group-hover:text-accent" title={title}>{title}</h3><ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" /></div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground"><TypeBadge contentType={item.contentType} size="xs" />{item.year && <span>{item.year}</span>}{regions.length > 0 && <span className="min-w-0 truncate">{regions.join(' / ')}</span>}{item.duration && <span>{item.duration} 分钟</span>}{item.totalEpisode && <span>{item.totalEpisode} 集</span>}</div>
          <div className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-2"><GenreTags genres={genres} max={2} /><span className="shrink-0 text-[10px] text-muted-foreground">{timestamp ? (item.listType === 'watched' ? formatWatchedAt(timestamp) : formatRelativeTime(timestamp)) : '--'}</span></div>
        </div>
      </Link>
      {showListName && item.listName && <p className="mt-2 truncate border-t border-border pt-2 text-[11px] text-muted-foreground">来自片单：{item.listName}</p>}
      {item.userRating != null && Number(item.userRating) > 0 && <p className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-xs font-semibold text-amber-700 dark:text-amber-400"><Star aria-hidden className="size-3.5 fill-current" />我的评分 {Number(item.userRating).toFixed(1)}</p>}
    </article>
  );
}

function PreviewSection({ title, description, items, href, showListName = false }: { title: string; description: string; items: ProfileOverviewItem[]; href: string; showListName?: boolean }) {
  if (items.length === 0) return null;
  return <section aria-labelledby={`${title}-title`}><div className="mb-3 flex items-end justify-between gap-4"><div><h2 id={`${title}-title`} className="text-base font-semibold text-foreground">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Link href={href} className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-semibold text-accent no-underline hover:text-accent-hover">查看全部<ArrowRight aria-hidden className="size-3.5" /></Link></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <OverviewItemCard key={`${item.contentType}-${item.movieId}-${item.id}`} item={item} showListName={showListName} />)}</div></section>;
}

function FacetSummary({ title, facets }: { title: string; facets: ProfileFacet[] }) {
  if (facets.length === 0) return null;
  return <section className="rounded-2xl border border-border bg-card p-4" aria-labelledby={`${title}-title`}><div className="flex items-center gap-2"><Tag aria-hidden className="size-4 text-accent" /><h2 id={`${title}-title`} className="text-sm font-semibold text-foreground">{title}</h2></div><div className="mt-3 flex flex-wrap gap-2">{facets.map((facet) => <span key={facet.value} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-secondary-foreground"><span>{facet.value}</span><span className="tabular-nums text-muted-foreground">{facet.count}</span></span>)}</div></section>;
}

export default function ProfileDashboard() {
  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await profileApi.getOverview({ signal });
      if (signal?.aborted) return;
      setOverview(response.data.data);
    } catch {
      if (!signal?.aborted) setError('个人概览加载失败，请重试');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading && !overview) return <div className="space-y-5" aria-busy="true" aria-label="正在加载个人概览"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div><div className="h-56 animate-pulse rounded-2xl bg-muted" /></div>;
  if (error && !overview) return <div role="alert" className="grid place-items-center rounded-2xl border border-border bg-card px-5 py-16 text-center"><RefreshCw aria-hidden className="size-8 text-muted-foreground" /><p className="mt-3 text-sm text-secondary-foreground">{error}</p><button type="button" onClick={() => void load()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"><RefreshCw aria-hidden className="size-4" />重新加载</button></div>;

  const data = overview || { stats: { listCount: 0, wantCount: 0, watchedCount: 0, customCount: 0 }, recentWatched: [], recentRatings: [], wantPreview: [], customListPreview: [], topGenres: [], topRegions: [] };
  const statLinks = [
    { label: '全部片单', value: data.stats.listCount, href: '/profile/lists', Icon: FolderHeart },
    { label: '想看', value: data.stats.wantCount, href: '/profile/lists?status=want_to_watch', Icon: Clock3 },
    { label: '看过', value: data.stats.watchedCount, href: '/profile/lists?status=watched', Icon: Star },
    { label: '自定义片单', value: data.stats.customCount, href: '/profile/lists', Icon: FolderHeart },
  ];

  return (
    <div className="space-y-7" aria-busy={loading}>
      {error && <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-secondary-foreground" role="status">{error}，仍显示上一次成功读取的内容。</p>}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="收藏统计">{statLinks.map(({ label, value, href, Icon }) => <Link key={label} href={href} className="group rounded-2xl border border-border bg-card p-4 no-underline transition-[border-color,box-shadow] hover:border-accent/35 hover:shadow-sm"><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{label}</span><Icon aria-hidden className="size-4 text-accent" /></div><p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{value}</p><span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">打开工作区<ArrowRight aria-hidden className="size-3" /></span></Link>)}</section>

      <ContinueWatching />

      <PreviewSection title="最近看过" description="最近标记为看过的内容" items={data.recentWatched} href="/profile/lists?status=watched" />
      <PreviewSection title="最近评分" description="你的评分与观后记录" items={data.recentRatings} href="/profile/lists?status=watched&sort=userRating" />
      <PreviewSection title="想看预览" description="下一部准备观看的内容" items={data.wantPreview} href="/profile/lists?status=want_to_watch" />
      <PreviewSection title="自定义片单预览" description="最近更新的主题收藏" items={data.customListPreview} href="/profile/lists" showListName />

      {(data.topGenres.length > 0 || data.topRegions.length > 0) && <div className="grid gap-3 md:grid-cols-2"><FacetSummary title="偏好题材" facets={data.topGenres} /><FacetSummary title="偏好地区" facets={data.topRegions} /></div>}

      {data.recentWatched.length === 0 && data.recentRatings.length === 0 && data.wantPreview.length === 0 && data.customListPreview.length === 0 && <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center"><FolderHeart aria-hidden className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 text-sm font-semibold text-foreground">从第一部收藏开始</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">浏览分类页，加入想看或建立自定义片单，个人主页会随着真实记录更新。</p><Link href="/category" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white no-underline hover:bg-accent-hover">浏览内容<ArrowRight aria-hidden className="size-4" /></Link></section>}
    </div>
  );
}
