// @ts-nocheck
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cleanTitle as cleanTitleUtil, cleanStoryline } from '@/lib/utils';
import { useDetailStatus } from '@/hooks/useDetailStatus';
import DetailButtons from '@/components/DetailButtons';

interface MovieDetail {
  id: number; title: string; cover: string; year: number; region: string;
  rating?: number; ratingImdb?: number; ratingRT?: number;
  summary: string; genre: string[]; director: string[]; writer: string[]; actor: string[];
  language: string[]; duration?: number; releaseDate?: string; aka: string[];
  updatedAt?: string;
}
interface Resource { id: number; title?: string; magnetUrl?: string; shareUrl?: string; resolution?: string; hasSubtitle?: boolean; storageName?: string; }

export default function MovieDetailClient({ movie, magnetResources, cloudResources }: {
  movie: MovieDetail; magnetResources: Resource[]; cloudResources: Resource[];
}) {
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'magnet' | 'cloud'>('magnet');
  const [qualityFilter, setQualityFilter] = useState('全部');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const ds = useDetailStatus(movie.id, 'movie');

  const realMagnets = useMemo(() => {
    const real = magnetResources.filter(r => r.title !== '磁力下载');
    const realUrls = new Set(real.map(r => r.magnetUrl));
    const dl = magnetResources.filter(r => r.title === '磁力下载' && !realUrls.has(r.magnetUrl));
    return [...real, ...dl];
  }, [magnetResources]);

  const realClouds = useMemo(() => {
    const real = cloudResources.filter(r => r.title !== '网盘下载');
    const realUrls = new Set(real.map(r => r.shareUrl));
    const dl = cloudResources.filter(r => r.title === '网盘下载' && !realUrls.has(r.shareUrl));
    return [...real, ...dl];
  }, [cloudResources]);

  const copyLink = (url: string, resId: number) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => { setCopiedId(resId); setTimeout(() => setCopiedId(null), 2000); });
    } else {
      const ta = document.createElement('textarea'); ta.value = url; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); setCopiedId(resId); setTimeout(() => setCopiedId(null), 2000); } catch {} document.body.removeChild(ta);
    }
  };

  const filteredMagnets = qualityFilter === '全部' ? realMagnets : realMagnets.filter(r => {
    const t = (r.title || '').toLowerCase(); const res = (r.resolution || '').toLowerCase();
    if (qualityFilter === '4K') return res.includes('4k') || t.includes('4k');
    if (qualityFilter === '特效1080P') return (res.includes('1080') || t.includes('1080')) && t.includes('特效');
    if (qualityFilter === '中字1080P') return (res.includes('1080') || t.includes('1080')) && t.includes('中字') && !t.includes('特效');
    if (qualityFilter === '1080P') return (res.includes('1080') || t.includes('1080')) && !t.includes('中字') && !t.includes('特效');
    if (qualityFilter === '720P') return res.includes('720') || t.includes('720');
    if (qualityFilter === '未知') return !(res.includes('4k')||t.includes('4k'))&&!((res.includes('1080')||t.includes('1080'))&&t.includes('特效'))&&!((res.includes('1080')||t.includes('1080'))&&t.includes('中字')&&!t.includes('特效'))&&!((res.includes('1080')||t.includes('1080'))&&!t.includes('中字')&&!t.includes('特效'))&&!(res.includes('720')||t.includes('720'));
    return false;
  });

  const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex gap-2 text-sm leading-relaxed">
      <span className="shrink-0 font-medium" style={{ color: 'var(--text-muted)', minWidth: '3.5em' }}>{label}</span>
      <div style={{ color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  );

  return (
    <>
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)' }}>首页</Link><span>›</span>
        <Link href="/movie" style={{ color: 'var(--text-secondary)' }}>电影</Link><span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{movie.title}</span>
      </nav>

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-48 md:w-64 shrink-0 mx-auto sm:mx-0 max-w-[256px]">
          <img src={movie.cover || `https://picsum.photos/seed/m${movie.id}/400/600`} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-xl" />
        </div>
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {cleanTitleUtil(movie.title)}{movie.year > 0 && <span className="text-lg font-normal ml-2" style={{ color: 'var(--text-muted)' }}>({movie.year})</span>}
          </h1>

          <DetailButtons contentId={movie.id} contentType="movie" contentTitle={movie.title}
            status={ds.status} collectOpen={ds.collectOpen} watchedOpen={ds.watchedOpen} watchedReadOnly={ds.watchedReadOnly}
            onWantButtonClick={ds.handleWantButtonClick} onWatchedClick={ds.handleWatchedClick}
            onCollectClose={ds.handleCollectClose} onWatchedClose={ds.handleWatchedClose}
            onWatchedEdit={ds.handleWatchedEdit} onCollectOpen={() => ds.setCollectOpen(true)} />

          <div className="flex flex-wrap items-center gap-3">
            {movie.rating != null && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: 'var(--badge-douban-bg)', color: 'var(--badge-douban-text)' }}>豆瓣 {movie.rating.toFixed(1)}</span>}
            {movie.ratingImdb != null && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: 'var(--badge-imdb-bg)', color: 'var(--badge-imdb-text)' }}>IMDB {movie.ratingImdb.toFixed(1)}</span>}
            {movie.ratingRT != null && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: 'var(--badge-rt-bg)', color: 'var(--badge-rt-text)' }}>烂番茄 {movie.ratingRT}%</span>}
          </div>

          <div className="mt-2 space-y-2">
            {movie.aka.length > 0 && <InfoRow label="又名">{movie.aka.join(' / ')}</InfoRow>}
            {movie.director.length > 0 && <InfoRow label="导演"><span style={{ color: 'var(--accent)' }}>{movie.director.join(' / ')}</span></InfoRow>}
            {movie.writer && movie.writer.length > 0 && <InfoRow label="编剧">{movie.writer.join(' / ')}</InfoRow>}
            {movie.actor.length > 0 && <InfoRow label="主演"><span style={{ color: 'var(--accent)' }}>{movie.actor.join(' / ')}</span></InfoRow>}
            {movie.genre.length > 0 && <InfoRow label="类型">{movie.genre.join(' / ')}</InfoRow>}
            {movie.region && <InfoRow label="地区">{movie.region}</InfoRow>}
            {movie.language.length > 0 && <InfoRow label="语言">{movie.language.join(' / ')}</InfoRow>}
            {movie.releaseDate && <InfoRow label="上映">{movie.releaseDate}</InfoRow>}
            {movie.duration && <InfoRow label="片长">{movie.duration}分钟</InfoRow>}
            {movie.updatedAt && <InfoRow label="更新"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(movie.updatedAt).toLocaleString('zh-CN')}</span></InfoRow>}
          </div>
        </div>
      </div>

      {movie.summary && (
        <section className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>简介</h2>
          <p className={`text-sm leading-relaxed ${synopsisExpanded ? '' : 'line-clamp-3'}`} style={{ color: 'var(--text-secondary)' }}>{cleanStoryline(movie.summary)}</p>
          {cleanStoryline(movie.summary).length > 200 && (
            <button onClick={() => setSynopsisExpanded(!synopsisExpanded)} className="mt-3 text-sm font-medium flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              {synopsisExpanded ? '收起' : '展开全部'}
              <svg className={`w-4 h-4 transition-transform ${synopsisExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          )}
        </section>
      )}

      <section className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>下载资源</h2>
        <div className="flex gap-6 border-b mb-4" style={{ borderColor: 'var(--border-color)' }}>
          {[{ key: 'magnet' as const, label: '磁力链接', count: realMagnets.length }, { key: 'cloud' as const, label: '网盘资源', count: realClouds.length }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="pb-3 text-sm font-medium border-b-2" style={{ color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)', borderColor: activeTab === tab.key ? 'var(--accent)' : 'transparent' }}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        {activeTab === 'magnet' ? (
          filteredMagnets.length === 0 ? <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>暂无磁力链接</p> : (
            <div className="space-y-2">{filteredMagnets.map(r => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3 min-w-0 flex-1"><span className="text-lg shrink-0">🧲</span><div className="min-w-0 flex-1"><p className="text-sm font-medium break-all sm:truncate" style={{ color: 'var(--text-primary)' }}>{r.resolution && <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>{r.resolution}</span>}{r.title || '磁力链接'}</p></div></div>
                <button onClick={() => copyLink(r.magnetUrl || '', r.id)} className="shrink-0 px-4 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: copiedId === r.id ? 'var(--copied-bg)' : 'var(--accent)' }}>{copiedId === r.id ? '已复制 ✓' : '复制链接'}</button>
              </div>
            ))}</div>
          )
        ) : (
          realClouds.length === 0 ? <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>暂无网盘资源</p> : (
            <div className="space-y-2">{realClouds.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3 min-w-0 flex-1"><span className="text-lg shrink-0">☁️</span><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.title || '网盘资源'}</p>{r.storageName && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.storageName}</p>}</div></div>
                <button onClick={() => copyLink(r.shareUrl || '', r.id)} className="shrink-0 px-4 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: copiedId === r.id ? 'var(--copied-bg)' : 'var(--accent)' }}>{copiedId === r.id ? '已复制 ✓' : '复制链接'}</button>
              </div>
            ))}</div>
          )
        )}
      </section>
    </div>
    </>
  );
}
