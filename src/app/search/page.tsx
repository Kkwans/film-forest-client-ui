// @ts-nocheck
'use client';

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { searchApi } from '@/lib/api';
import Pagination from '@/components/Pagination';
import CustomSelect from '@/components/CustomSelect';
import SortDirButton from '@/components/SortDirButton';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil } from '@/lib/utils';
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

const typeLabel: Record<string, string> = {
  movie: '电影', drama: '电视剧', variety: '综艺', anime: '动漫', short_drama: '短剧',
};

const typeHref: Record<string, string> = {
  movie: '/movie', drama: '/drama', variety: '/variety', anime: '/anime', short_drama: '/short',
};

function parseJsonArr(val: string | string[] | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Status icon config
const STATUS_ICONS: Record<string, { icon: string; label: string; color: string; fill: boolean }> = {
  watched: { icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z', label: '看过', color: '#22c55e', fill: true },
  watching: { icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', label: '在看', color: '#3b82f6', fill: false },
  want_to_watch: { icon: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z', label: '想看', color: '#f59e0b', fill: true },
  custom: { icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', label: '已收藏', color: '#8b5cf6', fill: true },
};

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
      <div className="rounded-xl p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input type="text" placeholder="搜索影片、演员、导演..." value={keyword} onChange={e => setKeyword(e.target.value)}
            className="flex-1 h-10 px-4 rounded-lg text-sm border outline-none" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          <button type="submit" className="h-10 px-6 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: 'var(--accent)' }}>搜索</button>
        </form>
      </div>

      {/* Filters + Sort */}
      {searched && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>找到 <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{total}</span> 个结果</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map(t => (
                <button key={t.value} onClick={() => setTypeFilter(t.value)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: typeFilter === t.value ? 'var(--accent)' : 'var(--bg-card)',
                    color: typeFilter === t.value ? '#fff' : 'var(--text-secondary)',
                    border: typeFilter === t.value ? 'none' : '1px solid var(--border-color)',
                  }}>
                  {t.label}
                </button>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-48 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />)}</div>
      ) : searched && filteredResults.length === 0 ? (
        <div className="text-center py-16"><p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>没有找到「{initialQuery || keyword}」的相关结果</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>试试其他关键词？</p></div>
      ) : filteredResults.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredResults.map(item => {
              const href = `${typeHref[item.type] || '/movie'}/${item.id}`;
              const regionArr = parseJsonArr(item.region);
              const genreArr = parseJsonArr(item.genre);
              const directorArr = parseJsonArr(item.director);
              const actorArr = parseJsonArr(item.actor);
              const aliasArr = parseJsonArr(item.alias);
              const regionStr = regionArr.join('/');
              const durationOrEp = item.type === 'movie' ? (item.duration ? `${item.duration}分钟` : '') : (item.totalEpisode ? `${item.totalEpisode}集` : '');

              // Get status for this item
              const movieStatus = statusMap[item.id];
              const statusConfig = movieStatus ? STATUS_ICONS[movieStatus.listType] || STATUS_ICONS.custom : null;

              return (
                <Link key={`${item.type}-${item.id}`} href={href} prefetch={true} className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl border transition-colors hover:shadow-md relative" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                  {/* Collect button - with status echo */}
                  <button
                    onClick={(e) => handleCollectClick(e, item)}
                    onDoubleClick={(e) => handleCollectDoubleClick(e, item)}
                    className="absolute top-2 right-2 z-10 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                    style={{
                      backgroundColor: statusConfig ? `${statusConfig.color}cc` : 'rgba(0,0,0,0.4)',
                      color: '#fff',
                    }}
                    title={statusConfig ? `${statusConfig.label}（单击提示，双击选择片单）` : '收藏'}
                  >
                    {statusConfig ? (
                      statusConfig.fill ? (
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                          <path d={statusConfig.icon} />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={statusConfig.icon} />
                        </svg>
                      )
                    ) : (
                      <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    )}
                  </button>
                  {/* Poster */}
                  <div className="shrink-0 w-[80px] md:w-[110px] aspect-[2/3] rounded-lg overflow-hidden">
                    <img src={item.cover || `https://picsum.photos/seed/${item.id}/110/165`} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <h3 className="font-bold text-sm md:text-base line-clamp-1" style={{ color: 'var(--text-primary)' }}>{cleanTitleUtil(item.title)}</h3>
                    {/* Alias */}
                    {aliasArr.length > 0 && (
                      <p className="text-[10px] md:text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {aliasArr.join(' / ')}
                      </p>
                    )}
                    {/* Ratings */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.rating != null && <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>豆瓣 {item.rating.toFixed(1)}</span>}
                      {item.ratingImdb != null && <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fefce8', color: '#ca8a04' }}>IMDB {item.ratingImdb.toFixed(1)}</span>}
                      {item.ratingRT != null && <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>烂番茄 {item.ratingRT}%</span>}
                    </div>
                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="px-1.5 py-0.5 rounded text-[10px] md:text-xs" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>{typeLabel[item.type]}</span>
                      {item.year && <span>{item.year}</span>}
                      {regionStr && <span>{regionStr}</span>}
                      {durationOrEp && <span>{durationOrEp}</span>}
                    </div>
                    {/* Genre tags */}
                    {genreArr.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {genreArr.slice(0, 4).map((g, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>{g}</span>
                        ))}
                      </div>
                    )}
                    {/* Director */}
                    {directorArr.length > 0 && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>导演:</span> {directorArr.join(' / ')}</p>}
                    {/* Actor - PC only */}
                    {actorArr.length > 0 && <p className="text-xs truncate hidden md:block" style={{ color: 'var(--text-muted)' }}><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>主演:</span> {actorArr.slice(0,4).join(' / ')}</p>}
                    {/* Summary - PC only */}
                    {item.summary && <p className="text-xs line-clamp-2 mt-auto hidden md:block" style={{ color: 'var(--text-muted)' }}><span className="font-medium" style={{ color: 'var(--text-secondary)' }}>简介:</span> {item.summary}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={p => doSearch(keyword, p)} />
        </>
      ) : !searched ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}><p className="text-4xl mb-3">🔍</p><p>输入关键词开始搜索</p></div>
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
    <Suspense fallback={<div className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>加载中...</div>}>
      <SearchContent />
    </Suspense>
  );
}
