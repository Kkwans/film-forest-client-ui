'use client';

import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { searchApi, HotSearchItem } from '@/lib/api';
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
import { listApi, type UserList } from '@/lib/userApi';
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

/** Highlight matching text */
function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <>{text}</>;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        // Use index-based check: odd indices are the matched groups from split()
        // Avoids regex.test() stateful lastIndex bug with 'g' flag
        i % 2 === 1 ? (
          <mark key={i} className="bg-transparent font-semibold" style={{ color: 'var(--accent)' }}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** Search icon */
function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** Clear (X) icon */
function ClearIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/** History icon */
function HistoryIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/** Trending/Fire icon */
function TrendingIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

/** Suggest/Lightbulb icon */
function SuggestIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

/** Loading spinner for suggestions */
function SuggestSpinner() {
  return (
    <div className="flex items-center justify-center py-3">
      <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent)' }} />
    </div>
  );
}

/** Empty search state illustration */
function EmptySearchState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <span className="text-5xl opacity-80">🔍</span>
        <span className="absolute -bottom-1 -right-1 text-xl animate-float">✨</span>
      </div>
      <div className="text-center">
        <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          搜索你想看的影片
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          支持影片名、演员、导演等关键词
        </p>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <kbd className="px-2 py-0.5 rounded text-[10px] font-mono border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)' }}>
          /
        </kbd>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>快捷搜索</span>
      </div>
    </div>
  );
}

/** No results state */
function NoResultsState({ keyword }: { keyword: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <span className="text-5xl opacity-60">😶</span>
      <div className="text-center">
        <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          没有找到「<span style={{ color: 'var(--accent)' }}>{keyword}</span>」的相关结果
        </p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          换个关键词试试？可以尝试影片名、演员名或导演名
        </p>
      </div>
    </div>
  );
}

