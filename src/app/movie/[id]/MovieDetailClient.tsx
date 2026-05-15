'use client';

import { useState, useMemo } from 'react';
import { cleanTitle as cleanTitleUtil, cleanStoryline } from '@/lib/utils';
import { useDetailStatus } from '@/hooks/useDetailStatus';
import DetailButtons from '@/components/DetailButtons';
import {
  DetailBreadcrumb, DetailCover, DetailTitle, RatingBadges,
  InfoRow, SynopsisSection, ResourceTabs, CopyableResourceList,
  DetailPageSkeleton, DetailNotFound,
} from '@/components/detail/DetailComponents';

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

  return (
    <div className="flex flex-col gap-6">
      <DetailBreadcrumb items={[
        { label: '首页', href: '/' },
        { label: '电影', href: '/movie' },
        { label: movie.title },
      ]} />

      <div className="flex flex-col sm:flex-row gap-6">
        <DetailCover src={movie.cover} alt={movie.title} seed={`m${movie.id}`} />
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <DetailTitle title={cleanTitleUtil(movie.title)} year={movie.year} />

          <DetailButtons contentId={movie.id} contentType="movie" contentTitle={movie.title}
            status={ds.status} collectOpen={ds.collectOpen} watchedOpen={ds.watchedOpen} watchedReadOnly={ds.watchedReadOnly}
            onWantButtonClick={ds.handleWantButtonClick} onWatchedClick={ds.handleWatchedClick}
            onCollectClose={ds.handleCollectClose} onWatchedClose={ds.handleWatchedClose}
            onWatchedEdit={ds.handleWatchedEdit} onCollectOpen={() => ds.setCollectOpen(true)} />

          <RatingBadges douban={movie.rating} imdb={movie.ratingImdb} rt={movie.ratingRT} />

          <div className="mt-2 space-y-2">
            {movie.aka.length > 0 && <InfoRow label="又名">{movie.aka.join(' / ')}</InfoRow>}
            {movie.director.length > 0 && <InfoRow label="导演" accent>{movie.director.join(' / ')}</InfoRow>}
            {movie.writer && movie.writer.length > 0 && <InfoRow label="编剧">{movie.writer.join(' / ')}</InfoRow>}
            {movie.actor.length > 0 && <InfoRow label="主演" accent>{movie.actor.join(' / ')}</InfoRow>}
            {movie.genre.length > 0 && <InfoRow label="类型">{movie.genre.join(' / ')}</InfoRow>}
            {movie.region && <InfoRow label="地区">{movie.region}</InfoRow>}
            {movie.language.length > 0 && <InfoRow label="语言">{movie.language.join(' / ')}</InfoRow>}
            {movie.releaseDate && <InfoRow label="上映">{movie.releaseDate}</InfoRow>}
            {movie.duration && <InfoRow label="片长">{movie.duration}分钟</InfoRow>}
            {movie.updatedAt && (
              <InfoRow label="更新">
                <span className="text-xs text-muted-foreground" >
                  {new Date(movie.updatedAt).toLocaleString('zh-CN')}
                </span>
              </InfoRow>
            )}
          </div>
        </div>
      </div>

      <SynopsisSection
        text={cleanStoryline(movie.summary)}
        expanded={synopsisExpanded}
        onToggle={() => setSynopsisExpanded(!synopsisExpanded)}
      />

      <ResourceTabs
        tabs={[
          { key: 'magnet', label: '磁力链接', count: realMagnets.length },
          { key: 'cloud', label: '网盘资源', count: realClouds.length },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as 'magnet' | 'cloud')}
      >
        {activeTab === 'magnet' ? (
          <CopyableResourceList
            resources={filteredMagnets.map(r => ({ id: r.id, title: r.title, url: r.magnetUrl, resolution: r.resolution }))}
            copiedId={copiedId}
            onCopy={copyLink}
            icon="🧲"
            emptyText="暂无磁力链接"
          />
        ) : (
          <CopyableResourceList
            resources={realClouds.map(r => ({ id: r.id, title: r.title, url: r.shareUrl, storageName: r.storageName }))}
            copiedId={copiedId}
            onCopy={copyLink}
            icon="☁️"
            emptyText="暂无网盘资源"
          />
        )}
      </ResourceTabs>
    </div>
  );
}
