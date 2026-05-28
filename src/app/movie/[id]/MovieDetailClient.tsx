'use client';

import { useState, useMemo } from 'react';
import { cleanTitle as cleanTitleUtil, cleanStoryline } from '@/lib/utils';
import { useDetailStatus } from '@/hooks/useDetailStatus';
import DetailButtons from '@/components/DetailButtons';
import {
  DetailBreadcrumb, DetailCover, DetailTitle, RatingBadges,
  InfoRow, SynopsisSection, OnlineResourceGrid, ResourceTabs, CopyableResourceList,
  DetailPageSkeleton, DetailNotFound,
} from '@/components/detail/DetailComponents';
import VideoPlayer, { type PlayerSource } from '@/components/VideoPlayer';
import RelatedSection from '@/components/RelatedSection';
import RatingDistribution from '@/components/detail/RatingDistribution';
import TagChips from '@/components/TagChips';

interface MovieDetail {
  id: number; title: string; cover: string; year: number; region: string;
  rating?: number; ratingImdb?: number; ratingRT?: number;
  summary: string; genre: string[]; director: string[]; writer: string[]; actor: string[];
  language: string[]; duration?: number; releaseDate?: string; aka: string[];
  updatedAt?: string;
}
interface Resource { id: number; title?: string; magnetUrl?: string; shareUrl?: string; resolution?: string; hasSubtitle?: boolean; storageName?: string; }
interface OnlineResource { id: number; sourceName?: string; sourceUrl?: string; }

export default function MovieDetailClient({ movie, magnetResources, cloudResources, onlineResources = [] }: {
  movie: MovieDetail; magnetResources: Resource[]; cloudResources: Resource[]; onlineResources?: OnlineResource[];
}) {
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'magnet' | 'cloud'>('magnet');
  const [qualityFilter, setQualityFilter] = useState('全部');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [playerSrc, setPlayerSrc] = useState<string | undefined>(
    onlineResources.length > 0 ? onlineResources[0].sourceUrl : undefined
  );
  const [playerSourceId, setPlayerSourceId] = useState<number | null>(
    onlineResources.length > 0 ? onlineResources[0].id : null
  );
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
    const t = (r.title || '').toLowerCase();
    const res = (r.resolution || '').toLowerCase();
    const has1080 = res.includes('1080') || t.includes('1080');
    const has720 = res.includes('720') || t.includes('720');
    const has4k = res.includes('4k') || t.includes('4k');
    const has特效 = t.includes('特效');
    const has中字 = t.includes('中字');

    switch (qualityFilter) {
      case '4K': return has4k;
      case '特效1080P': return has1080 && has特效;
      case '中字1080P': return has1080 && has中字 && !has特效;
      case '1080P': return has1080 && !has中字 && !has特效;
      case '720P': return has720;
      case '未知': return !has4k && !(has1080 && has特效) && !(has1080 && has中字 && !has特效) && !(has1080 && !has中字 && !has特效) && !has720;
      default: return false;
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <DetailBreadcrumb items={[
        { label: '首页', href: '/' },
        { label: '电影', href: '/movie' },
        { label: movie.title },
      ]} />

      <div className="flex flex-col sm:flex-row gap-6 animate-fade-in-up stagger-3">
        <DetailCover src={movie.cover} alt={movie.title} seed={`m${movie.id}`} />
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <DetailTitle title={cleanTitleUtil(movie.title)} year={movie.year} />

          <DetailButtons contentId={movie.id} contentType="movie" contentTitle={movie.title}
            status={ds.status} collectOpen={ds.collectOpen} watchedOpen={ds.watchedOpen} watchedReadOnly={ds.watchedReadOnly}
            onWantButtonClick={ds.handleWantButtonClick} onWatchedClick={ds.handleWatchedClick}
            onCollectClose={ds.handleCollectClose} onWatchedClose={ds.handleWatchedClose}
            onWatchedEdit={ds.handleWatchedEdit} onCollectOpen={() => ds.setCollectOpen(true)} />

          <RatingBadges douban={movie.rating} imdb={movie.ratingImdb} rt={movie.ratingRT} />

          <TagChips contentType="movie" contentId={movie.id} />

          <div className="mt-2 space-y-2 animate-fade-in-up stagger-4">
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

      <div className="animate-fade-in-up stagger-7">
        <RatingDistribution douban={movie.rating} imdb={movie.ratingImdb} rt={movie.ratingRT} />
      </div>

      {/* 视频播放器 */}
      <VideoPlayer
        src={playerSrc}
        title={movie.title}
        contentId={movie.id}
        contentType="movie"
        cover={movie.cover}
        year={movie.year}
        rating={movie.rating}
        sources={onlineResources.map((r) => ({
          id: r.id,
          sourceName: r.sourceName,
          sourceUrl: r.sourceUrl,
        }))}
        onSourceChange={(s) => {
          setPlayerSrc(s.sourceUrl);
          setPlayerSourceId(s.id);
        }}
      />

      {/* 在线播放源 */}
      {onlineResources.length > 0 && (
        <OnlineResourceGrid
          resources={onlineResources}
          loading={false}
          onPlay={(r) => {
            if (r.sourceUrl) {
              setPlayerSrc(r.sourceUrl);
              setPlayerSourceId(r.id);
            }
          }}
          activeSourceId={playerSourceId}
        />
      )}

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

      <div className="animate-fade-in-up stagger-10">
        <RelatedSection contentType="movie" contentId={movie.id} />
      </div>
    </div>
  );
}
