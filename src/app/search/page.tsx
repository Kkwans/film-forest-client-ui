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
  { label: '最新更新', value: 'latest' },
  { label: '上映时间', value: 'year' },
  { label: '豆瓣评分', value: 'douban' },
  { label: 'IMDB评分', value: 'imdb' },
  { label: '烂番茄评分', value: 'rt' },
];

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return text;
  const index = text.toLocaleLowerCase().indexOf(keyword.toLocaleLowerCase());
  if (index < 0) return text;
  return <>{text.slice(0, index)}<mark className="rounded bg-accent/20 px-0.5 text-inherit">{text.slice(index, index + keyword.length)}</mark>{text.slice(index + keyword.length)}</>;
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
  const sort = searchParams.get('sort') || 'latest';
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
    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`搜索请求失败: ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (currentRequest !== requestId.current) return;
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
  }, [q, selectedContentType, tagId, sort, sortDir, page, size, requestVersion]);

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
        <p className="mt-1 text-sm text-muted-foreground">支持五类内容、服务端排序与真实分页</p>
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
            placeholder="片名、演员或导演（按 / 快速聚焦）"
            className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-card px-4 text-foreground outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/15"
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
            value={selectedContentType || 'all'}
            options={[{ label: '全部类型', value: 'all' }, ...Object.values(CONTENT_TYPE_REGISTRY).map((config) => ({ label: config.label, value: config.code }))]}
            onChange={(value) => navigate({ typeFilter: value === 'all' ? null : value, tagId: null, page: 1 })}
          />
          <CustomSelect value={sort} options={SORT_OPTIONS} onChange={(value) => navigate({ sort: value, page: 1 })} />
          <SortDirButton direction={sortDir} onToggle={() => navigate({ sortDir: sortDir === 'desc' ? 'asc' : 'desc', page: 1 })} />
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
            {selectedContentType && <button type="button" onClick={() => navigate({ typeFilter: null, tagId: null, page: 1 })} className="rounded-xl border border-accent px-4 py-2 text-xs font-medium text-accent">搜索全部类型</button>}
          </div>
        </div>
      ) : (
        <div className={`grid gap-3 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
          {data.records.map((item) => {
            const type = normalizeContentType(item.type);
            const config = getContentTypeConfig(type);
            const status = statuses[contentStatusKey(type, item.id)];
            const statusConfig = getStatusConfig(status?.listType);
            return (
              <Link key={`${type}-${item.id}`} href={`/${config.route}/${item.id}`} prefetch={false} className="flex gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-accent/40 sm:gap-4">
                <SearchPoster item={item} type={type} />
                <div className="min-w-0 flex-1 py-1">
                  <div className="flex items-start justify-between gap-3"><h2 className="text-pretty font-semibold leading-6 text-foreground"><Highlight text={item.title} keyword={q} /></h2><span className="shrink-0 rounded-lg bg-background px-2 py-1 text-[11px] text-muted-foreground">{config.label}</span></div>
                  <p className="mt-2 text-xs text-muted-foreground">{[item.year, ...parseJsonArr(item.region)].filter(Boolean).join(' · ')}</p>
                  {item.genre && <p className="mt-2 text-xs text-secondary-foreground">{parseJsonArr(item.genre).slice(0, 4).join(' / ')}</p>}
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
