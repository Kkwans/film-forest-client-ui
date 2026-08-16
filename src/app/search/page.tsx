'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import CustomSelect from '@/components/CustomSelect';
import LazyImage from '@/components/ui/lazy-image';
import Pagination from '@/components/Pagination';
import TagFilter from '@/components/TagFilter';
import { StatusIconButton, TypeBadge } from '@/components/ContentShared';
import {
  CONTENT_TYPE_REGISTRY,
  type ContentType,
  getContentTypeConfig,
  normalizeContentType,
  parseJsonArr,
} from '@/lib/contentConstants';
import { parseRegion } from '@/lib/utils';
import { contentStatusKey, useContentStatuses } from '@/hooks/useMovieStatuses';
import { usePosterUrl } from '@/hooks/usePosterUrl';
import { useUserStore } from '@/stores/userStore';

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
  updatedAt?: number | string;
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
  { label: '最相关', value: 'relevance', apiSort: 'relevance', defaultDir: 'desc' },
  { label: '评分最高', value: 'rating', apiSort: 'rating', defaultDir: 'desc' },
  { label: '上映时间', value: 'year', apiSort: 'year', defaultDir: 'desc' },
  { label: '数据更新时间', value: 'latest', apiSort: 'latest', defaultDir: 'desc' },
] as const;
type SortOptionValue = (typeof SORT_OPTIONS)[number]['value'];

const REGIONS = ['大陆', '美国', '日本', '韩国', '香港', '台湾', '英国', '法国', '德国', '印度', '泰国'];
const RESOURCE_OPTIONS = [
  { label: '全部资源状态', value: 'all' },
  { label: '有可用资源', value: 'true' },
  { label: '暂无可用资源', value: 'false' },
];
const USER_STATUS_OPTIONS = [
  { label: '全部观看状态', value: 'all' },
  { label: '未看过', value: 'unwatched' },
  { label: '已看过', value: 'watched' },
  { label: '未加入片单', value: 'unlisted' },
  { label: '已加入片单', value: 'listed' },
];
type UserStatusFilter = (typeof USER_STATUS_OPTIONS)[number]['value'];

function parseSortOption(rawSort: string | null): SortOptionValue {
  if (rawSort === 'year' || rawSort === 'year_desc' || rawSort === 'year_asc') return 'year';
  return SORT_OPTIONS.some((option) => option.value === rawSort)
    ? rawSort as SortOptionValue
    : 'relevance';
}

function parseUserStatusFilter(rawValue: string | null): UserStatusFilter {
  return USER_STATUS_OPTIONS.some((option) => option.value === rawValue)
    ? rawValue as UserStatusFilter
    : 'all';
}

function validYear(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1888 && value <= 9999 ? value : null;
}

function hasYearSuffix(title: string, year: number): boolean {
  return new RegExp(`[（(]\\s*${year}\\s*[）)]$`).test(title.trim());
}

function statusMatchesFilter(filter: UserStatusFilter, status: { listType: string } | null | undefined): boolean {
  if (filter === 'watched') return status?.listType === 'watched';
  if (filter === 'unwatched') return status?.listType !== 'watched';
  if (filter === 'listed') return status != null;
  if (filter === 'unlisted') return status == null;
  return true;
}

