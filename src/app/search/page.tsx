// @ts-nocheck
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { searchApi } from '@/lib/api';
import Pagination from '@/components/Pagination';
import { parseRegion, cleanTitle as cleanTitleUtil } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import dynamic from 'next/dynamic';

const CollectModal = dynamic(() => import('@/components/CollectModal'), { ssr: false });

interface SearchResult {
  id: number;
  type: 'movie' | 'drama' | 'variety' | 'anime' | 'short_drama';
  title: string;
  cover: string;
  year: number | null;
  rating: number | null;
  summary: string | null;
  director?: string[];
  actor?: string[];
  genre?: string[];
  region?: string | string[];
  duration?: number;
  totalEpisode?: number;
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
  { label: '默认', value: 'default' },
  { label: '评分', value: 'rating' },
  { label: '上映时间', value: 'year' },
];

const typeLabel: Record<string, string> = {
  movie: '电影', drama: '电视剧', variety: '综艺', anime: '动漫', short_drama: '短剧',
};

const typeHref: Record<string, string> = {
  movie: '/movie', drama: '/drama', variety: '/variety', anime: '/anime', short_drama: '/short',
};

function parseRegionStr(region: string | string[] | undefined): string {
  return parseRegion(region).join('/');
}

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
  const [sortBy, setSortBy] = useState('default');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [collectMovieId, setCollectMovieId] = useState<number | null>(null);
  const [collectType, setCollectType] = useState('');
  const [collectTitle, setCollectTitle] = useState('');
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  const doSearch = async (kw: string, page: number = 1) => {
    if (!kw.trim()) return;
    setLoading(true);
    setSearched(true);
    setCurrentPage(page);
    try {
      const res = await searchApi.search(kw, { page, size: 20 }) as any;
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      doSearch(keyword.trim(), 1);
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  // Client-side sort + filter
  const filteredResults = useMemo(() => {
    let filtered = typeFilter ? results.filter(r => r.type === typeFilter) : [...results];

    if (sortBy !== 'default') {
      filtered.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'rating') {
          cmp = (a.rating ?? 0) - (b.rating ?? 0);
        } else if (sortBy === 'year') {
          cmp = (a.year ?? 0) - (b.year ?? 0);
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }

    return filtered;
  }, [results, typeFilter, sortBy, sortDir]);

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
          {/* Type filters + result count */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>找到 <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{total}</span> 个结果</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_FILTERS.map(t => (
                <button key={t.value} onClick={() => setTypeFilter(t.value)} className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: typeFilter === t.value ? 'var(--accent)' : 'var(--bg-card)',
                    color: typeFilter === t.value ? '#fff' : 'var(--text-secondary)',
                    border: typeFilter === t.value ? 'none' : '1px solid var(--border-color)',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort controls */}
          <div className="flex items-center justify-end gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="h-8 px-3 rounded-lg text-sm border outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              className="h-8 px-2.5 flex items-center gap-1 rounded-lg text-xs font-medium border cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
              title={sortDir === 'desc' ? '降序 → 点击切换升序' : '升序 → 点击切换降序'}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {sortDir === 'desc' ? (
                  <><path d="M4 6l4 4 4-4" /></>
                ) : (
                  <><path d="M4 10l4-4 4 4" /></>
                )}
              </svg>
              <span>{sortDir === 'desc' ? '降序' : '升序'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />)}</div>
      ) : searched && filteredResults.length === 0 ? (
        <div className="text-center py-16"><p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>没有找到「{initialQuery || keyword}」的相关结果</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>试试其他关键词？</p></div>
      ) : filteredResults.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredResults.map(item => {
              const href = `${typeHref[item.type] || '/movie'}/${item.id}`;
              const regionStr = parseRegionStr(item.region);
              const durationOrEp = item.type === 'movie' ? (item.duration ? `${item.duration}分钟` : '') : (item.totalEpisode ? `${item.totalEpisode}集` : '');

              return (
                <Link key={`${item.type}-${item.id}`} href={href} prefetch={true} className="flex gap-3 p-3 rounded-xl border transition-colors hover:shadow-md relative" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
                  {/* Collect button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCollectMovieId(item.id);
                      setCollectType(item.type === 'short_drama' ? 'short_drama' : item.type);
                      setCollectTitle(item.title);
                    }}
                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff' }}
                    title="收藏"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  {/* Poster */}
                  <div className="shrink-0 w-[90px] md:w-[100px] aspect-[2/3] rounded-lg overflow-hidden">
                    <img src={item.cover || `https://picsum.photos/seed/${item.id}/100/150`} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm md:text-base truncate" style={{ color: 'var(--text-primary)' }}>{cleanTitleUtil(item.title)}</h3>
                      {item.rating != null && <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--accent)' }}>{item.rating.toFixed(1)}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.year && <span>{item.year}</span>}
                      {regionStr && <span>· {regionStr}</span>}
                      {durationOrEp && <span>· {durationOrEp}</span>}
                      <span className="px-1.5 py-0.5 rounded text-xs" style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}>{typeLabel[item.type]}</span>
                    </div>
                    {item.genre && item.genre.length > 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.genre.slice(0,3).join('/')}</p>}
                    {item.director && item.director.length > 0 && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>导演: {item.director[0]}</p>}
                    {item.actor && item.actor.length > 0 && <p className="text-xs truncate hidden md:block" style={{ color: 'var(--text-muted)' }}>主演: {item.actor.slice(0,3).join(' ')}</p>}
                    {item.summary && <p className="text-xs line-clamp-2 mt-auto" style={{ color: 'var(--text-secondary)' }}>{item.summary}</p>}
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
