// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { varietyApi } from '@/lib/api';
import { useResource } from '@/hooks/useResource';
import { parseRegion, parseGenre, cleanTitle as cleanTitleUtil, cleanStoryline } from '@/lib/utils';
import { useDetailStatus } from '@/hooks/useDetailStatus';
import DetailButtons from '@/components/DetailButtons';

interface VarietyDetail {
  id: number; title: string; cover: string; year: number; region: string;
  rating?: number; summary?: string; status?: string; totalEpisode?: number;
  genre?: string[];
}

export default function VarietyDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [item, setItem] = useState<VarietyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'episode'>('info');
  const ds = useDetailStatus(id, 'variety');

  const { onlineResources: realOnline, loading: resourcesLoading } = useResource('variety', id);
  const { onlineResources: epOnline } = useResource('variety', id, selectedEpisode || undefined);

  useEffect(() => { if (id) fetchDetail(); }, [id]);



  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await varietyApi.detail(id) as any;
      const d = res.data?.data || res.data;
      if (d && d.id) {
        setItem({
          id: d.id, title: d.title, cover: d.posterUrl, year: d.year,
          region: parseRegion(d.region).join(' / '),
          rating: d.scoreDouban, summary: cleanStoryline(d.storyline),
          status: d.status === 1 ? '更新中' : '已完结',
          totalEpisode: d.totalEpisode, genre: parseGenre(d.genre),
        });
      }
    } catch { setItem(null); } finally { setLoading(false); }
  };

  const displayOnline = selectedEpisode ? epOnline : realOnline;

  if (loading) return <div className="flex flex-col gap-6 animate-pulse"><div className="flex flex-col sm:flex-row gap-6"><div className="w-full sm:w-48 md:w-64 aspect-[2/3] rounded-xl max-w-[256px] mx-auto sm:mx-0" style={{ backgroundColor: 'var(--bg-card)' }} /><div className="flex-1 space-y-4"><div className="h-8 w-48 rounded" style={{ backgroundColor: 'var(--bg-card)' }} /></div></div></div>;
  if (!item) return <div className="text-center py-16"><p style={{ color: 'var(--text-secondary)' }}>综艺不存在</p><Link href="/variety" className="text-sm mt-4 inline-block" style={{ color: 'var(--accent)' }}>← 返回综艺列表</Link></div>;

  const mockEpisodes = Array.from({ length: item.totalEpisode || 0 }, (_, i) => i + 1);

  return (
    <>
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--text-secondary)' }}>首页</Link><span>›</span>
        <Link href="/variety" style={{ color: 'var(--text-secondary)' }}>综艺</Link><span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{item.title}</span>
      </nav>

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-48 md:w-64 shrink-0 mx-auto sm:mx-0 max-w-[256px]">
          <img src={item.cover || `https://picsum.photos/seed/v${id}/400/600`} alt={item.title} className="w-full aspect-[2/3] object-cover rounded-xl" />
        </div>
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{cleanTitleUtil(item.title)}{item.year > 0 && <span className="text-lg font-normal ml-2" style={{ color: 'var(--text-muted)' }}>({item.year})</span>}</h1>
          {item.rating != null && <span className="inline-flex items-center px-2 py-1 rounded text-sm font-medium w-fit" style={{ backgroundColor: 'var(--badge-douban-bg)', color: 'var(--badge-douban-text)' }}>豆瓣 {item.rating.toFixed(1)}</span>}
          {item.genre && item.genre.length > 0 && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.genre.join(' / ')}</p>}
          <div className="flex flex-wrap gap-4 text-sm mt-2">
            <span style={{ color: 'var(--text-secondary)' }}>{item.totalEpisode || '-'}期</span>
            <span style={{ color: item.status === '更新中' ? 'var(--status-updating)' : 'var(--text-secondary)' }}>{item.status}</span>
          </div>
        </div>
      </div>

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

      <DetailButtons contentId={id} contentType="variety" contentTitle={item.title}
        status={ds.status} collectOpen={ds.collectOpen} watchedOpen={ds.watchedOpen} watchedReadOnly={ds.watchedReadOnly}
        onWantButtonClick={ds.handleWantButtonClick} onWatchedClick={ds.handleWatchedClick}
        onCollectClose={ds.handleCollectClose} onWatchedClose={ds.handleWatchedClose}
        onWatchedEdit={ds.handleWatchedEdit} onCollectOpen={() => ds.setCollectOpen(true)} />

      <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex gap-6">
          {(['info', 'episode'] as const).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setSelectedEpisode(null); }} className="pb-3 text-sm font-medium border-b-2 transition-colors"
              style={{ color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)', borderColor: activeTab === tab ? 'var(--accent)' : 'transparent' }}>
              {tab === 'info' ? '详情' : '期数列表'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'episode' && mockEpisodes.length > 0 && (
        <div>
          <h3 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>全部期数 ({item.totalEpisode}期)</h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {mockEpisodes.map((ep) => (
              <button key={ep} onClick={() => setSelectedEpisode(selectedEpisode === ep ? null : ep)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ backgroundColor: selectedEpisode === ep ? 'var(--accent)' : 'var(--bg-card)', color: selectedEpisode === ep ? '#fff' : 'var(--text-primary)', border: selectedEpisode === ep ? 'none' : '1px solid var(--border-color)' }}>{ep}</button>
            ))}
          </div>
        </div>
      )}

      <section className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{selectedEpisode ? `第${selectedEpisode}期 播放源` : '在线播放'}</h3>
        {resourcesLoading ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2].map((i) => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-primary)' }} />)}</div>
        : displayOnline.length === 0 ? <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>{selectedEpisode ? '该期暂无资源' : '暂无在线播放资源'}</p>
        : <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{displayOnline.map((r) => (
            <a key={r.id} href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:opacity-80" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{r.sourceName}</span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>播放</span>
            </a>
          ))}</div>}
      </section>
    </div>

    </>
  );
}
