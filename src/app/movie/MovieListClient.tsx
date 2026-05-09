// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import MovieCard from '@/components/MovieCard';
import Pagination from '@/components/Pagination';
import CustomSelect from '@/components/CustomSelect';
import SortDirButton from '@/components/SortDirButton';
import { parseRegion, parseGenre } from '@/lib/utils';

const GENRES_MOVIE = ['全部', '剧情', '喜剧', '动作', '爱情', '科幻', '悬疑', '恐怖', '犯罪', '动画', '奇幻', '冒险'];
const GENRES_DRAMA = ['全部', '剧情', '喜剧', '爱情', '悬疑', '犯罪', '古装', '都市', '战争', '家庭', '历史'];
const GENRES_VARIETY = ['全部', '真人秀', '脱口秀', '选秀', '音乐', '美食', '旅行', '访谈'];
const GENRES_ANIME = ['全部', '热血', '恋爱', '搞笑', '冒险', '科幻', '奇幻', '悬疑', '校园'];
const GENRES_SHORT = ['全部', '甜宠', '复仇', '穿越', '逆袭', '豪门', '都市'];

function getGenres(contentType: string) {
  switch (contentType) {
    case 'drama': return GENRES_DRAMA;
    case 'variety': return GENRES_VARIETY;
    case 'anime': return GENRES_ANIME;
    case 'short': return GENRES_SHORT;
    default: return GENRES_MOVIE;
  }
}

const YEARS = ['全部', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'];
const REGIONS = ['全部', '大陆', '美国', '日本', '韩国', '香港', '台湾', '英国', '法国', '德国', '印度', '泰国', '意大利', '西班牙', '加拿大', '澳大利亚'];
const SORT_OPTIONS = [
  { label: '最新更新', value: 'latest' },
  { label: '上映时间', value: 'year' },
  { label: '豆瓣评分', value: 'douban' },
  { label: 'IMDB评分', value: 'imdb' },
  { label: '烂番茄评分', value: 'rt' },
];

interface ContentItem { id: number; title: string; cover: string; year: number; region: string | string[]; rating?: number; genre?: string[]; duration?: number; episodes?: number; }

interface Props {
  initialItems: ContentItem[];
  initialTotal: number;
  contentType: string;
  apiBase: string;
}

export default function MovieListClient({ initialItems, initialTotal, contentType, apiBase }: Props) {
  const [items, setItems] = useState<ContentItem[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [genre, setGenre] = useState('全部');
  const [region, setRegion] = useState('全部');
  const [year, setYear] = useState('全部');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [sort, setSort] = useState('latest');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [initialized, setInitialized] = useState(false);

  const fetchData = useCallback(async (p: number, g: string, r: string, y: string, s: string, yf?: string, yt?: string) => {
    setLoading(true);
    try {
      const parts: string[] = [`page=${p}`, 'size=24'];
      if (g !== '全部') parts.push(`genre=${encodeURIComponent(g)}`);
      if (r !== '全部') parts.push(`region=${encodeURIComponent(r)}`);
      if (y !== '全部' && y !== '自定义') parts.push(`year=${encodeURIComponent(y)}`);
      if (y === '自定义' && yf && !yt) parts.push(`year=${encodeURIComponent(yf)}`);
      if (y === '自定义' && yf && yt) { parts.push(`yearFrom=${encodeURIComponent(yf)}`); parts.push(`yearTo=${encodeURIComponent(yt)}`); }
      if (s !== 'latest') parts.push(`sort=${encodeURIComponent(s)}`);
      if (sortDir === 'asc') parts.push('sortDir=asc');
      const qs = parts.join('&');
      const res = await fetch(`${apiBase}?${qs}`);
      const data = await res.json();
      const raw = data?.data?.records || data?.data || [];
      setItems(raw.map((m: any) => ({
        id: m.id,
        title: m.title,
        cover: m.posterUrl || m.cover || '',
        year: m.year || 0,
        region: parseRegion(m.region),
        rating: m.scoreDouban || m.scoreImdb || undefined,
        genre: parseGenre(m.genre),
        duration: m.duration || undefined,
        episodes: m.totalEpisode || m.currentEpisode || undefined,
      })));
      setTotal(data?.data?.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [apiBase, sortDir]);

  useEffect(() => {
    if (initialized) {
      fetchData(page, genre, region, year, sort, yearFrom, yearTo);
    }
  }, [page, genre, region, year, sort, sortDir, initialized, fetchData, yearFrom, yearTo]);

  const handlePageChange = (p: number) => {
    if (!initialized) setInitialized(true);
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateFilter = (key: string, value: string) => {
    if (!initialized) setInitialized(true);
    setPage(1);
    if (key === 'genre') setGenre(value);
    else if (key === 'region') setRegion(value);
    else if (key === 'year') setYear(value);
    else if (key === 'sort') setSort(value);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {contentType === 'movie' ? '电影' : contentType === 'drama' ? '电视剧' : contentType === 'variety' ? '综艺' : contentType === 'anime' ? '动漫' : '短剧'}
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {getGenres(contentType).map(g => (
          <button key={g} onClick={() => updateFilter('genre', g)}
            className="px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors"
            style={genre === g ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            {g}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {REGIONS.map(r => (
          <button key={r} onClick={() => updateFilter('region', r)}
            className="px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors"
            style={region === r ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            {r}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {YEARS.map(y => (
          <button key={y} onClick={() => { setYear(y); setYearFrom(''); setYearTo(''); }}
            className="px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors"
            style={year === y ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            {y}
          </button>
        ))}
        <div className="flex items-center gap-1">
          <input type="number" placeholder="起始年" value={yearFrom} onChange={e => { setYearFrom(e.target.value); setYear('自定义'); }} className="w-20 h-8 px-2 rounded-lg text-sm border outline-none" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>-</span>
          <input type="number" placeholder="结束年" value={yearTo} onChange={e => { setYearTo(e.target.value); setYear('自定义'); }} className="w-20 h-8 px-2 rounded-lg text-sm border outline-none" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{loading ? '加载中...' : `共 ${total} 部`}</span>
        <div className="flex items-center gap-2">
          <CustomSelect value={sort} options={SORT_OPTIONS} onChange={v => updateFilter('sort', v)} />
          <SortDirButton direction={sortDir} onToggle={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} />
        </div>
      </div>

      {/* Loading indicator */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--accent)' }} />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Grid - mobile 2 columns, desktop responsive */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4" style={{ minHeight: '60vh' }}>
            {items.map((item) => (
              <MovieCard key={item.id} id={item.id} title={item.title} cover={item.cover} year={item.year} region={item.region} rating={item.rating} genre={item.genre} type={contentType} duration={item.duration} episodes={item.episodes} href={`/${contentType}/${item.id}`} />
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>暂无数据</div>
          )}

          {total > 24 && <Pagination currentPage={page} totalPages={Math.ceil(total / 24)} onPageChange={handlePageChange} />}
        </>
      )}
    </div>
  );
}