/** Loading skeleton for search results */
function ResultSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl border animate-pulse"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', animationDelay: `${(i - 1) * 100}ms` }}
        >
          <div className="shrink-0 w-[80px] md:w-[110px] aspect-[2/3] rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="flex-1 flex flex-col gap-2 py-1">
            <div className="h-4 rounded w-3/4" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-3 rounded w-2/3" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-3 rounded w-1/3 mt-auto" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-3 rounded w-full hidden md:block" style={{ backgroundColor: 'var(--bg-card)' }} />
          </div>
        </div>
      ))}
    </div>
  );
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
  const [sortBy, setSortBy] = useState('latest');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [collectMovieId, setCollectMovieId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hotItems, setHotItems] = useState<HotSearchItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [activeSuggestIndex, setActiveSuggestIndex] = useState(-1);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestListRef = useRef<HTMLDivElement>(null);
  const [collectType, setCollectType] = useState('');
  const [collectTitle, setCollectTitle] = useState('');
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const { showToast } = useToast();

  // Get all displayed movie IDs for status check
  const displayedMovieIds = useMemo(() => {
    const filtered = typeFilter ? results.filter(r => r.type === typeFilter) : results;
    return filtered.map(r => r.id);
  }, [results, typeFilter]);

  // Group items by type for accurate status queries (search returns mixed types)
  const typeGroups = useMemo(() => {
    const filtered = typeFilter ? results.filter(r => r.type === typeFilter) : results;
    const groups = new Map<string, number[]>();
    for (const r of filtered) {
      const t = r.type === 'short_drama' ? 'short_drama' : r.type;
      const arr = groups.get(t) || [];
      arr.push(r.id);
      groups.set(t, arr);
    }
    return groups;
  }, [results, typeFilter]);

  // Use a single contentType for status check (works correctly when typeFilter is set)
  const statusContentType = useMemo(() => {
    const filtered = typeFilter ? results.filter(r => r.type === typeFilter) : results;
    if (filtered.length > 0) return filtered[0].type === 'short_drama' ? 'short_drama' : filtered[0].type;
    return 'movie';
  }, [results, typeFilter]);

  // When no type filter, we need to query each type separately
  const statusMapFiltered = useMovieStatuses(displayedMovieIds, typeFilter ? statusContentType : 'movie');
  const statusMapDrama = useMovieStatuses(typeGroups.get('drama') || [], 'drama');
  const statusMapVariety = useMovieStatuses(typeGroups.get('variety') || [], 'variety');
  const statusMapAnime = useMovieStatuses(typeGroups.get('anime') || [], 'anime');
  const statusMapShort = useMovieStatuses(typeGroups.get('short_drama') || [], 'short_drama');

  // Merge all status maps
  const statusMap = useMemo(() => {
    if (typeFilter) return statusMapFiltered;
    return { ...statusMapFiltered, ...statusMapDrama, ...statusMapVariety, ...statusMapAnime, ...statusMapShort };
  }, [typeFilter, statusMapFiltered, statusMapDrama, statusMapVariety, statusMapAnime, statusMapShort]);

  // Build the flat list of all suggestion items for keyboard nav
  const allSuggestItems = useMemo(() => {
    const items: { text: string; source: 'suggest' | 'history' | 'hot' }[] = [];
    if (suggestions.length > 0) {
      suggestions.forEach(s => items.push({ text: s, source: 'suggest' }));
    }
    if (!keyword.trim()) {
      searchHistory.forEach(h => items.push({ text: h, source: 'history' }));
      hotItems.forEach(h => items.push({ text: h.title, source: 'hot' }));
    }
    return items;
  }, [suggestions, searchHistory, hotItems, keyword]);

  const doSearch = async (kw: string, page: number = 1, sort: string = sortBy, dir: string = sortDir) => {
    if (!kw.trim()) return;
    setLoading(true);
    setSearched(true);
    setCurrentPage(page);
    try {
      const res = await searchApi.search(kw, { page, size: 20, sort, sortDir: dir });
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

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('search_history');
      if (stored) setSearchHistory(JSON.parse(stored));
    } catch {}
  }, []);

  // Load hot search items
  useEffect(() => {
    searchApi.hot().then(res => {
      setHotItems(res.data?.data || []);
    }).catch(() => {});
  }, []);

  // Re-search when sort changes
  useEffect(() => {
    if (searched && keyword.trim()) {
      doSearch(keyword.trim(), 1, sortBy, sortDir);
    }
  }, [sortBy, sortDir]);

  // Global keyboard shortcut: / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      doSearch(keyword.trim(), 1);
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(keyword.trim())}`);
      saveSearchHistory(keyword.trim());
      setShowSuggestions(false);
      setActiveSuggestIndex(-1);
    }
  };

  /** Save keyword to search history (max 10, dedup) */
  const saveSearchHistory = (kw: string) => {
    setSearchHistory(prev => {
      const next = [kw, ...prev.filter(h => h !== kw)].slice(0, 10);
      try { localStorage.setItem('search_history', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  /** Clear search history */
  const clearSearchHistory = () => {
    setSearchHistory([]);
    try { localStorage.removeItem('search_history'); } catch {}
  };

  /** Debounced suggest */
  const handleInputChange = (value: string) => {
    setKeyword(value);
    setActiveSuggestIndex(-1);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    setSuggestLoading(true);
    suggestTimerRef.current = setTimeout(() => {
      searchApi.suggest(value.trim()).then(res => {
        setSuggestions(res.data?.data || []);
        setShowSuggestions(true);
      }).catch(() => setSuggestions([])).finally(() => setSuggestLoading(false));
    }, 300);
  };

  /** Click a suggestion or history item */
  const handleSuggestionClick = (kw: string) => {
    setKeyword(kw);
    setShowSuggestions(false);
    setActiveSuggestIndex(-1);
    doSearch(kw, 1);
    window.history.pushState({}, '', `/search?q=${encodeURIComponent(kw)}`);
    saveSearchHistory(kw);
  };

  /** Keyboard navigation for suggestions */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || allSuggestItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestIndex(prev => (prev + 1) % allSuggestItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestIndex(prev => (prev <= 0 ? allSuggestItems.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && activeSuggestIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(allSuggestItems[activeSuggestIndex].text);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestIndex(-1);
      inputRef.current?.blur();
    }
  };

  // Scroll active suggestion into view
  useEffect(() => {
    if (activeSuggestIndex >= 0 && suggestListRef.current) {
      const activeItem = suggestListRef.current.querySelector(`[data-suggest-index="${activeSuggestIndex}"]`);
      activeItem?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeSuggestIndex]);

  // Client-side type filter only (sorting is server-side)
  const filteredResults = useMemo(() => {
    return typeFilter ? results.filter(r => r.type === typeFilter) : results;
  }, [results, typeFilter]);

  // Handle collect button click on search results
  const handleCollectClick = useCallback((e: React.MouseEvent, item: SearchResult) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return;

    const status = statusMap[item.id];
    if (status && (status.listType === 'want_to_watch' || status.listType === 'watching' || status.listType === 'watched')) {
      showToast(`该影片已被标记为${status.listName}`, 'warning');
      return;
    }

    listApi.getAll().then(res => {
      const lists = res.data.data || res.data;
      const wantList = Array.isArray(lists) ? lists.find((l: UserList) => l.type === 'want_to_watch') : null;
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
      {/* Search bar with suggestions */}
      <div
        className="rounded-xl p-5 md:p-6 border relative transition-all duration-200"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: showSuggestions ? 'var(--accent)' : 'var(--border-color)',
          boxShadow: showSuggestions ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            {/* Search icon inside input */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
              <SearchIcon className="w-4 h-4" />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索影片、演员、导演..."
              value={keyword}
              onChange={e => handleInputChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyDown={handleKeyDown}
              className="w-full h-10 pl-9 pr-9 rounded-lg text-sm border outline-none transition-all duration-200"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              autoComplete="off"
            />
            {/* Clear button */}
            {keyword && (
              <button
                type="button"
                onClick={() => { setKeyword(''); setSuggestions([]); setShowSuggestions(false); setActiveSuggestIndex(-1); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                title="清除"
              >
                <ClearIcon />
              </button>
            )}
            {/* Suggestions dropdown */}
            {showSuggestions && (suggestions.length > 0 || suggestLoading || (!keyword.trim() && (searchHistory.length > 0 || hotItems.length > 0))) && (
              <div
                ref={suggestListRef}
                className="absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-lg z-50 max-h-80 overflow-y-auto overflow-x-hidden"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                {/* Loading state */}
                {suggestLoading && keyword.trim() && <SuggestSpinner />}

                {/* Suggestions */}
                {!suggestLoading && suggestions.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <SuggestIcon /> 搜索建议
                    </div>
                    {suggestions.map((s, i) => {
                      const globalIndex = i;
                      return (
                        <button
                          key={i}
                          data-suggest-index={globalIndex}
                          className="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2"
                          style={{
                            color: 'var(--text-primary)',
                            backgroundColor: activeSuggestIndex === globalIndex ? 'var(--accent-light)' : 'transparent',
                          }}
                          onMouseDown={() => handleSuggestionClick(s)}
                          onMouseEnter={() => setActiveSuggestIndex(globalIndex)}
                        >
                          <span style={{ color: 'var(--text-muted)' }}><SearchIcon className="w-3.5 h-3.5" /></span>
                          <span className="flex-1 truncate"><HighlightText text={s} keyword={keyword} /></span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Search history (when no input) */}
                {!keyword.trim() && searchHistory.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1.5"><HistoryIcon /> 搜索历史</span>
                      <button onClick={clearSearchHistory} className="text-xs transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>清空</button>
                    </div>
                    {searchHistory.map((h, i) => {
                      const globalIndex = suggestions.length + i;
                      return (
                        <button
                          key={i}
                          data-suggest-index={globalIndex}
                          className="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2"
                          style={{
                            color: 'var(--text-primary)',
                            backgroundColor: activeSuggestIndex === globalIndex ? 'var(--accent-light)' : 'transparent',
                          }}
                          onMouseDown={() => handleSuggestionClick(h)}
                          onMouseEnter={() => setActiveSuggestIndex(globalIndex)}
                        >
                          <span style={{ color: 'var(--text-muted)' }}><HistoryIcon /></span>
                          <span className="flex-1 truncate">{h}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Hot search (when no input) */}
                {!keyword.trim() && hotItems.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <TrendingIcon /> 热门搜索
                    </div>
                    {hotItems.map((item, i) => {
                      const globalIndex = suggestions.length + searchHistory.length + i;
                      return (
                        <button
                          key={i}
                          data-suggest-index={globalIndex}
                          className="w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2"
                          style={{
                            color: 'var(--text-primary)',
                            backgroundColor: activeSuggestIndex === globalIndex ? 'var(--accent-light)' : 'transparent',
                          }}
                          onMouseDown={() => handleSuggestionClick(item.title)}
                          onMouseEnter={() => setActiveSuggestIndex(globalIndex)}
                        >
                          <span
                            className="text-xs font-bold w-5 text-center shrink-0"
                            style={{ color: i < 3 ? 'var(--accent)' : 'var(--text-muted)' }}
                          >
                            {i + 1}
                          </span>
                          <span className="flex-1 truncate">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            className="h-10 px-5 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 shrink-0 flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <SearchIcon className="w-4 h-4" />
            <span className="hidden sm:inline">搜索</span>
          </button>
        </form>
        {/* Keyboard shortcut hint - desktop only */}
        {!showSuggestions && (
          <div className="hidden md:flex items-center justify-center gap-1.5 mt-2">
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)' }}>
              /
            </kbd>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>快捷搜索</span>
            <span className="mx-1 text-[10px]" style={{ color: 'var(--border-color)' }}>·</span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)' }}>
              ↑↓
            </kbd>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>选择</span>
            <span className="mx-1 text-[10px]" style={{ color: 'var(--border-color)' }}>·</span>
            <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)' }}>
              Esc
            </kbd>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>关闭</span>
          </div>
        )}
      </div>

      {/* Filters + Sort */}
      {searched && !loading && results.length > 0 && (
        <div className="flex flex-col gap-3 animate-fade-in-up">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              找到 <span className="font-semibold" style={{ color: 'var(--accent)' }}>{total}</span> 个结果
            </p>
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
        <ResultSkeleton />
      ) : searched && filteredResults.length === 0 ? (
        <NoResultsState keyword={initialQuery || keyword} />
      ) : filteredResults.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredResults.map((item, index) => {
              const href = `${TYPE_HREFS[item.type] || '/movie'}/${item.id}`;
              const regionArr = parseJsonArr(item.region);
              const genreArr = parseJsonArr(item.genre);
              const directorArr = parseJsonArr(item.director);
              const actorArr = parseJsonArr(item.actor);
              const aliasArr = parseJsonArr(item.alias);
              const regionStr = regionArr.join('/');
              const durationOrEp = item.type === 'movie' ? (item.duration ? `${item.duration}分钟` : '') : (item.totalEpisode ? `${item.totalEpisode}集` : '');

              const movieStatus = statusMap[item.id];

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={href}
                  prefetch={true}
                  className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl border transition-all duration-200 hover:shadow-md relative animate-fade-in-up card-hover"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    animationDelay: `${Math.min(index * 50, 400)}ms`,
                  }}
                >
                  {/* Collect button */}
                  <StatusIconButton
                    listType={movieStatus?.listType || null}
                    onClick={(e) => handleCollectClick(e, item)}
                    onDoubleClick={(e) => handleCollectDoubleClick(e, item)}
                    size="md"
                    className="absolute top-2 right-2 z-10"
                  />
                  {/* Poster */}
                  <div className="shrink-0 w-[80px] md:w-[110px] aspect-[2/3] rounded-lg overflow-hidden">
                    <img src={item.cover || `https://picsum.photos/seed/${item.id}/110/165`} alt={item.title} className="w-full h-full object-cover img-zoom" loading="lazy" />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <h3 className="font-bold text-sm md:text-base line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                      <HighlightText text={cleanTitleUtil(item.title)} keyword={keyword} />
                    </h3>
                    {/* Alias */}
                    {aliasArr.length > 0 && (
                      <p className="text-[10px] md:text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {aliasArr.join(' / ')}
                      </p>
                    )}
                    {/* Ratings */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.rating != null && (
                        <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--badge-douban-bg)', color: 'var(--badge-douban-text)' }}>
                          豆瓣 {item.rating.toFixed(1)}
                        </span>
                      )}
                      {item.ratingImdb != null && (
                        <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--badge-imdb-bg)', color: 'var(--badge-imdb-text)' }}>
                          IMDB {item.ratingImdb.toFixed(1)}
                        </span>
                      )}
                      {item.ratingRT != null && (
                        <span className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--badge-rt-bg)', color: 'var(--badge-rt-text)' }}>
                          烂番茄 {item.ratingRT}%
                        </span>
                      )}
                    </div>
                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                      <TypeBadge contentType={item.type} />
                      {item.year && <span>{item.year}</span>}
                      {regionStr && <span>{regionStr}</span>}
                      {durationOrEp && <span>{durationOrEp}</span>}
                    </div>
                    {/* Genre tags */}
                    <GenreTags genres={genreArr} />
                    {/* Director */}
                    {directorArr.length > 0 && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-medium">导演:</span>{' '}
                        <HighlightText text={directorArr.join(' / ')} keyword={keyword} />
                      </p>
                    )}
                    {/* Actor - PC only */}
                    {actorArr.length > 0 && (
                      <p className="text-xs truncate hidden md:block" style={{ color: 'var(--text-secondary)' }}>
                        <span className="font-medium">主演:</span>{' '}
                        <HighlightText text={actorArr.slice(0, 4).join(' / ')} keyword={keyword} />
                      </p>
                    )}
                    {/* Summary - PC only */}
                    {item.summary && (
                      <p className="text-xs line-clamp-2 mt-auto hidden md:block" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-medium">简介:</span>{' '}
                        <HighlightText text={item.summary} keyword={keyword} />
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={p => doSearch(keyword, p)} />
        </>
      ) : !searched ? (
        <EmptySearchState />
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
    <Suspense fallback={<div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>加载中...</div>}>
      <SearchContent />
    </Suspense>
  );
}
