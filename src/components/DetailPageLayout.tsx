// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { resourceApi } from '@/lib/api';
import DetailButtons from '@/components/DetailButtons';
import { useDetailStatus } from '@/hooks/useDetailStatus';
import {
  DetailBreadcrumb,
  DetailCover,
  DetailTitle,
  RatingBadges,
  InfoRow,
  SynopsisSection,
  DetailTabBar,
  EpisodeGrid,
  OnlineResourceGrid,
  DetailPageSkeleton,
  DetailNotFound,
} from '@/components/detail/DetailComponents';

/** 加载骨架屏（别名） */
export function DetailPageLoading() {
  return <DetailPageSkeleton />;
}

/** 详情页数据项 */
export interface DetailItem {
  id: number;
  title: string;
  cover: string;
  year: number;
  region: string;
  rating?: number;
  ratingImdb?: number;
  ratingRT?: number;
  summary: string;
  status?: string;
  totalEpisode?: number;
  currentEpisode?: number;
  duration?: number;
  genre?: string[];
  director?: string[];
  actor?: string[];
  language?: string[];
  updatedAt?: string;
}

/** 详情页配置 */
interface DetailConfig {
  contentType: string;
  listPath: string;
  listLabel: string;
  episodeLabel?: string;
  hasEpisodes?: boolean;
  updatingText?: string;
}

/** 404 组件（适配旧接口） */
export function DetailPageNotFound({
  listPath,
  listLabel,
  typeName,
}: {
  listPath: string;
  listLabel: string;
  typeName: string;
}) {
  return (
    <DetailNotFound
      message={`${typeName}不存在`}
      backHref={listPath}
      backLabel={`返回${listLabel}`}
    />
  );
}

/** 详情页通用布局 */
export default function DetailPageLayout({
  item,
  config,
}: {
  item: DetailItem;
  config: DetailConfig;
}) {
  const { contentType, listPath, listLabel, episodeLabel = '集', hasEpisodes, updatingText } = config;

  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [onlineResources, setOnlineResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const ds = useDetailStatus(item.id, contentType);

  // Fetch online resources when episode is selected
  useEffect(() => {
    if (!hasEpisodes) return;
    setLoadingResources(true);
    resourceApi
      .online(contentType, item.id, selectedEpisode ?? undefined)
      .then((res) => setOnlineResources(res.data?.data || []))
      .catch(() => setOnlineResources([]))
      .finally(() => setLoadingResources(false));
  }, [contentType, item.id, selectedEpisode, hasEpisodes]);

  return (
    <div className="flex flex-col gap-6">
      <DetailBreadcrumb
        items={[
          { label: '首页', href: '/' },
          { label: listLabel, href: listPath },
          { label: item.title },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-6">
        <DetailCover src={item.cover} alt={item.title} seed={`${contentType[0]}${item.id}`} />
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <DetailTitle title={item.title} year={item.year} />

          <DetailButtons
            contentId={item.id}
            contentType={contentType}
            contentTitle={item.title}
            status={ds.status}
            collectOpen={ds.collectOpen}
            watchedOpen={ds.watchedOpen}
            watchedReadOnly={ds.watchedReadOnly}
            onWantButtonClick={ds.handleWantButtonClick}
            onWatchedClick={ds.handleWatchedClick}
            onCollectClose={ds.handleCollectClose}
            onWatchedClose={ds.handleWatchedClose}
            onWatchedEdit={ds.handleWatchedEdit}
            onCollectOpen={() => ds.setCollectOpen(true)}
          />

          <RatingBadges douban={item.rating} imdb={item.ratingImdb} rt={item.ratingRT} />

          <div className="mt-2 space-y-2">
            {item.status && (
              <InfoRow label="状态" accent={item.status === updatingText}>
                {item.status}
              </InfoRow>
            )}
            {item.genre && item.genre.length > 0 && (
              <InfoRow label="类型">{item.genre.join(' / ')}</InfoRow>
            )}
            {item.director && item.director.length > 0 && (
              <InfoRow label="导演" accent>{item.director.join(' / ')}</InfoRow>
            )}
            {item.actor && item.actor.length > 0 && (
              <InfoRow label="主演" accent>{item.actor.join(' / ')}</InfoRow>
            )}
            {item.region && <InfoRow label="地区">{item.region}</InfoRow>}
            {item.language && item.language.length > 0 && (
              <InfoRow label="语言">{item.language.join(' / ')}</InfoRow>
            )}
            {item.totalEpisode && item.totalEpisode > 0 && (
              <InfoRow label="集数">{item.totalEpisode}{episodeLabel}</InfoRow>
            )}
            {item.duration && item.duration > 0 && (
              <InfoRow label="时长">{item.duration}分钟</InfoRow>
            )}
            {item.updatedAt && (
              <InfoRow label="更新">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(item.updatedAt).toLocaleString('zh-CN')}
                </span>
              </InfoRow>
            )}
          </div>
        </div>
      </div>

      <SynopsisSection
        text={item.summary}
        expanded={synopsisExpanded}
        onToggle={() => setSynopsisExpanded(!synopsisExpanded)}
      />

      {hasEpisodes && item.totalEpisode && item.totalEpisode > 0 && (
        <>
          <EpisodeGrid
            total={item.totalEpisode}
            selected={selectedEpisode}
            onSelect={setSelectedEpisode}
            label={episodeLabel}
          />
          <OnlineResourceGrid
            resources={onlineResources}
            loading={loadingResources}
            selectedEpisode={selectedEpisode}
            episodeLabel={episodeLabel}
          />
        </>
      )}
    </div>
  );
}
