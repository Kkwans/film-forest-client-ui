'use client';

import { Suspense, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import LazyImage from '@/components/ui/lazy-image';
import Pagination from '@/components/Pagination';
import SortDirButton from '@/components/SortDirButton';
import TagFilter from '@/components/TagFilter';
import {
  CONTENT_TYPE_REGISTRY,
  type ContentType,
  getContentTypeConfig,
  getStatusConfig,
  normalizeContentType,
  parseJsonArr,
} from '@/lib/contentConstants';
import { parseRegion } from '@/lib/utils';
import { contentStatusKey, useContentStatuses } from '@/hooks/useMovieStatuses';
import { usePosterUrl } from '@/hooks/usePosterUrl';

interface SearchResult {
  id: number;
  type: string;
  title: string;
  cover?: string;
  year?: number;
  rating?: number;
  summary?: string;
  genre?: string;
  region?: string;
  alias?: string | string[];
  director?: string | string[];
  writer?: string | string[];
  actor?: string | string[];
  releaseDate?: string;
  matchedFields?: string[] | string;
}

interface SearchPageData {
  records: SearchResult[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

interface HotSearchItem {
  title: string;
  searchCount?: number;
}

const SORT_OPTIONS = [
  { label: '最相关', value: 'relevance' },
  { label: '最近更新', value: 'latest' },
  { label: '评分最高', value: 'rating' },
];
const REGIONS = ['大陆', '美国', '日本', '韩国', '香港', '台湾', '英国', '法国', '德国', '印度', '泰国'];
const RESOURCE_OPTIONS = [
  { label: '全部资源状态', value: 'all' },
  { label: '有可用资源', value: 'true' },
  { label: '暂无可用资源', value: 'false' },
];

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return text;
  const index = text.toLocaleLowerCase().indexOf(keyword.toLocaleLowerCase());
  if (index < 0) return text;
  return <>{text.slice(0, index)}<mark className="rounded bg-accent/20 px-0.5 text-inherit">{text.slice(index, index + keyword.length)}</mark>{text.slice(index + keyword.length)}</>;
}

function valuesOf(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === 'string' && entry.trim()).map((entry) => entry.trim());
  return parseJsonArr(value);
}

const MATCHED_FIELD_LABELS: Record<string, string> = {
  title: '标题', alias: '别名', director: '导演', writer: '编剧', actor: '主演', genre: '类型', year: '上映年份', region: '地区', language: '语言',
};

function matchedFieldLabels(value: string[] | string | undefined): string[] {
  const fields = Array.isArray(value) ? value : parseJsonArr(value);
  return fields.map((field) => MATCHED_FIELD_LABELS[field] || field).filter(Boolean);
}

function isContentType(value: string): value is ContentType {
  return Object.prototype.hasOwnProperty.call(CONTENT_TYPE_REGISTRY, value);
}

function SearchPoster({ item, type }: { item: SearchResult; type: ContentType }) {
  const poster = usePosterUrl(type, item.id, item.cover);
  return (
    <LazyImage
      src={poster}
      fallbackSrc="/poster-placeholder.svg"
      alt={item.title}
      className="h-[138px] w-[92px] shrink-0 rounded-xl sm:h-[162px] sm:w-[108px]"
      aspectRatio={null}
      rootMargin="240px"
    />
  );
}

function SearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const q = searchParams.get('q')?.trim() || '';
  const typeFilter = searchParams.get('typeFilter') || '';
  const selectedContentType = isContentType(typeFilter) ? typeFilter : null;
  const rawTagId = Number(searchParams.get('tagId'));
  const tagId = selectedContentType && Number.isSafeInteger(rawTagId) && rawTagId > 0 ? rawTagId : null;
  const rawYear = Number(searchParams.get('year'));
  const year = Number.isSafeInteger(rawYear) && rawYear >= 1888 && rawYear <= 9999 ? rawYear : null;
  const region = searchParams.get('region')?.trim() || '';
  const rawResourceFilter = searchParams.get('hasResource');
  const hasResource = rawResourceFilter === 'true' || rawResourceFilter === 'false' ? rawResourceFilter : 'all';
  const rawSort = searchParams.get('sort');
  const sort = SORT_OPTIONS.some((option) => option.value === rawSort) ? rawSort! : 'relevance';
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const size = Math.min(100, Math.max(1, Number(searchParams.get('size')) || 20));
  const [input, setInput] = useState(q);
  const [data, setData] = useState<SearchPageData>({ records: [], total: 0, size, current: page, pages: 0 });
  const [loading, setLoading] = useState(Boolean(q));
  const [error, setError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [hot, setHot] = useState<HotSearchItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const navigate = (updates: Record<string, string | number | null>, mode: 'push' | 'replace' = 'push') => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    }
    const href = `${pathname}?${next.toString()}`;
    startTransition(() => mode === 'replace' ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false }));
  };

  const saveHistory = (keyword: string) => {
    const normalized = keyword.trim();
    if (!normalized) return;
    setHistory((previous) => {
      const next = [normalized, ...previous.filter((item) => item !== normalized)].slice(0, 10);
      localStorage.setItem('search_history', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => setInput(q), [q]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('search_history') || '[]') as unknown;
      if (Array.isArray(stored)) setHistory(stored.filter((item): item is string => typeof item === 'string').slice(0, 10));
    } catch { /* ignore damaged local history */ }
    const controller = new AbortController();
    fetch('/api/search/hot', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`热门搜索请求失败: ${response.status}`);
        return response.json();
      })
      .then((payload) => setHot(Array.isArray(payload?.data) ? payload.data : []))
      .catch((reason) => { if (reason?.name !== 'AbortError') setHot([]); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(input.trim())}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`搜索建议请求失败: ${response.status}`);
          return response.json();
        })
        .then((payload) => setSuggestions(Array.isArray(payload?.data) ? payload.data : []))
        .catch((reason) => { if (reason?.name !== 'AbortError') setSuggestions([]); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [input]);

  useEffect(() => {
    if (!q) {
      setData({ records: [], total: 0, size, current: 1, pages: 0 });
      setLoading(false);
      setError(false);
      return;
    }
    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ keyword: q, page: String(page), size: String(size), sort, sortDir });
    if (selectedContentType) params.set('typeFilter', selectedContentType);
    if (tagId) params.set('tagId', String(tagId));
    if (year) params.set('year', String(year));
    if (region) params.set('region', region);
    if (hasResource !== 'all') params.set('hasResource', hasResource);
    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`搜索请求失败: ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (currentRequest !== requestId.current) return;
        if (payload?.code !== 200) throw new Error(payload?.message || '搜索请求失败');
        const next = payload?.data || {};
        setData({
          records: Array.isArray(next.records) ? next.records : [],
          total: Number(next.total || 0),
          size: Number(next.size || size),
          current: Number(next.current || page),
          pages: Number(next.pages || 0),
        });
      })
      .catch((reason) => {
        if (reason?.name === 'AbortError' || currentRequest !== requestId.current) return;
        setData({ records: [], total: 0, size, current: page, pages: 0 });
        setError(true);
      })
      .finally(() => { if (currentRequest === requestId.current) setLoading(false); });
    return () => controller.abort();
  }, [q, selectedContentType, tagId, year, region, hasResource, sort, sortDir, page, size, requestVersion]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  }, []);

  const visibleSuggestions = input.trim() ? suggestions : [...history, ...hot.map((item) => item.title)]
    .filter((item, index, all) => item && all.indexOf(item) === index)
    .slice(0, 10);
  const statusQueries = useMemo(
    () => data.records.map((item) => ({ contentType: item.type, contentId: item.id })),
    [data.records],
  );
  const statuses = useContentStatuses(statusQueries);
  const activeFilterCount = [selectedContentType, tagId, year, region, hasResource === 'all' ? null : hasResource]
    .filter(Boolean).length;

  const submit = (keyword: string) => {
    const normalized = keyword.trim();
    if (!normalized) return;
    setInput(normalized);
    setSuggestions([]);
    setActiveSuggestion(-1);
    saveHistory(normalized);
    navigate({ q: normalized, page: 1 }, 'push');
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6" aria-busy={loading || isPending}>
      <div>
        <h1 className="text-2xl font-bold text-foreground">全站搜索</h1>
        <p className="mt-1 text-sm text-muted-foreground">按标题、别名、主创、年份、题材和内容类型查找五类影视</p>
      </div>

      <div className="relative">
        <form onSubmit={(event) => { event.preventDefault(); submit(input); }} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => { setInput(event.target.value); setActiveSuggestion(-1); }}
            onFocus={() => { setFocused(true); setActiveSuggestion(-1); }}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && visibleSuggestions.length) { event.preventDefault(); setActiveSuggestion((value) => (value + 1) % visibleSuggestions.length); }
              if (event.key === 'ArrowUp' && visibleSuggestions.length) { event.preventDefault(); setActiveSuggestion((value) => value <= 0 ? visibleSuggestions.length - 1 : value - 1); }
              if (event.key === 'Enter' && activeSuggestion >= 0) { event.preventDefault(); submit(visibleSuggestions[activeSuggestion]); }
              if (event.key === 'Escape') { setSuggestions([]); setActiveSuggestion(-1); inputRef.current?.blur(); }
            }}
            placeholder="片名、别名、主创、年份或题材（按 / 快速聚焦）"
            className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-card px-4 text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={visibleSuggestions.length > 0}
            aria-activedescendant={activeSuggestion >= 0 ? `search-option-${activeSuggestion}` : undefined}
          />
          <button type="submit" className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover sm:px-6">
            <SearchIcon className="size-4" aria-hidden /><span className="hidden sm:inline">搜索</span>
          </button>
        </form>
        {visibleSuggestions.length > 0 && focused && (
          <div id="search-suggestions" className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl" role="listbox">
            {visibleSuggestions.map((suggestion, index) => (
              <button
                id={`search-option-${index}`}
                key={`${suggestion}-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeSuggestion}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => submit(suggestion)}
                className={`block w-full px-4 py-2.5 text-left text-sm ${index === activeSuggestion ? 'bg-accent-light text-accent' : 'text-secondary-foreground hover:bg-background'}`}
              >{suggestion}</button>
            ))}
          </div>
        )}
      </div>

      <section className="rounded-2xl border border-border bg-card/70 p-3 sm:p-4" aria-label="搜索筛选与排序">
        <div className="flex flex-wrap items-center gap-2">
          <CustomSelect
            ariaLabel="搜索内容类型"
            value={selectedContentType || 'all'}
            options={[{ label: '全部类型', value: 'all' }, ...Object.values(CONTENT_TYPE_REGISTRY).map((config) => ({ label: config.label, value: config.code }))]}
            onChange={(value) => navigate({ typeFilter: value === 'all' ? null : value, tagId: null, page: 1 })}
          />
          <form
            key={year || 'all-years'}
            className="flex h-8 overflow-hidden rounded-lg border border-border bg-card"
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get('year');
              navigate({ year: value ? String(value) : null, page: 1 });
            }}
          >
            <input
              aria-label="上映年份"
              name="year"
              type="number"
              min="1888"
              max="9999"
              defaultValue={year || ''}
              placeholder="年份"
              className="w-[4.75rem] bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="border-l border-border px-2 text-xs font-medium text-secondary-foreground hover:text-accent">应用</button>
          </form>
          <CustomSelect
            ariaLabel="搜索地区"
            value={region || 'all'}
            options={[{ label: '全部地区', value: 'all' }, ...REGIONS.map((item) => ({ label: item, value: item }))]}
            onChange={(value) => navigate({ region: value === 'all' ? null : value, page: 1 })}
          />
          <CustomSelect
            ariaLabel="资源状态"
            value={hasResource}
            options={RESOURCE_OPTIONS}
            onChange={(value) => navigate({ hasResource: value === 'all' ? null : value, page: 1 })}
          />
          <CustomSelect ariaLabel="搜索结果排序" value={sort} options={SORT_OPTIONS} onChange={(value) => navigate({ sort: value, sortDir: value === 'relevance' ? 'desc' : sortDir, page: 1 })} />
          {sort !== 'relevance' && <SortDirButton direction={sortDir} onToggle={() => navigate({ sortDir: sortDir === 'desc' ? 'asc' : 'desc', page: 1 })} />}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => navigate({ typeFilter: null, tagId: null, year: null, region: null, hasResource: null, page: 1 })}
              className="h-8 rounded-lg border border-border px-3 text-xs font-medium text-secondary-foreground hover:border-accent hover:text-accent"
            >
              清除筛选 · {activeFilterCount}
            </button>
          )}
          {q && <span className="ml-auto text-sm tabular-nums text-muted-foreground" aria-live="polite">{loading ? '搜索中…' : error ? '搜索失败' : `找到 ${data.total} 条`}</span>}
        </div>
        {selectedContentType && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">标准题材</p>
            <TagFilter contentType={selectedContentType} selectedTagId={tagId} onSelect={(nextTagId) => navigate({ tagId: nextTagId, page: 1 })} />
          </div>
        )}
      </section>

      {!q ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">热门搜索</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {hot.length ? hot.map((item) => <button key={item.title} onClick={() => submit(item.title)} className="rounded-full bg-background px-3 py-1.5 text-sm text-secondary-foreground">{item.title}{item.searchCount ? ` · ${item.searchCount}` : ''}</button>) : <span className="text-sm text-muted-foreground">暂无搜索热度数据</span>}
          </div>
          {history.length > 0 && <div className="mt-6"><div className="flex items-center justify-between"><h2 className="font-semibold text-foreground">搜索历史</h2><button onClick={() => { setHistory([]); localStorage.removeItem('search_history'); }} className="text-xs text-muted-foreground">清空</button></div><div className="mt-3 flex flex-wrap gap-2">{history.map((item) => <button key={item} onClick={() => submit(item)} className="rounded-full border border-border px-3 py-1.5 text-sm text-secondary-foreground">{item}</button>)}</div></div>}
        </div>
      ) : error ? (
        <div className="py-16 text-center"><p className="text-sm text-secondary-foreground">搜索服务暂时不可用</p><button onClick={() => setRequestVersion((version) => version + 1)} className="mt-3 text-sm font-medium text-accent">重新加载</button></div>
      ) : loading && data.records.length === 0 ? (
        <div className="grid gap-3" aria-label="正在加载搜索结果">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex gap-4 rounded-2xl border border-border bg-card p-3">
              <div className="h-[138px] w-[92px] shrink-0 animate-pulse rounded-xl bg-muted sm:h-[162px] sm:w-[108px]" />
              <div className="flex flex-1 flex-col gap-3 py-2"><span className="h-4 w-1/2 animate-pulse rounded bg-muted" /><span className="h-3 w-1/3 animate-pulse rounded bg-muted" /><span className="h-3 w-full animate-pulse rounded bg-muted" /><span className="h-3 w-2/3 animate-pulse rounded bg-muted" /></div>
            </div>
          ))}
        </div>
      ) : !loading && data.records.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-secondary-foreground">没有找到“{q}”</p>
          <p className="mt-2 text-xs text-muted-foreground">可尝试缩短关键词或减少筛选条件</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {tagId && <button type="button" onClick={() => navigate({ tagId: null, page: 1 })} className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-secondary-foreground">清除题材</button>}
            {activeFilterCount > 0 && <button type="button" onClick={() => navigate({ typeFilter: null, tagId: null, year: null, region: null, hasResource: null, page: 1 })} className="rounded-xl border border-accent px-4 py-2 text-xs font-medium text-accent">清除全部筛选</button>}
          </div>
        </div>
      ) : (
        <div className={`grid gap-3 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
          {data.records.map((item) => {
            const type = normalizeContentType(item.type);
            const config = getContentTypeConfig(type);
            const status = statuses[contentStatusKey(type, item.id)];
            const statusConfig = getStatusConfig(status?.listType);
            const aliases = valuesOf(item.alias);
            const directors = valuesOf(item.director);
            const writers = valuesOf(item.writer);
            const actors = valuesOf(item.actor);
            const genres = valuesOf(item.genre);
            const matched = matchedFieldLabels(item.matchedFields);
            return (
              <Link key={`${type}-${item.id}`} href={`/${config.route}/${item.id}`} prefetch={false} className="flex gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-accent/40 sm:gap-4">
                <SearchPoster item={item} type={type} />
                <div className="min-w-0 flex-1 py-1">
                  <div className="flex items-start justify-between gap-3"><h2 className="text-pretty font-semibold leading-6 text-foreground"><Highlight text={item.title} keyword={q} /></h2><span className="shrink-0 rounded-lg bg-background px-2 py-1 text-[11px] text-muted-foreground">{config.label}</span></div>
                  {aliases.length > 0 && <p className="mt-1 text-xs text-muted-foreground">别名：{aliases.join(' / ')}</p>}
                  <div className="mt-2 grid gap-1 text-xs text-secondary-foreground sm:grid-cols-2">
                    <p>导演：{directors.length > 0 ? directors.join(' / ') : '--'}</p>
                    <p>编剧：{writers.length > 0 ? writers.join(' / ') : '--'}</p>
                    <p>主演：{actors.length > 0 ? actors.join(' / ') : '--'}</p>
                    <p>类型：{genres.length > 0 ? genres.slice(0, 4).join(' / ') : '--'}</p>
                    <p>上映：{item.releaseDate || item.year || '--'}</p>
                    <p>地区：{parseRegion(item.region).join(' / ') || '--'}</p>
                  </div>
                  {matched.length > 0 && <p className="mt-2 text-xs font-medium text-accent">命中字段：{matched.join('、')}</p>}
                  {item.summary && <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground"><Highlight text={item.summary} keyword={q} /></p>}
                  {statusConfig && <span className="mt-3 inline-flex rounded-full px-2 py-1 text-[11px]" style={{ color: statusConfig.color, background: 'var(--bg-primary)' }}>{statusConfig.label}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {data.pages > 1 && <Pagination currentPage={page} totalPages={data.pages} onPageChange={(nextPage) => navigate({ page: nextPage })} />}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">加载搜索…</div>}><SearchContent /></Suspense>;
}
