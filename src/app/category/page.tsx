'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { ArrowUpRight, Clapperboard, Mic2, RefreshCw, Sparkles, Smartphone, Tv } from 'lucide-react';
import { catalogApi } from '@/lib/api';

type CategoryKey = 'movie' | 'drama' | 'variety' | 'anime' | 'short';

interface CategoryDefinition {
  type: CategoryKey;
  label: string;
  eyebrow: string;
  description: string;
  href: string;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  className: string;
  iconClassName: string;
}

const CATEGORIES: CategoryDefinition[] = [
  {
    type: 'movie',
    label: '电影',
    eyebrow: 'FEATURE FILMS',
    description: '从长篇叙事到独立佳作，按年份、地区与标准题材发现新片。',
    href: '/movie',
    Icon: Clapperboard,
    className: 'md:col-span-3 bg-emerald-950 text-emerald-50',
    iconClassName: 'bg-emerald-300/15 text-emerald-200',
  },
  {
    type: 'drama',
    label: '剧集',
    eyebrow: 'SERIES',
    description: '持续更新的剧集目录，清晰呈现集数、进度与可用观看资源。',
    href: '/drama',
    Icon: Tv,
    className: 'md:col-span-3 bg-slate-900 text-slate-50',
    iconClassName: 'bg-sky-300/15 text-sky-200',
  },
  {
    type: 'variety',
    label: '综艺',
    eyebrow: 'VARIETY',
    description: '按期浏览访谈、真人秀与舞台节目。',
    href: '/variety',
    Icon: Mic2,
    className: 'md:col-span-2 bg-amber-50 text-amber-950 dark:bg-amber-950/45 dark:text-amber-50',
    iconClassName: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  {
    type: 'anime',
    label: '动漫',
    eyebrow: 'ANIMATION',
    description: '动画电影、番剧与多地区作品集中浏览。',
    href: '/anime',
    Icon: Sparkles,
    className: 'md:col-span-2 bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-50',
    iconClassName: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  },
  {
    type: 'short',
    label: '短剧',
    eyebrow: 'SHORT SERIES',
    description: '适合碎片时间的紧凑故事与短篇连载。',
    href: '/short',
    Icon: Smartphone,
    className: 'md:col-span-2 bg-violet-50 text-violet-950 dark:bg-violet-950/40 dark:text-violet-50',
    iconClassName: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  },
];

type CountData = Record<CategoryKey, number>;

const EMPTY_COUNTS: CountData = { movie: 0, drama: 0, variety: 0, anime: 0, short: 0 };

export default function CategoryPage() {
  const [counts, setCounts] = useState<CountData>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [failedTypes, setFailedTypes] = useState<CategoryKey[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailedTypes([]);

    void catalogApi.counts({ signal: controller.signal }).then((response) => {
      if (controller.signal.aborted) return;
      const data = response.data.data || EMPTY_COUNTS;
      setCounts({
        movie: Number(data.movie || 0),
        drama: Number(data.drama || 0),
        variety: Number(data.variety || 0),
        anime: Number(data.anime || 0),
        short: Number(data.short || 0),
      });
      setFailedTypes([]);
      setLoading(false);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setFailedTypes(CATEGORIES.map((category) => category.type));
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [reloadKey]);

  const knownTotal = useMemo(
    () => CATEGORIES.reduce((sum, category) => failedTypes.includes(category.type) ? sum : sum + counts[category.type], 0),
    [counts, failedTypes],
  );

  return (
    <div className="flex flex-col gap-7 md:gap-9">
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Explore the forest</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">选择一条观影路径</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary-foreground">五类内容使用同一套标准题材与真实资源数据。进入分类后可继续按年份、地区、题材与排序精细筛选。</p>
        </div>
        <div className="shrink-0 text-left md:text-right" aria-live="polite">
          <p className="text-xs text-muted-foreground">当前已上线</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-muted md:ml-auto" />
          ) : (
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{knownTotal.toLocaleString('zh-CN')} <span className="text-sm font-normal text-muted-foreground">部</span></p>
          )}
        </div>
      </header>

      {failedTypes.length > 0 && !loading && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-secondary-foreground">{failedTypes.length} 个分类的数量暂时不可用，分类入口仍可正常浏览。</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground hover:border-accent/40 hover:text-accent">
            <RefreshCw aria-hidden className="h-4 w-4" />重试统计
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {CATEGORIES.map((category) => {
          const failed = failedTypes.includes(category.type);
          return (
            <Link key={category.type} href={category.href} prefetch={false} className={`group relative min-h-56 overflow-hidden rounded-3xl p-6 no-underline shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${category.className}`}>
              <div className="absolute -right-12 -top-12 size-44 rounded-full border border-current opacity-[0.08]" />
              <div className="absolute -bottom-20 right-14 size-40 rounded-full border border-current opacity-[0.06]" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <span className={`grid size-12 place-items-center rounded-2xl ${category.iconClassName}`}>
                    <category.Icon aria-hidden className="h-5 w-5" />
                  </span>
                  <ArrowUpRight aria-hidden className="h-5 w-5 opacity-45 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-80" />
                </div>
                <div className="mt-auto pt-8">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-55">{category.eyebrow}</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight">{category.label}</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 opacity-70">{category.description}</p>
                  <p className="mt-4 text-xs font-medium tabular-nums opacity-65">
                    {loading ? '正在读取数量…' : failed ? '数量暂不可用' : `${counts[category.type].toLocaleString('zh-CN')} 部已上线内容`}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
