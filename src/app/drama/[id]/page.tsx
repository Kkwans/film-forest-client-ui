// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { dramaApi } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil, cleanStoryline } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';
import dynamic from 'next/dynamic';

const CollectModal = dynamic(() => import('@/components/CollectModal'), { ssr: false });

interface DramaDetail {
  id: number;
  title: string;
  cover: string;
  year: number;
  region: string;
  rating?: number;
  summary?: string;
  status?: string;
  totalEpisode?: number;
  currentEpisode?: number;
  genre?: string[];
  director?: string[];
  actor?: string[];
  language?: string[];
}

export default function DramaDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [item, setItem] = useState<DramaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'episode'>('info');
  const [collectOpen, setCollectOpen] = useState(false);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  const { onlineResources: realOnline, loading: resourcesLoading } = useResource('drama', id);
  const { onlineResources: epOnline } = useResource('drama', id, selectedEpisode || undefined);

  useEffect(() => { if (id) fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await dramaApi.detail(id) as any;
      const d = res.data?.data || res.data;
      if (d && d.id) {
        setItem({
          id: d.id, title: d.title, cover: d.posterUrl, year: d.year,
          region: parseRegion(d.region).join(' / '),
          rating: d.scoreDouban, summary: cleanStoryline(d.storyline),
          status: d.status === 1 ? '更新中' : '已完结',
          totalEpisode: d.totalEpisode, currentEpisode: d.currentEpisode,
          genre: parseGenre(d.genre),
          director: Array.isArray(d.director) ? d.director : (d.director ? JSON.parse(d.director) : []),
          actor: Array.isArray(d.actor) ? d.actor : (d.actor ? JSON.parse(d.actor) : []),
          language: Array.isArray(d.language) ? d.language : (d.language ? [d.language] : []),
        });
      }
    } catch { setItem(null); } finally { setLoading(false); }
  };

  const displayOnline = selectedEpisode ? epOnline : realOnline;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-full sm:w-48 md:w-64 aspect-[2/3] rounded-xl max-w-[256px] mx-auto sm:mx-0" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-48 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-4 w-32 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-16">
        <p style={{ color: 'var(--text-secondary)' }}>剧集不存在</p>
        <Link href="/drama" className="text-sm mt-4 inline-block" style={{ color: 'var(--accent)' }}>← 返回剧集列表</Link>
      </div>
    );
  }

  const mockEpisodes = Array.from({ length: item.totalEpisode || 0 }, (_, i) => i + 1);

  return (
    <>
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)' }}>首页</Link><span>›</span>
        <Link href="/drama" style={{ color: 'var(--text-secondary)' }}>电视剧</Link><span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{item.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-48 md:w-64 shrink-0 mx-auto sm:mx-0 max-w-[256px]">
          <img src={item.cover || `https://picsum.photos/seed/d${id}/400/600`} alt={item.title} className="w-full aspect-[2/3] object-cover rounded-xl" />
        </div>
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span>{cleanTitleUtil(item.title)}</span>
            {item.year > 0 && <span className="text-lg font-normal" style={{ color: 'var(--text-muted)' }}>({item.year})</span>}
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
          {item.rating != null && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium w-fit" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>豆瓣 {item.rating.toFixed(1)}</span>
          )}
          {item.genre && item.genre.length > 0 && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.genre.join(' / ')}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-2">
            {item.director && item.director.length > 0 && <div className="text-sm"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>导演：</span><span style={{ color: 'var(--text-secondary)' }}>{item.director.join(' / ')}</span></div>}
            {item.actor && item.actor.length > 0 && <div className="text-sm sm:col-span-2"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>主演：</span><span style={{ color: 'var(--text-secondary)' }}>{item.actor.join(' / ')}</span></div>}
            {item.language && item.language.length > 0 && <div className="text-sm"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>语言：</span><span style={{ color: 'var(--text-secondary)' }}>{item.language.join(' / ')}</span></div>}
            <div className="text-sm"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>集数：</span><span style={{ color: 'var(--text-secondary)' }}>{item.totalEpisode || '-'}集</span></div>
            <div className="text-sm"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>状态：</span><span style={{ color: item.status === '更新中' ? '#f59e0b' : 'var(--text-secondary)' }}>{item.status}</span></div>
          </div>
        </div>
      </div>

      {/* Synopsis */}
      {item.summary && (
        <section className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>简介</h2>
          <p className={`text-sm leading-relaxed ${synopsisExpanded ? '' : 'line-clamp-3'}`} style={{ color: 'var(--text-secondary)' }}>{item.summary}</p>
          {item.summary.length > 200 && (
            <button onClick={() => setSynopsisExpanded(!synopsisExpanded)} className="mt-3 text-sm font-medium active:opacity-70 transition-opacity flex items-center gap-1" style={{ color: 'var(--accent)' }}>
              {synopsisExpanded ? '收起' : '展开全部'}
              <svg className={`w-4 h-4 transition-transform ${synopsisExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          )}
        </section>
      )}

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex gap-6">
          {(['info', 'episode'] as const).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setSelectedEpisode(null); }}
              className="pb-3 text-sm font-medium border-b-2 transition-colors"
              style={{ color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)', borderColor: activeTab === tab ? 'var(--accent)' : 'transparent' }}>
              {tab === 'info' ? '详情' : '剧集列表'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'episode' && mockEpisodes.length > 0 && (
        <div>
          <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>全部剧集 ({item.totalEpisode}集)</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {mockEpisodes.map((ep) => (
              <button key={ep} onClick={() => setSelectedEpisode(selectedEpisode === ep ? null : ep)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ backgroundColor: selectedEpisode === ep ? 'var(--accent)' : 'var(--bg-card)', color: selectedEpisode === ep ? '#fff' : 'var(--text-primary)', border: selectedEpisode === ep ? 'none' : '1px solid var(--border-color)' }}>
                {ep}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resources */}
      <section className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {selectedEpisode ? `第${selectedEpisode}集 播放源` : '在线播放'}
        </h3>
        {resourcesLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2].map((i) => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-primary)' }} />)}</div>
        ) : displayOnline.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>{selectedEpisode ? '该集暂无资源' : '暂无在线播放资源'}</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {displayOnline.map((r) => (
              <a key={r.id} href={r.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.sourceName}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>播放</span>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
    <CollectModal
      open={collectOpen}
      onClose={() => setCollectOpen(false)}
      movieId={id}
      contentType="drama"
      movieTitle={item.title}
    />
    </>
  );
}
