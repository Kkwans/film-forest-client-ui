// @ts-nocheck
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cleanTitle as cleanTitleUtil, cleanStoryline } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import dynamic from 'next/dynamic';

const CollectModal = dynamic(() => import('@/components/CollectModal'), { ssr: false });

interface MovieDetail {
  id: number; title: string; cover: string; year: number; region: string;
  rating?: number; ratingImdb?: number; ratingRT?: number;
  summary: string; genre: string[]; director: string[]; actor: string[];
  language: string[]; duration?: number; releaseDate?: string; aka: string[];
}
interface Resource { id: number; title?: string; magnetUrl?: string; shareUrl?: string; resolution?: string; hasSubtitle?: boolean; storageName?: string; }

export default function MovieDetailClient({ movie, magnetResources, cloudResources }: {
  movie: MovieDetail; magnetResources: Resource[]; cloudResources: Resource[];
}) {
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'magnet' | 'cloud'>('magnet');
  const [qualityFilter, setQualityFilter] = useState('全部');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  // Deduplicate magnets: remove "磁力下载" duplicates that share the same magnetUrl as real entries
  const realMagnets = useMemo(() => {
    const real = magnetResources.filter(r => r.title !== '磁力下载');
    const realUrls = new Set(real.map(r => r.magnetUrl));
    // Also keep entries with "磁力下载" only if their URL isn't already in real entries
    const dl = magnetResources.filter(r => r.title === '磁力下载' && !realUrls.has(r.magnetUrl));
    return [...real, ...dl];
  }, [magnetResources]);

  // Deduplicate cloud: remove "网盘下载" duplicates
  const realClouds = useMemo(() => {
    const real = cloudResources.filter(r => r.title !== '网盘下载');
    const realUrls = new Set(real.map(r => r.shareUrl));
    const dl = cloudResources.filter(r => r.title === '网盘下载' && !realUrls.has(r.shareUrl));
    return [...real, ...dl];
  }, [cloudResources]);

  const copyLink = (url: string, resId: number) => {
    // HTTP-compatible copy (navigator.clipboard only works on HTTPS)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => { setCopiedId(resId); setTimeout(() => setCopiedId(null), 2000); });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand('copy'); setCopiedId(resId); setTimeout(() => setCopiedId(null), 2000); } catch {}
      document.body.removeChild(textarea);
    }
  };

  const filteredMagnets = qualityFilter === '全部' ? realMagnets : realMagnets.filter(r => {
    const t = (r.title || '').toLowerCase();
    const res = (r.resolution || '').toLowerCase();
    if (qualityFilter === '4K') return res.includes('4k') || t.includes('4k');
    if (qualityFilter === '特效1080P') return (res.includes('1080') || t.includes('1080')) && t.includes('特效');
    if (qualityFilter === '中字1080P') return (res.includes('1080') || t.includes('1080')) && t.includes('中字') && !t.includes('特效');
    if (qualityFilter === '1080P') return (res.includes('1080') || t.includes('1080')) && !t.includes('中字') && !t.includes('特效');
    if (qualityFilter === '720P') return res.includes('720') || t.includes('720');
    if (qualityFilter === '未知') {
      return !(res.includes('4k') || t.includes('4k'))
        && !((res.includes('1080') || t.includes('1080')) && t.includes('特效'))
        && !((res.includes('1080') || t.includes('1080')) && t.includes('中字') && !t.includes('特效'))
        && !((res.includes('1080') || t.includes('1080')) && !t.includes('中字') && !t.includes('特效'))
        && !(res.includes('720') || t.includes('720'));
    }
    return false;
  });

  return (
    <>
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" className="hover:opacity-80 active:opacity-60 transition-opacity" style={{ color: 'var(--text-secondary)' }}>首页</Link>
        <span>›</span>
        <Link href="/movie" className="hover:opacity-80 active:opacity-60 transition-opacity" style={{ color: 'var(--text-secondary)' }}>电影</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{movie.title}</span>
      </nav>

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-48 md:w-64 shrink-0 mx-auto sm:mx-0 max-w-[256px]">
          <img src={movie.cover || `https://picsum.photos/seed/m${movie.id}/400/600`} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-xl" />
        </div>
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            {cleanTitleUtil(movie.title)} {movie.year > 0 && <span className="text-lg font-normal" style={{ color: 'var(--text-muted)' }}>({movie.year})</span>}
            <button
              onClick={() => setCollectOpen(true)}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border transition-colors"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              title="收藏"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            {movie.rating != null && <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>豆瓣 {movie.rating.toFixed(1)}</span>}
            {movie.ratingImdb != null && <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: '#fefce8', color: '#ca8a04' }}>IMDB {movie.ratingImdb.toFixed(1)}</span>}
            {movie.ratingRT != null && <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>烂番茄 {movie.ratingRT}%</span>}
          </div>
          {movie.genre.length > 0 && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{movie.genre.join(' / ')}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-2">
            {movie.director.length > 0 && <div className="text-sm"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>导演：</span><span style={{ color: 'var(--text-secondary)' }}>{movie.director.join(' / ')}</span></div>}
            {movie.language.length > 0 && <div className="text-sm"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>语言：</span><span style={{ color: 'var(--text-secondary)' }}>{movie.language.join(' / ')}</span></div>}
            {movie.actor.length > 0 && <div className="text-sm sm:col-span-2"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>主演：</span><span style={{ color: 'var(--text-secondary)' }}>{movie.actor.join(' / ')}</span></div>}
            {movie.duration && <div className="text-sm"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>片长：</span><span style={{ color: 'var(--text-secondary)' }}>约{movie.duration}分钟</span></div>}
            {movie.releaseDate && <div className="text-sm"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>上映日期：</span><span style={{ color: 'var(--text-secondary)' }}>{movie.releaseDate}</span></div>}
            {movie.region && <div className="text-sm"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>地区：</span><span style={{ color: 'var(--text-secondary)' }}>{movie.region}</span></div>}
          </div>
          {movie.aka.length > 0 && <div className="text-sm"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>又名：</span><span style={{ color: 'var(--text-muted)' }}>{movie.aka.join(' / ')}</span></div>}
        </div>
      </div>

      {movie.summary && (
        <section className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>简介</h2>
          <p className={`text-sm leading-relaxed ${synopsisExpanded ? '' : 'line-clamp-3'}`} style={{ color: 'var(--text-secondary)' }}>{cleanStoryline(movie.summary)}</p>
          {cleanStoryline(movie.summary).length > 200 && (
            <button onClick={() => setSynopsisExpanded(!synopsisExpanded)} className="mt-3 text-sm font-medium active:opacity-70 transition-opacity flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              {synopsisExpanded ? '收起' : '展开全部'}
              <svg className={`w-4 h-4 transition-transform ${synopsisExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          )}
        </section>
      )}

      <section className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>下载资源</h2>
        <div className="flex gap-6 border-b mb-4" style={{ borderColor: 'var(--border-color)' }}>
          {[{ key: 'magnet' as const, label: '磁力链接', count: realMagnets.length }, { key: 'cloud' as const, label: '网盘资源', count: realClouds.length }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="pb-3 text-sm font-medium border-b-2 active:opacity-70 transition-all" style={{ color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)', borderColor: activeTab === tab.key ? 'var(--accent)' : 'transparent' }}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        {activeTab === 'magnet' && realMagnets.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {(() => {
              const labels: { key: string; test: (r: Resource) => boolean }[] = [
                { key: '4K', test: r => { const t = (r.title||'').toLowerCase(); const res = (r.resolution||'').toLowerCase(); return res.includes('4k') || t.includes('4k'); } },
                { key: '特效1080P', test: r => { const t = (r.title||'').toLowerCase(); const res = (r.resolution||'').toLowerCase(); return (res.includes('1080') || t.includes('1080')) && (t.includes('特效')); } },
                { key: '中字1080P', test: r => { const t = (r.title||'').toLowerCase(); const res = (r.resolution||'').toLowerCase(); return (res.includes('1080') || t.includes('1080')) && (t.includes('中字')) && !t.includes('特效'); } },
                { key: '1080P', test: r => { const t = (r.title||'').toLowerCase(); const res = (r.resolution||'').toLowerCase(); return (res.includes('1080') || t.includes('1080')) && !t.includes('中字') && !t.includes('特效'); } },
                { key: '720P', test: r => { const t = (r.title||'').toLowerCase(); const res = (r.resolution||'').toLowerCase(); return res.includes('720') || t.includes('720'); } },
              ];
              const available = labels.filter(l => realMagnets.some(l.test));
              const hasUnknown = realMagnets.some(r => { const t = (r.title||'').toLowerCase(); const res = (r.resolution||'').toLowerCase(); return !labels.some(l => l.test(r)); });
              return [
                <button key="全部" onClick={() => setQualityFilter('全部')} className="px-3 py-1 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: qualityFilter === '全部' ? 'var(--accent)' : 'var(--bg-primary)', color: qualityFilter === '全部' ? '#fff' : 'var(--text-secondary)', border: qualityFilter === '全部' ? 'none' : '1px solid var(--border-color)' }}>全部</button>,
                ...available.map(l => (
                  <button key={l.key} onClick={() => setQualityFilter(l.key)} className="px-3 py-1 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: qualityFilter === l.key ? 'var(--accent)' : 'var(--bg-primary)', color: qualityFilter === l.key ? '#fff' : 'var(--text-secondary)', border: qualityFilter === l.key ? 'none' : '1px solid var(--border-color)' }}>{l.key}</button>
                )),
                hasUnknown ? <button key="未知" onClick={() => setQualityFilter('未知')} className="px-3 py-1 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: qualityFilter === '未知' ? 'var(--accent)' : 'var(--bg-primary)', color: qualityFilter === '未知' ? '#fff' : 'var(--text-secondary)', border: qualityFilter === '未知' ? 'none' : '1px solid var(--border-color)' }}>未知</button> : null,
              ].filter(Boolean);
            })()}
          </div>
        )}
        {activeTab === 'magnet' ? (
          filteredMagnets.length === 0 ? <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>暂无磁力链接</p> : (
            <div className="space-y-2">
              {filteredMagnets.map(r => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-3 min-w-0 flex-1"><span className="text-lg shrink-0">🧲</span><div className="min-w-0 flex-1"><p className="text-sm font-medium break-all sm:truncate" style={{ color: 'var(--text-primary)' }}>{r.resolution && <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>{r.resolution}</span>}{r.title || '磁力链接'}</p></div></div>
                  <button onClick={() => copyLink(r.magnetUrl || '', r.id)} className="shrink-0 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all" style={{ backgroundColor: copiedId === r.id ? '#6b7280' : 'var(--accent)' }}>{copiedId === r.id ? '已复制 ✓' : '复制链接'}</button>
                </div>
              ))}
            </div>
          )
        ) : (
          realClouds.length === 0 ? <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>暂无网盘资源</p> : (
            <div className="space-y-2">
              {realClouds.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-3 min-w-0 flex-1"><span className="text-lg shrink-0">☁️</span><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.title || '网盘资源'}</p>{r.storageName && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.storageName}</p>}</div></div>
                  <button onClick={() => copyLink(r.shareUrl || '', r.id)} className="shrink-0 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all" style={{ backgroundColor: copiedId === r.id ? '#6b7280' : 'var(--accent)' }}>{copiedId === r.id ? '已复制 ✓' : '复制链接'}</button>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </div>
    <CollectModal
      open={collectOpen}
      onClose={() => setCollectOpen(false)}
      movieId={movie.id}
      contentType="movie"
      movieTitle={movie.title}
    />
    </>
  );
}