function Highlight({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return text;
  const normalizedKeyword = keyword.trim();
  const lowerText = text.toLocaleLowerCase();
  const lowerKeyword = normalizedKeyword.toLocaleLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let index = lowerText.indexOf(lowerKeyword);
  while (index >= 0) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(<mark key={`${index}-${cursor}`} className="bg-transparent font-semibold text-accent">{text.slice(index, index + normalizedKeyword.length)}</mark>);
    cursor = index + normalizedKeyword.length;
    index = lowerText.indexOf(lowerKeyword, cursor);
  }
  if (cursor === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function valuesOf(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.filter((entry) => typeof entry === 'string' && entry.trim()).map((entry) => entry.trim());
  return parseJsonArr(value);
}

function HighlightValues({ values, keyword }: { values: string[]; keyword: string }) {
  if (values.length === 0) return '--';
  return <>{values.map((value, index) => <span key={`${value}-${index}`}><Highlight text={value} keyword={keyword} />{index < values.length - 1 && <span className="mx-1 text-muted-foreground/60">/</span>}</span>)}</>;
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
      className="h-full w-auto shrink-0 aspect-[2/3] rounded-xl"
      imgClassName="object-contain bg-muted/25"
      aspectRatio={null}
      rootMargin="240px"
    />
  );
}

const CollectModalClient = dynamic(() => import('@/components/CollectModal'), { ssr: false });

interface CollectionTarget {
  contentId: number;
  contentType: string;
  title: string;
}

function SearchContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const q = searchParams.get('q')?.trim() || '';
  const typeFilter = searchParams.get('typeFilter') || '';
  const selectedContentType = isContentType(typeFilter) ? typeFilter : null;
  const rawTagId = Number(searchParams.get('tagId'));
  const tagId = selectedContentType && Number.isSafeInteger(rawTagId) && rawTagId > 0 ? rawTagId : null;
  const region = searchParams.get('region')?.trim() || '';
  const rawResourceFilter = searchParams.get('hasResource');
  const hasResource = rawResourceFilter === 'true' || rawResourceFilter === 'false' ? rawResourceFilter : 'all';
  const rawUserStatus = searchParams.get('userStatus');
  const userStatus = isAuthenticated ? parseUserStatusFilter(rawUserStatus) : 'all';
  const rawSort = searchParams.get('sort');
  const sort = parseSortOption(rawSort);
  const sortConfig = SORT_OPTIONS.find((option) => option.value === sort) || SORT_OPTIONS[0];
  const sortDir = sortConfig.defaultDir;
  const apiSort = sortConfig.apiSort;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const size = Math.min(100, Math.max(1, Number(searchParams.get('size')) || 20));
  const [data, setData] = useState<SearchPageData>({ records: [], total: 0, size, current: page, pages: 0 });
  const [loading, setLoading] = useState(Boolean(q));
  const [error, setError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const [hot, setHot] = useState<HotSearchItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [collectionTarget, setCollectionTarget] = useState<CollectionTarget | null>(null);
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
    const params = new URLSearchParams({ keyword: q, page: String(page), size: String(size), sort: apiSort, sortDir });
    if (selectedContentType) params.set('typeFilter', selectedContentType);
    if (tagId) params.set('tagId', String(tagId));
    if (region) params.set('region', region);
    if (hasResource !== 'all') params.set('hasResource', hasResource);
    if (userStatus !== 'all') params.set('userStatus', userStatus);
    const token = typeof window !== 'undefined' ? localStorage.getItem('ff_token') : null;
    fetch(`/api/search?${params}`, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
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
  }, [q, selectedContentType, tagId, region, hasResource, userStatus, apiSort, sortDir, page, size, requestVersion]);

  const statusQueries = useMemo(
    () => data.records.map((item) => ({ contentType: item.type, contentId: item.id })),
    [data.records],
  );
  const statuses = useContentStatuses(statusQueries);
  const statusFilterReady = !isAuthenticated || userStatus === 'all' || statusQueries.length === 0 || statusQueries.every((query) => Object.prototype.hasOwnProperty.call(statuses, contentStatusKey(query.contentType, query.contentId)));
  const visibleRecords = useMemo(
    () => !isAuthenticated || userStatus === 'all' || !statusFilterReady
      ? data.records
      : data.records.filter((item) => statusMatchesFilter(userStatus, statuses[contentStatusKey(item.type, item.id)])),
    [data.records, isAuthenticated, statusFilterReady, statuses, userStatus],
  );
  const activeFilterCount = [selectedContentType, tagId, region, hasResource === 'all' ? null : hasResource, userStatus === 'all' ? null : userStatus]
    .filter(Boolean).length;

  const submit = (keyword: string) => {
    const normalized = keyword.trim();
    if (!normalized) return;
    saveHistory(normalized);
    navigate({ q: normalized, year: null, page: 1 }, 'push');
  };

  return (
    <div className="mx-auto flex w-full max-w-none flex-col gap-6" aria-busy={loading || isPending}>
      <section className="rounded-2xl border border-border bg-card/70 p-3 sm:p-4" aria-label="搜索筛选与排序">
        <div className="flex flex-wrap items-center gap-2">
          <CustomSelect
            ariaLabel="搜索内容类型"
            value={selectedContentType || 'all'}
            options={[{ label: '全部类型', value: 'all' }, ...Object.values(CONTENT_TYPE_REGISTRY).map((config) => ({ label: config.label, value: config.code }))]}
            onChange={(value) => navigate({ typeFilter: value === 'all' ? null : value, tagId: null, page: 1 })}
          />
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
          {isAuthenticated && (
            <CustomSelect
              ariaLabel="观看状态"
              value={userStatus}
              options={USER_STATUS_OPTIONS.map(({ label, value }) => ({ label, value }))}
              onChange={(value) => navigate({ userStatus: value === 'all' ? null : value, page: 1 })}
            />
          )}
          {!isAuthenticated && <span className="inline-flex h-8 items-center rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground" title="登录后可筛选观看状态">观看状态（登录后可筛选）</span>}
          {isAuthenticated && userStatus !== 'all' && !statusFilterReady && <span className="text-xs text-muted-foreground" aria-live="polite">正在同步观看状态…</span>}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => navigate({ typeFilter: null, tagId: null, year: null, region: null, hasResource: null, userStatus: null, page: 1 })}
              className="h-8 rounded-lg border border-border px-3 text-xs font-medium text-secondary-foreground hover:border-accent hover:text-accent"
            >
              清除筛选 · {activeFilterCount}
            </button>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2 border-l border-border pl-3">
            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">排序</span>
            <CustomSelect
              ariaLabel="搜索结果排序"
              value={sort}
              options={SORT_OPTIONS.map(({ label, value }) => ({ label, value }))}
              className="w-[9rem] shrink-0"
              onChange={(value) => {
                const nextSort = SORT_OPTIONS.find((option) => option.value === value) || SORT_OPTIONS[0];
                navigate({ sort: nextSort.value, sortDir: nextSort.defaultDir, page: 1 });
              }}
            />
            {q && <span className="shrink-0 text-sm tabular-nums text-muted-foreground" aria-live="polite">{loading ? '搜索中…' : error ? '搜索失败' : `找到 ${data.total} 条`}</span>}
          </div>
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
            <div key={index} className="flex h-[12.5rem] gap-4 overflow-hidden rounded-2xl border border-border bg-card p-3 sm:h-[14rem]">
              <div className="h-full w-auto shrink-0 aspect-[2/3] animate-pulse rounded-xl bg-muted" />
              <div className="flex min-w-0 flex-1 flex-col gap-3 py-2"><span className="h-4 w-1/2 animate-pulse rounded bg-muted" /><span className="h-3 w-1/3 animate-pulse rounded bg-muted" /><span className="h-3 w-full animate-pulse rounded bg-muted" /><span className="h-3 w-2/3 animate-pulse rounded bg-muted" /></div>
            </div>
          ))}
        </div>
      ) : !loading && visibleRecords.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-secondary-foreground">{userStatus !== 'all' && statusFilterReady ? `当前结果没有符合“${USER_STATUS_OPTIONS.find((option) => option.value === userStatus)?.label || '观看状态'}”的内容` : `没有找到“${q}”`}</p>
          <p className="mt-2 text-xs text-muted-foreground">可尝试缩短关键词或减少筛选条件</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {tagId && <button type="button" onClick={() => navigate({ tagId: null, page: 1 })} className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-secondary-foreground">清除题材</button>}
            {activeFilterCount > 0 && <button type="button" onClick={() => navigate({ typeFilter: null, tagId: null, year: null, region: null, hasResource: null, userStatus: null, page: 1 })} className="rounded-xl border border-accent px-4 py-2 text-xs font-medium text-accent">清除全部筛选</button>}
          </div>
        </div>
      ) : (
        <div className={`grid gap-3 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
          {visibleRecords.map((item) => {
            const type = normalizeContentType(item.type);
            const config = getContentTypeConfig(type);
            const status = statuses[contentStatusKey(type, item.id)];
            const aliases = valuesOf(item.alias);
            const directors = valuesOf(item.director);
            const writers = valuesOf(item.writer);
            const actors = valuesOf(item.actor);
            const genres = valuesOf(item.genre);
            const displayYear = validYear(item.year);
            const releaseValue = item.releaseDate?.trim() || (displayYear ? String(displayYear) : '--');
            return (
              <Link key={`${type}-${item.id}`} href={`/${config.route}/${item.id}`} prefetch={false} className="flex h-[12.5rem] gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3 transition-[border-color,box-shadow] hover:border-accent/40 hover:shadow-sm sm:h-[14rem] sm:gap-4">
                <SearchPoster item={item} type={type} />
                <div className="flex h-full min-w-0 min-h-0 flex-1 flex-col overflow-hidden py-1">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h2 className="min-w-0 truncate font-semibold leading-6 text-foreground">
                      <Highlight text={item.title} keyword={q} />
                      {displayYear && !hasYearSuffix(item.title, displayYear) ? <span className="ml-1 font-medium text-muted-foreground">（<Highlight text={String(displayYear)} keyword={q} />）</span> : null}
                    </h2>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <StatusIconButton
                        listType={status?.listType}
                        size="md"
                        title={status?.listType ? '管理片单状态' : '添加到片单'}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setCollectionTarget({ contentId: item.id, contentType: type, title: item.title });
                        }}
                      />
                      <TypeBadge contentType={type} size="sm" />
                    </div>
                  </div>
                  {aliases.length > 0 && <p className="mt-1 min-w-0 truncate text-xs text-muted-foreground" title={`别名：${aliases.join(' / ')}`}>别名：<HighlightValues values={aliases} keyword={q} /></p>}
                  <div className="mt-2 grid min-h-0 grid-cols-2 gap-x-6 gap-y-1 overflow-hidden text-xs leading-5 text-secondary-foreground">
                    <p className="min-w-0 truncate" title={`导演：${directors.join(' / ') || '--'}`}>导演：<HighlightValues values={directors} keyword={q} /></p>
                    <p className="min-w-0 truncate" title={`编剧：${writers.join(' / ') || '--'}`}>编剧：<HighlightValues values={writers} keyword={q} /></p>
                    <p className="min-w-0 truncate" title={`主演：${actors.join(' / ') || '--'}`}>主演：<HighlightValues values={actors} keyword={q} /></p>
                    <p className="min-w-0 truncate" title={`类型：${genres.slice(0, 4).join(' / ') || '--'}`}>类型：<HighlightValues values={genres.slice(0, 4)} keyword={q} /></p>
                    <p className="min-w-0 truncate" title={`${type === 'movie' ? '上映' : '首播'}：${releaseValue}`}>{type === 'movie' ? '上映' : '首播'}：<Highlight text={releaseValue} keyword={q} /></p>
                    <p className="min-w-0 truncate" title={`地区：${parseRegion(item.region).join(' / ') || '--'}`}>地区：<HighlightValues values={parseRegion(item.region)} keyword={q} /></p>
                  </div>
                  {item.summary && <p className="mt-3 line-clamp-2 overflow-hidden text-sm leading-6 text-muted-foreground"><Highlight text={item.summary} keyword={q} /></p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {data.pages > 1 && <Pagination currentPage={page} totalPages={data.pages} onPageChange={(nextPage) => navigate({ page: nextPage })} />}
      {collectionTarget && (
        <CollectModalClient
          open
          onClose={() => setCollectionTarget(null)}
          movieId={collectionTarget.contentId}
          contentType={collectionTarget.contentType}
          movieTitle={collectionTarget.title}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="py-20 text-center text-sm text-muted-foreground">加载搜索…</div>}><SearchContent /></Suspense>;
}
