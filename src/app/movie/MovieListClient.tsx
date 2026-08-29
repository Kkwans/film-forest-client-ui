'use client';

import { useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import FilterChip from '@/components/FilterChip';
import MovieCard from '@/components/MovieCard';
import Pagination from '@/components/Pagination';
import TagFilter from '@/components/TagFilter';
import { getContentSortOptions, getContentTypeConfig, type ContentType } from '@/lib/contentConstants';
import { parseContentListQuery } from '@/lib/contentListQuery';
import { useMovieStatuses } from '@/hooks/useMovieStatuses';
import { DECADES, LANGUAGES, REGIONS, getYearOptions } from '@/lib/filterOptions';

interface ContentItem {
  id: number;
  title: string;
  cover: string;
  year: number;
  region: string | string[];
  rating?: number;
  genre?: string[];
  duration?: number;
  episodes?: number;
}

interface Props {
  initialItems: ContentItem[];
  initialTotal: number;
  initialError: boolean;
  contentType: ContentType;
}

export default function MovieListClient({ initialItems, initialTotal, initialError, contentType }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const config = getContentTypeConfig(contentType);
  const years = useMemo(() => getYearOptions(), []);
  const sortOptions = useMemo(() => getContentSortOptions(contentType), [contentType]);
  const query = useMemo(
    () => parseContentListQuery(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );

  const updateUrl = (updates: Record<string, string | number | boolean | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    if (resetPage) next.set('page', '1');
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const resetFilters = () => {
    const next = new URLSearchParams();
    next.set('page', '1');
    next.set('size', String(query.size));
    next.set('sort', 'latest');
    next.set('sortDir', 'desc');
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const activeFilterCount = [query.genre, query.region, query.language, query.year, query.yearFrom, query.yearTo, query.tag]
    .filter(Boolean).length + (query.hasResource === undefined ? 0 : 1);
  const [filtersOpen, setFiltersOpen] = useState(activeFilterCount > 0);
  const movieIds = useMemo(() => initialItems.map((item) => item.id), [initialItems]);
  const statusMap = useMovieStatuses(movieIds, contentType);
  const totalPages = Math.ceil(initialTotal / query.size);

  return (
    <div className="flex flex-col gap-6" aria-busy={isPending}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{config.label}</h1>
          <p className="mt-1 text-xs text-muted-foreground">筛选条件已同步到地址栏，可复制、刷新或前进后退</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-secondary-foreground lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls="content-filters"
          >
            {filtersOpen ? <X className="size-3.5" aria-hidden /> : <SlidersHorizontal className="size-3.5" aria-hidden />}
            筛选{activeFilterCount > 0 ? ` ${activeFilterCount}` : ''}
          </button>
          {activeFilterCount > 0 && (
            <button type="button" onClick={resetFilters} className="h-11 rounded-xl border border-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent)]">
              清除筛选
            </button>
          )}
        </div>
      </div>

      <section id="content-filters" className={`${filtersOpen ? 'grid' : 'hidden'} gap-3 rounded-2xl border border-border bg-card/70 p-4 lg:grid`} aria-label="内容筛选">
        <div className="grid gap-2">
          <span className="text-xs font-semibold text-muted-foreground">题材</span>
          <TagFilter
            contentType={contentType}
            selectedTagId={query.tag || null}
            selectedLegacyGenre={query.genre || null}
            onSelect={(tag) => updateUrl({ tag, genre: null })}
            onSelectLegacyGenre={(genre) => updateUrl({ genre, tag: null })}
          />
        </div>

        <div className="grid gap-2">
          <span className="text-xs font-semibold text-muted-foreground">地区</span>
          <div className="filter-scroll-row">
            <FilterChip label="全部地区" active={!query.region} onClick={() => updateUrl({ region: null })} />
            {REGIONS.map((region) => (
              <FilterChip key={region} label={region} active={query.region === region} onClick={() => updateUrl({ region: query.region === region ? null : region })} />
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-xs font-semibold text-muted-foreground">语言</span>
          <div className="filter-scroll-row">
            <FilterChip label="全部语言" active={!query.language} onClick={() => updateUrl({ language: null })} />
            {LANGUAGES.map((language) => (
              <FilterChip key={language} label={language} active={query.language === language} onClick={() => updateUrl({ language: query.language === language ? null : language })} />
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-xs font-semibold text-muted-foreground">年份</span>
          <div className="filter-scroll-row items-center">
            <FilterChip label="全部年份" active={!query.year && !query.yearFrom && !query.yearTo} onClick={() => updateUrl({ year: null, yearFrom: null, yearTo: null })} />
            {years.map((year) => (
              <FilterChip key={year} label={String(year)} active={query.year === year} onClick={() => updateUrl({ year: query.year === year ? null : year, yearFrom: null, yearTo: null })} />
            ))}
            {DECADES.map((decade) => (
              <FilterChip
                key={decade.label}
                label={decade.label}
                active={!query.year && query.yearFrom === decade.from && query.yearTo === decade.to}
                onClick={() => updateUrl({
                  year: null,
                  yearFrom: query.yearFrom === decade.from && query.yearTo === decade.to ? null : decade.from,
                  yearTo: query.yearFrom === decade.from && query.yearTo === decade.to ? null : decade.to,
                })}
              />
            ))}
            <form
              key={`${query.yearFrom || ''}-${query.yearTo || ''}`}
              className="flex shrink-0 items-center gap-1"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                updateUrl({
                  year: null,
                  yearFrom: String(data.get('yearFrom') || ''),
                  yearTo: String(data.get('yearTo') || ''),
                });
              }}
            >
              <input aria-label="起始年份" name="yearFrom" type="number" min="1900" max="9999" defaultValue={query.yearFrom} placeholder="起始年" className="h-11 w-20 rounded-lg border border-border bg-background px-2 text-sm text-foreground sm:h-8" />
              <span className="text-sm text-muted-foreground">—</span>
              <input aria-label="结束年份" name="yearTo" type="number" min="1900" max="9999" defaultValue={query.yearTo} placeholder="结束年" className="h-11 w-20 rounded-lg border border-border bg-background px-2 text-sm text-foreground sm:h-8" />
              <button type="submit" className="h-11 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-secondary-foreground sm:h-8">应用</button>
            </form>
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-xs font-semibold text-muted-foreground">资源状态</span>
          <div className="filter-scroll-row">
            <FilterChip label="全部内容" active={query.hasResource === undefined} onClick={() => updateUrl({ hasResource: null })} />
            <FilterChip label="有可用资源" active={query.hasResource === true} onClick={() => updateUrl({ hasResource: true })} />
            <FilterChip label="暂无可用资源" active={query.hasResource === false} onClick={() => updateUrl({ hasResource: false })} />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {isPending ? '加载中…' : initialError ? '加载失败' : `共 ${initialTotal} 部`}
        </span>
        <div className="flex items-center gap-2">
          <CustomSelect
            value={String(query.size)}
            options={[12, 24, 36, 48].map((size) => ({ label: `${size} / 页`, value: String(size) }))}
            onChange={(value) => updateUrl({ size: value })}
            ariaLabel="每页显示数量"
          />
          <CustomSelect ariaLabel="内容排序方式" value={query.sort} options={sortOptions} onChange={(value) => updateUrl({ sort: value })} />
        </div>
      </div>

      {initialError ? (
        <div className="py-16 text-center">
          <p className="text-sm text-secondary-foreground">数据加载失败</p>
          <button type="button" onClick={() => router.refresh()} className="mt-3 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-medium text-white">重新加载</button>
        </div>
      ) : initialItems.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-secondary-foreground">暂无匹配内容</p>
          <p className="mt-1 text-xs text-muted-foreground">可清除部分筛选条件后重试</p>
        </div>
      ) : (
        <div className={`grid min-h-[60vh] grid-cols-2 items-stretch gap-3 transition-opacity sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
          {initialItems.map((item) => (
            <MovieCard
              key={item.id}
              id={item.id}
              title={item.title}
              cover={item.cover}
              year={item.year}
              region={item.region}
              rating={item.rating}
              genre={item.genre}
              type={contentType}
              duration={item.duration}
              episodes={item.episodes}
              href={`/${config.route}/${item.id}`}
              movieStatus={statusMap[item.id] || null}
            />
          ))}
        </div>
      )}

      {!initialError && totalPages > 1 && (
        <Pagination
          currentPage={query.page}
          totalPages={totalPages}
          onPageChange={(page) => {
            updateUrl({ page }, false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}
    </div>
  );
}
