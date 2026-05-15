
import { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { searchApi } from '@/lib/api';
import Pagination from '@/components/Pagination';
import CustomSelect from '@/components/CustomSelect';
import SortDirButton from '@/components/SortDirButton';
import FilterChip from '@/components/FilterChip';
import { cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { parseJsonArr, TYPE_LABELS, TYPE_HREFS, getStatusConfig } from '@/lib/contentConstants';
import { StatusIconButton, TypeBadge, GenreTags } from '@/components/ContentShared';
import { useUserStore } from '@/stores/userStore';
import { useMovieStatuses } from '@/hooks/useMovieStatuses';
import { useToast } from '@/components/Toast';
import { listApi } from '@/lib/userApi';
import dynamic from 'next/dynamic';

const CollectModal = dynamic(() => import('@/components/CollectModal'), { ssr: false });

interface SearchResult {
  id: number;
  type: 'movie' | 'drama' | 'variety' | 'anime' | 'short_drama';
  title: string;
  cover: string;
  year: number | null;
  rating: number | null;
  ratingImdb: number | null;
  ratingRT: number | null;
  summary: string | null;
  director?: string;
  actor?: string;
  genre?: string;
  region?: string;
  duration?: number;
  totalEpisode?: number;
  updatedAt?: string;
  alias?: string;
}

const TYPE_FILTERS = [
  { label: '全部', value: '' },
  { label: '电影', value: 'movie' },
  { label: '电视剧', value: 'drama' },
  { label: '综艺', value: 'variety' },
  { label: '动漫', value: 'anime' },
  { label: '短剧', value: 'short_drama' },
];

const SORT_OPTIONS = [
  { label: '最新更新', value: 'latest' },
  { label: '上映时间', value: 'year' },
  { label: '豆瓣评分', value: 'douban' },
  { label: 'IMDB评分', value: 'imdb' },
  { label: '烂番茄评分', value: 'rt' },
];



function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [keyword, setKeyword] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [collectMovieId, setCollectMovieId] = useState<number | null>(null);
  const [collectType, setCollectType] = useState('');
  const [collectTitle, setCollectTitle] = useState('');
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const { showToast } = useToast();

  // Get all displayed movie IDs for status check
  const displayedMovieIds = useMemo(() => {
    const filtered = typeFilter ? results.filter(r => r.type === typeFilter) : results;
    return filtered.map(r => r.id);
  }, [results, typeFilter]);

  // Use a single contentType for status check (we'll use the first type found, or 'movie')
  const statusContentType = useMemo(() => {
    const filtered = typeFilter ? results.filter(r => r.type === typeFilter) : results;
    if (filtered.length > 0) return filtered[0].type === 'short_drama' ? 'short_drama' : filtered[0].type;
    return 'movie';
  }, [results, typeFilter]);

  const statusMap = useMovieStatuses(displayedMovieIds, statusContentType);

  const doSearch = async (kw: string, page: number = 1, sort: string = sortBy, dir: string = sortDir) => {
    if (!kw.trim()) return;
    setLoading(true);
    setSearched(true);
    setCurrentPage(page);
    try {
      const res = await searchApi.search(kw, { page, size: 20, sort, sortDir: dir }) as any;
      const data = res.data?.data || {};
      setResults(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(data.size ? Math.ceil(data.total / data.size) : 1);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setKeyword(q);
    if (q) doSearch(q, 1);
    else { setSearched(false); setResults([]); }
  }, [searchParams]);

  // Re-search when sort changes
  useEffect(() => {
    if (searched && keyword.trim()) {
      doSearch(keyword.trim(), 1, sortBy, sortDir);
    }
  }, [sortBy, sortDir]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      doSearch(keyword.trim(), 1);
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  // Client-side type filter only (sorting is server-side)
  const filteredResults = useMemo(() => {
    return typeFilter ? results.filter(r => r.type === typeFilter) : results;
  }, [results, typeFilter]);

  // Handle collect button click on search results
  const handleCollectClick = useCallback((e: React.MouseEvent, item: SearchResult) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;

    // Check if in default list
    const status = statusMap[item.id];
    if (status && (status.listType === 'want_to_watch' || status.listType === 'watching' || status.listType === 'watched')) {
      showToast(`该影片已被标记为${status.listName}`, 'warning');
      return;
    }

    // Add to want_to_watch
    listApi.getAll().then(res => {
      const lists = res.data.data || res.data;
      const wantList = Array.isArray(lists) ? lists.find((l: any) => l.type === 'want_to_watch') : null;
      if (wantList) {
        listApi.addItem(wantList.id, { movieId: item.id, contentType: item.type === 'short_drama' ? 'short_drama' : item.type });
        showToast('已加入想看', 'success');
        window.dispatchEvent(new CustomEvent('movie-status-changed', { detail: { movieId: item.id } }));
      }
    });
  }, [isAuthenticated, statusMap, showToast]);

  const handleCollectDoubleClick = useCallback((e: React.MouseEvent, item: SearchResult) => {
    e.preventDefault();
    e.stopPropagation();
    setCollectMovieId(item.id);
    setCollectType(item.type === 'short_drama' ? 'short_drama' : item.type);
    setCollectTitle(item.title);
  }, []);

  return (
    <>
    <div className="flex flex-col gap-6">
      {/* Search bar */}
      <div className="rounded-xl p-6 border bg-secondary border-border" >
        <form onSubmit={handleSearch} className="flex gap-2">
          <input type="text" placeholder="搜索影片、演员、导演..." value={keyword} onChange={e => setKeyword(e.target.value)}
            className="flex-1 h-10 px-4 rounded-lg text-sm border outline-none bg-background border-border text-foreground"  />
          <button type="submit" className="h-10 px-6 rounded-lg text-white text-sm font-medium bg-accent" >搜索</button>
        </form>
      </div>

      {/* Filters + Sort */}
      {searched && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-foreground text-secondary-foreground" >找到 <span className="font-medium" >{total}</span> 个结果</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map(t => (
                <FilterChip key={t.value} label={t.label} active={typeFilter === t.value} onClick={() => setTypeFilter(t.value)} size="sm" />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <CustomSelect value={sortBy} options={SORT_OPTIONS} onChange={v => setSortBy(v)} />
            <SortDirButton direction={sortDir} onToggle={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} />
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 bg-card">{[1,2,3,4].map(i => <div key={i} className="h-48 rounded-xl animate-pulse"  />)}</div>
      ) : searched && filteredResults.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-secondary-foreground"><p className="text-lg mb-2" >没有找到「{initialQuery || keyword}」的相关结果</p><p className="text-sm" >试试其他关键词？</p></div>
      ) : filteredResults.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredResults.map(item => {
              const href = `${TYPE_HREFS[item.type] || '/movie'}/${item.id}`;
              const regionArr = parseJsonArr(item.region);
              const genreArr = parseJsonArr(item.genre);
              const directorArr = parseJsonArr(item.director);
              const actorArr = parseJsonArr(item.actor);
              const aliasArr = parseJsonArr(item.alias);
              const regionStr = regionArr.join('/');
              const durationOrEp = item.type === 'movie' ? (item.duration ? `${item.duration}分钟` : '') : (item.totalEpisode ? `${item.totalEpisode}集` : '');

              // Get status for this item
              const movieStatus = statusMap[item.id];

              return (
                <Link key={`${item.type}-${item.id}`} href={href} prefetch={true} className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl border transition-colors hover:shadow-md relative bg-secondary border-border" >
                  {/* Collect button - with status echo */}
                  <StatusIconButton
                    listType={movieStatus?.listType || null}
                    onClick={(e) => handleCollectClick(e, item)}
                    onDoubleClick={(e) => handleCollectDoubleClick(e, item)}
                    size="md"
                    className="absolute top-2 right-2 z-10"
                  />
                  {/* Poster */}
                  <div className="shrink-0 w-[80px] md:w-[110px] aspect-[2/3] rounded-lg overflow-hidden">
                    <img src={item.cover || `https://picsum.photos/seed/${item.id}/110/165`} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <h3 className="font-bold text-sm md:text-base line-clamp-1 text-foreground" >{cleanTitleUtil(item.title)}</h3>
                    {/* Alias */}
                    {aliasArr.length > 0 && (
                      <p className="text-[10px] md:text-xs truncate text-muted-foreground" >
                        {aliasArr.join(' / ')}
                      </p>
                    )}
                    {/* Ratings */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.rating != null && <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" >豆瓣 {item.rating.toFixed(1)}</span>}
                      {item.ratingImdb != null && <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400" >IMDB {item.ratingImdb.toFixed(1)}</span>}
                      {item.ratingRT != null && <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" >烂番茄 {item.ratingRT}%</span>}
                    </div>
                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground" >
                      <TypeBadge contentType={item.type} />
                      {item.year && <span>{item.year}</span>}
                      {regionStr && <span>{regionStr}</span>}
                      {durationOrEp && <span>{durationOrEp}</span>}
                    </div>
                    {/* Genre tags */}
                    <GenreTags genres={genreArr} />
                    {/* Director */}
                    {directorArr.length > 0 && <p className="text-xs truncate text-muted-foreground text-secondary-foreground" ><span className="font-medium" >导演:</span> {directorArr.join(' / ')}</p>}
                    {/* Actor - PC only */}
                    {actorArr.length > 0 && <p className="text-xs truncate hidden md:block text-muted-foreground text-secondary-foreground" ><span className="font-medium" >主演:</span> {actorArr.slice(0,4).join(' / ')}</p>}
                    {/* Summary - PC only */}
                    {item.summary && <p className="text-xs line-clamp-2 mt-auto hidden md:block text-muted-foreground text-secondary-foreground" ><span className="font-medium" >简介:</span> {item.summary}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={p => doSearch(keyword, p)} />
        </>
      ) : !searched ? (
        <div className="text-center py-16 text-muted-foreground" ><p className="text-4xl mb-3">🔍</p><p>输入关键词开始搜索</p></div>
      ) : null}
    </div>
    <CollectModal
      open={collectMovieId !== null}
      onClose={() => setCollectMovieId(null)}
      movieId={collectMovieId || 0}
      contentType={collectType}
      movieTitle={collectTitle}
    />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-secondary-foreground" >加载中...</div>}>
      <SearchContent />
    </Suspense>
  );
}
