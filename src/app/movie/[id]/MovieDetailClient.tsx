// @ts-nocheck
'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { cleanTitle as cleanTitleUtil, cleanStoryline } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import { listApi, statusApi } from '@/lib/userApi';
import { useToast } from '@/components/Toast';
import dynamic from 'next/dynamic';

const CollectModal = dynamic(() => import('@/components/CollectModal'), { ssr: false });
const WatchedModal = dynamic(() => import('@/components/WatchedModal'), { ssr: false });

interface MovieDetail {
  id: number; title: string; cover: string; year: number; region: string;
  rating?: number; ratingImdb?: number; ratingRT?: number;
  summary: string; genre: string[]; director: string[]; writer: string[]; actor: string[];
  language: string[]; duration?: number; releaseDate?: string; aka: string[];
  updatedAt?: string;
}
interface Resource { id: number; title?: string; magnetUrl?: string; shareUrl?: string; resolution?: string; hasSubtitle?: boolean; storageName?: string; }

interface MovieStatus {
  want_to_watch?: boolean;
  watching?: boolean;
  watched?: boolean;
  watchedRating?: number;
  watchedNote?: string;
  listId?: number;
}

export default function MovieDetailClient({ movie, magnetResources, cloudResources }: {
  movie: MovieDetail; magnetResources: Resource[]; cloudResources: Resource[];
}) {
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'magnet' | 'cloud'>('magnet');
  const [qualityFilter, setQualityFilter] = useState('全部');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const [watchedOpen, setWatchedOpen] = useState(false);
  const [watchedReadOnly, setWatchedReadOnly] = useState(false);
  const [movieStatus, setMovieStatus] = useState<MovieStatus>({});
  const [statusLoading, setStatusLoading] = useState(false);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const { showToast } = useToast();
  const wantClickTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch movie status
  const fetchStatus = useCallback(() => {
    if (!isAuthenticated) return;
    setStatusLoading(true);
    statusApi.get(movie.id, 'movie').then(res => {
      const data = res.data.data || res.data;
      const status: MovieStatus = {};
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.added) {
            if (item.type === 'want_to_watch') status.want_to_watch = true;
            if (item.type === 'watching') status.watching = true;
            if (item.type === 'watched') {
              status.watched = true;
              if (item.userRating) status.watchedRating = Number(item.userRating);
              if (item.note) status.watchedNote = item.note;
            }
          }
        });
      }
      setMovieStatus(status);
    }).catch(() => {}).finally(() => setStatusLoading(false));
  }, [isAuthenticated, movie.id]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Handle want_to_watch: toggle on/off
  const handleWantClick = useCallback(async () => {
    if (!isAuthenticated) return;
    if (movieStatus.watching) { showToast('该影片已被标记为在看', 'warning'); return; }
    if (movieStatus.watched) { showToast('该影片已被标记为看过', 'warning'); return; }
    try {
      const res = await listApi.getAll();
      const lists = res.data.data || res.data;
      const wantList = Array.isArray(lists) ? lists.find((l: any) => l.type === 'want_to_watch') : null;
      if (!wantList) return;
      if (movieStatus.want_to_watch) {
        await listApi.removeItem(wantList.id, { movieId: movie.id, contentType: 'movie' });
        setMovieStatus(prev => ({ ...prev, want_to_watch: false }));
        showToast('已从想看移除', 'success');
      } else {
        await listApi.addItem(wantList.id, { movieId: movie.id, contentType: 'movie' });
        setMovieStatus(prev => ({ ...prev, want_to_watch: true }));
        showToast('已加入想看', 'success');
      }
    } catch {}
  }, [isAuthenticated, movieStatus, movie.id, showToast]);

  // Want button: single click = toggle, double click = open modal
  const handleWantButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (wantClickTimer.current) {
      clearTimeout(wantClickTimer.current);
      wantClickTimer.current = null;
      setCollectOpen(true);
    } else {
      wantClickTimer.current = setTimeout(() => {
        wantClickTimer.current = null;
        handleWantClick();
      }, 250);
    }
  }, [handleWantClick]);

  // Determine which button to show
  const getStatusDisplay = () => {
    if (movieStatus.watched) return { label: '看过', color: '#22c55e', icon: '✓' };
    if (movieStatus.watching) return { label: '在看', color: '#3b82f6', icon: '👁' };
    if (movieStatus.want_to_watch) return { label: '已想看', color: '#f59e0b', icon: '🔖' };
    return null;
  };

  const statusDisplay = getStatusDisplay();

  // Deduplicate magnets
  const realMagnets = useMemo(() => {
    const real = magnetResources.filter(r => r.title !== '磁力下载');
    const realUrls = new Set(real.map(r => r.magnetUrl));
    const dl = magnetResources.filter(r => r.title === '磁力下载' && !realUrls.has(r.magnetUrl));
    return [...real, ...dl];
  }, [magnetResources]);

  // Deduplicate cloud
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

  // Format info rows
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
        <Link href="/" className="hover:opacity-80 active:opacity-60 transition-opacity" style={{ color: 'var(--text-secondary)' }}>首页</Link>
        <span>›</span>
        <Link href="/movie" className="hover:opacity-80 active:opacity-60 transition-opacity" style={{ color: 'var(--text-secondary)' }}>电影</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{movie.title}</span>
      </nav>

      {/* Header: poster + info */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Poster */}
        <div className="w-full sm:w-48 md:w-64 shrink-0 mx-auto sm:mx-0 max-w-[256px]">
          <img src={movie.cover || `https://picsum.photos/seed/m${movie.id}/400/600`} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-xl" />
        </div>

        {/* Info panel */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {cleanTitleUtil(movie.title)}
            {movie.year > 0 && <span className="text-lg font-normal ml-2" style={{ color: 'var(--text-muted)' }}>({movie.year})</span>}
          </h1>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {movieStatus.watched ? (
              /* Already watched: show 收藏 + 看过评分 */
              <>
                <button
                  onClick={() => setCollectOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                  title="选择片单"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>收藏</span>
                </button>
                <button
                  onClick={() => { setWatchedReadOnly(true); setWatchedOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: '#22c55e' }}
                  title="点击查看评价"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>已看过</span>
                  {movieStatus.watchedRating != null && movieStatus.watchedRating > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      {movieStatus.watchedRating.toFixed(1)}
                    </span>
                  )}
                </button>
              </>
            ) : movieStatus.watching ? (
              /* Watching: show 收藏 + 看过 */
              <>
                <button
                  onClick={() => setCollectOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{ borderColor: '#3b82f6', color: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)' }}
                >
                  <span>👁️</span>
                  <span>在看</span>
                </button>
                <button
                  onClick={() => setWatchedOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>看过</span>
                </button>
              </>
            ) : movieStatus.want_to_watch ? (
              /* Want to watch: show 收藏 + 看过 */
              <>
                <button
                  onClick={handleWantButtonClick}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{ borderColor: '#f59e0b', color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)' }}
                  title="单击取消想看，双击选择片单"
                >
                  <span>🔖</span>
                  <span>已想看</span>
                </button>
                <button
                  onClick={() => setWatchedOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>看过</span>
                </button>
              </>
            ) : (
              /* No status: show 想看 + 看过 */
              <>
                <button
                  onClick={handleWantClick}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>想看</span>
                </button>
                <button
                  onClick={() => setWatchedOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>看过</span>
                </button>
              </>
            )}
          </div>

          {/* Ratings */}
          <div className="flex flex-wrap items-center gap-3">
            {movie.rating != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                豆瓣 {movie.rating.toFixed(1)}
              </span>
            )}
            {movie.ratingImdb != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: '#fefce8', color: '#ca8a04' }}>
                IMDB {movie.ratingImdb.toFixed(1)}
              </span>
            )}
            {movie.ratingRT != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                烂番茄 {movie.ratingRT}%
              </span>
            )}
          </div>

          {/* Info grid - reference pkmp4.xyz layout */}
          <div className="mt-2 space-y-2">
            {movie.aka.length > 0 && (
              <InfoRow label="又名">{movie.aka.join(' / ')}</InfoRow>
            )}
            {movie.director.length > 0 && (
              <InfoRow label="导演">
                <span className="hover:underline cursor-pointer" style={{ color: 'var(--accent)' }}>{movie.director.join(' / ')}</span>
              </InfoRow>
            )}
            {movie.writer && movie.writer.length > 0 && (
              <InfoRow label="编剧">
                <span>{movie.writer.join(' / ')}</span>
              </InfoRow>
            )}
            {movie.actor.length > 0 && (
              <InfoRow label="主演">
                <span className="hover:underline cursor-pointer" style={{ color: 'var(--accent)' }}>{movie.actor.join(' / ')}</span>
              </InfoRow>
            )}
            {movie.genre.length > 0 && (
              <InfoRow label="类型">{movie.genre.join(' / ')}</InfoRow>
            )}
            {movie.region && (
              <InfoRow label="地区">{movie.region}</InfoRow>
            )}
            {movie.language.length > 0 && (
              <InfoRow label="语言">{movie.language.join(' / ')}</InfoRow>
            )}
            {movie.releaseDate && (
              <InfoRow label="上映">{movie.releaseDate}</InfoRow>
            )}
            {movie.duration && (
              <InfoRow label="片长">{movie.duration}分钟</InfoRow>
            )}
            {movie.updatedAt && (
              <InfoRow label="更新">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(movie.updatedAt).toLocaleString('zh-CN')}</span>
              </InfoRow>
            )}
          </div>
        </div>
      </div>

      {/* Synopsis */}
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

      {/* Download resources */}
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
      onClose={() => { setCollectOpen(false); fetchStatus(); }}
      movieId={movie.id}
      contentType="movie"
      movieTitle={movie.title}
    />
    <WatchedModal
      open={watchedOpen}
      onClose={() => { setWatchedOpen(false); setWatchedReadOnly(false); fetchStatus(); }}
      movieId={movie.id}
      contentType="movie"
      movieTitle={movie.title}
      initialRating={watchedReadOnly ? movieStatus.watchedRating : undefined}
      initialNote={watchedReadOnly ? movieStatus.watchedNote : undefined}
      isReadOnly={watchedReadOnly}
      onEdit={() => setWatchedReadOnly(false)}
    />
    </>
  );
}
