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
  ResourceTabs,
  CopyableResourceList,
  DetailPageSkeleton,
  DetailNotFound,
} from '@/components/detail/DetailComponents';
import RelatedSection from '@/components/RelatedSection';
import TagChips from '@/components/TagChips';

/** 在线播放资源 */
interface OnlineResourceItem {
  id: number;
  sourceName: string;
  sourceUrl: string;
  sort?: number;
}

/** 磁力链接资源 */
interface MagnetResourceItem {
  id: number;
  title: string;
  magnetUrl: string;
  resolution?: string;
}

/** 网盘资源 */
interface CloudResourceItem {
  id: number;
  title: string;
  shareUrl: string;
  storageName?: string;
}

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
  const [onlineResources, setOnlineResources] = useState<OnlineResourceItem[]>([]);
  const [magnetResources, setMagnetResources] = useState<MagnetResourceItem[]>([]);
  const [cloudResources, setCloudResources] = useState<CloudResourceItem[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceError, setResourceError] = useState(false);
  const [downloadTab, setDownloadTab] = useState<'magnet' | 'cloud'>('magnet');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const ds = useDetailStatus(item.id, contentType);

  // Fetch all resources when episode changes
  useEffect(() => {
    if (!hasEpisodes) return;
    setLoadingResources(true);
    setResourceError(false);
    const ep = selectedEpisode ?? undefined;

    Promise.all([
      resourceApi.online(contentType, item.id, ep).then((res) => { const d = (res.data as { data?: OnlineResourceItem[] } | undefined)?.data; setOnlineResources(Array.isArray(d) ? d : []); return d; }),
      resourceApi.magnet(contentType, item.id, ep).then((res) => { const d = (res.data as { data?: MagnetResourceItem[] } | undefined)?.data; setMagnetResources(Array.isArray(d) ? d : []); return d; }),
      resourceApi.cloud(contentType, item.id, ep).then((res) => { const d = (res.data as { data?: CloudResourceItem[] } | undefined)?.data; setCloudResources(Array.isArray(d) ? d : []); return d; }),
    ])
      .catch(e => {
        console.error('加载在线资源失败', e);
        setOnlineResources([]);
        setMagnetResources([]);
        setCloudResources([]);
        setResourceError(true);
      })
      .finally(() => setLoadingResources(false));
  }, [contentType, item.id, selectedEpisode, hasEpisodes]);

  const copyLink = (url: string, resId: number) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => { setCopiedId(resId); setTimeout(() => setCopiedId(null), 2000); });
    } else {
      const ta = document.createElement('textarea'); ta.value = url; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); setCopiedId(resId); setTimeout(() => setCopiedId(null), 2000); } catch {} document.body.removeChild(ta);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <DetailBreadcrumb
        items={[
          { label: '首页', href: '/' },
          { label: listLabel, href: listPath },
          { label: item.title },
        ]}
      />

      <div className="flex flex-col sm:flex-row gap-6 items-stretch">
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

          <TagChips contentType={contentType} contentId={item.id} />

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
                <span className="text-xs text-muted-foreground" >
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

          {resourceError ? (
            <section className="rounded-xl p-5 border">
              <div className="text-center py-8">
                <p className="text-3xl mb-2">😵</p>
                <p className="text-sm text-muted-foreground">资源加载失败</p>
                <button
                  onClick={() => {
                    const ep = selectedEpisode ?? undefined;
                    setLoadingResources(true);
                    setResourceError(false);
                    Promise.all([
                      resourceApi.online(contentType, item.id, ep).then((res) => { const d = (res.data as { data?: OnlineResourceItem[] } | undefined)?.data; setOnlineResources(Array.isArray(d) ? d : []); return d; }),
                      resourceApi.magnet(contentType, item.id, ep).then((res) => { const d = (res.data as { data?: MagnetResourceItem[] } | undefined)?.data; setMagnetResources(Array.isArray(d) ? d : []); return d; }),
                      resourceApi.cloud(contentType, item.id, ep).then((res) => { const d = (res.data as { data?: CloudResourceItem[] } | undefined)?.data; setCloudResources(Array.isArray(d) ? d : []); return d; }),
                    ]).catch(() => setResourceError(true)).finally(() => setLoadingResources(false));
                  }}
                  className="mt-3 text-sm font-medium text-accent active:opacity-70"
                >
                  重新加载
                </button>
              </div>
            </section>
          ) : (
            <>
              <OnlineResourceGrid
                resources={onlineResources}
                loading={loadingResources}
                selectedEpisode={selectedEpisode}
                episodeLabel={episodeLabel}
              />

              <ResourceTabs
                tabs={[
                  { key: 'magnet', label: '磁力链接', count: magnetResources.length },
                  { key: 'cloud', label: '网盘资源', count: cloudResources.length },
                ]}
                activeTab={downloadTab}
                onTabChange={(key) => setDownloadTab(key as 'magnet' | 'cloud')}
              >
                {loadingResources ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => (
                      <div key={i} className="h-14 rounded-lg animate-pulse bg-background" />
                    ))}
                  </div>
                ) : downloadTab === 'magnet' ? (
                  <CopyableResourceList
                    resources={magnetResources.map((r: MagnetResourceItem) => ({ id: r.id, title: r.title, url: r.magnetUrl, resolution: r.resolution }))}
                    copiedId={copiedId}
                    onCopy={copyLink}
                    icon="🧲"
                    emptyText={selectedEpisode ? `该${episodeLabel}暂无磁力链接` : '暂无磁力链接'}
                  />
                ) : (
                  <CopyableResourceList
                    resources={cloudResources.map((r: CloudResourceItem) => ({ id: r.id, title: r.title, url: r.shareUrl, storageName: r.storageName }))}
                    copiedId={copiedId}
                    onCopy={copyLink}
                    icon="☁️"
                    emptyText={selectedEpisode ? `该${episodeLabel}暂无网盘资源` : '暂无网盘资源'}
                  />
                )}
              </ResourceTabs>
            </>
          )}
        </>
      )}

      <RelatedSection contentType={contentType} contentId={item.id} />
    </div>
  );
}
