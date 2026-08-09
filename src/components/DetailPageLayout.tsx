'use client';

import { useEffect, useMemo, useState } from 'react';
import { CloudDownload, Magnet, RefreshCw, TriangleAlert } from 'lucide-react';
import { resourceApi } from '@/lib/api';
import DetailButtons from '@/components/DetailButtons';
import { useDetailStatus } from '@/hooks/useDetailStatus';
import VideoPlayer from '@/components/VideoPlayer';
import {
  DetailBreadcrumb,
  DetailCover,
  DetailTitle,
  RatingBadges,
  InfoRow,
  SynopsisSection,
  EpisodeGrid,
  OnlineResourceGrid,
  ResourceTabs,
  CopyableResourceList,
  DetailPageSkeleton,
  DetailNotFound,
} from '@/components/detail/DetailComponents';
import RelatedSection from '@/components/RelatedSection';
import TagChips from '@/components/TagChips';
import RatingDistribution from '@/components/detail/RatingDistribution';
import { usePosterUrl } from '@/hooks/usePosterUrl';
import { useToast } from '@/components/Toast';

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
  hasSubtitle: boolean;
  specialSubtitle: boolean;
  qualityCategory: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 网盘资源 */
interface CloudResourceItem {
  id: number;
  title: string;
  url: string;
  diskType?: string;
  createdAt?: string;
  updatedAt?: string;
}

type ResourceKind = 'online' | 'magnet' | 'cloud';

const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  online: '在线播放',
  magnet: '磁力链接',
  cloud: '网盘资源',
};

const QUALITY_ORDER = [
  '4K', '中字4K', '特效4K',
  '1080p', '中字1080p', '特效1080p',
  '720p', '中字720p', '特效720p',
  '480p', '中字480p', '特效480p',
  '未知',
];

const DISK_LABELS: Record<string, string> = {
  quark: '夸克网盘',
  baidu: '百度网盘',
  xunlei: '迅雷云盘',
  ali: '阿里云盘',
  uc: 'UC 网盘',
  lanzou: '蓝奏云',
  '123': '123 云盘',
};

const SOURCE_TIME_SUFFIX = /\s+(今天|昨天|\d+\s*(?:分钟|小时|天|个月|年)前)$/u;

function resourcePresentation(title: string, timestamp?: string) {
  const match = title.match(SOURCE_TIME_SUFFIX);
  const cleanTitle = match ? title.slice(0, match.index).trim() : title;
  if (match) return { title: cleanTitle, timeLabel: match[1] };
  if (!timestamp) return { title: cleanTitle };
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return { title: cleanTitle };
  return {
    title: cleanTitle,
    timeLabel: `入库 ${new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)}`,
  };
}

function resourceItems<T>(response: { data?: { data?: unknown } }): T[] {
  const data = response.data?.data;
  return Array.isArray(data) ? data as T[] : [];
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
  const [resourceErrors, setResourceErrors] = useState<ResourceKind[]>([]);
  const [resourceReloadKey, setResourceReloadKey] = useState(0);
  const [downloadTab, setDownloadTab] = useState<'magnet' | 'cloud'>('magnet');
  const [magnetQuality, setMagnetQuality] = useState('全部');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [playerSrc, setPlayerSrc] = useState<string | undefined>(undefined);
  const [playerSourceId, setPlayerSourceId] = useState<number | null>(null);

  const ds = useDetailStatus(item.id, contentType);
  const resolvedCover = usePosterUrl(contentType, item.id, item.cover, { enrich: true });
  const { showToast } = useToast();
  const magnetCategories = useMemo(() => Array.from(new Set(
    magnetResources.map((resource) => resource.qualityCategory || '未知'),
  )).sort((left, right) => {
    const leftIndex = QUALITY_ORDER.indexOf(left);
    const rightIndex = QUALITY_ORDER.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, 'zh-CN');
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  }), [magnetResources]);
  const activeMagnetQuality = magnetQuality === '全部' || magnetCategories.includes(magnetQuality)
    ? magnetQuality
    : '全部';
  const visibleMagnets = activeMagnetQuality === '全部'
    ? magnetResources
    : magnetResources.filter((resource) => resource.qualityCategory === activeMagnetQuality);

  // Fetch all resources when episode changes
  useEffect(() => {
    const controller = new AbortController();
    setLoadingResources(true);
    setResourceErrors([]);
    setPlayerSrc(undefined);
    setPlayerSourceId(null);
    setOnlineResources([]);
    setMagnetResources([]);
    setCloudResources([]);
    const ep = selectedEpisode ?? undefined;

    const requests = [
      { kind: 'online' as const, request: resourceApi.online(contentType, item.id, ep, { signal: controller.signal }) },
      { kind: 'magnet' as const, request: resourceApi.magnet(contentType, item.id, ep, { signal: controller.signal }) },
      { kind: 'cloud' as const, request: resourceApi.cloud(contentType, item.id, ep, { signal: controller.signal }) },
    ];

    void Promise.allSettled(requests.map(({ request }) => request))
      .then((results) => {
        if (controller.signal.aborted) return;

        const failed: ResourceKind[] = [];
        results.forEach((result, index) => {
          const kind = requests[index].kind;
          if (result.status === 'rejected') {
            failed.push(kind);
            return;
          }

          if (kind === 'online') setOnlineResources(resourceItems<OnlineResourceItem>(result.value));
          if (kind === 'magnet') setMagnetResources(resourceItems<MagnetResourceItem>(result.value));
          if (kind === 'cloud') setCloudResources(resourceItems<CloudResourceItem>(result.value));
        });
        setResourceErrors(failed);

      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingResources(false);
      });

    return () => controller.abort();
  }, [contentType, item.id, resourceReloadKey, selectedEpisode]);

  const copyLink = async (url: string, resId: number) => {
    if (!url) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          if (!document.execCommand('copy')) throw new Error('clipboard command rejected');
        } finally {
          textArea.remove();
        }
      }
      setCopiedId(resId);
      window.setTimeout(() => setCopiedId(null), 2000);
      showToast('资源链接已复制', 'success');
    } catch {
      showToast('复制失败，请长按或手动选择链接', 'error');
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

      <div className="flex flex-col sm:flex-row gap-6 items-stretch animate-fade-in-up stagger-3">
        <DetailCover src={resolvedCover} alt={item.title} />
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <DetailTitle title={item.title} year={item.year} />

          <DetailButtons
            contentId={item.id}
            contentType={contentType}
            contentTitle={item.title}
            status={ds.status}
            statusLoading={ds.statusLoading}
            watchedListId={ds.watchedListId}
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

          <div className="mt-2 space-y-2 animate-fade-in-up stagger-4">
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

      {/* Rating distribution */}
      <div className="animate-fade-in-up stagger-7">
        <RatingDistribution douban={item.rating} imdb={item.ratingImdb} rt={item.ratingRT} />
      </div>

      {(
        <>
          {hasEpisodes && item.totalEpisode && item.totalEpisode > 0 && (
            <EpisodeGrid
              total={item.totalEpisode}
              selected={selectedEpisode}
              onSelect={setSelectedEpisode}
              label={episodeLabel}
            />
          )}

          {/* 视频播放器 */}
          <VideoPlayer
            src={playerSrc}
            title={item.title}
            contentId={item.id}
            contentType={contentType}
            cover={resolvedCover}
            episode={selectedEpisode ?? undefined}
            episodeLabel={episodeLabel}
            year={item.year}
            rating={item.rating}
            genres={item.genre}
            region={item.region}
            totalEpisodes={item.totalEpisode}
            sources={onlineResources.map((r) => ({
              id: r.id,
              sourceName: r.sourceName,
              sourceUrl: r.sourceUrl,
            }))}
            onEpisodeChange={setSelectedEpisode}
            onSourceChange={(s) => {
              setPlayerSrc(s.sourceUrl);
              setPlayerSourceId(s.id);
            }}
            loading={loadingResources}
          />

          {resourceErrors.length > 0 && !loadingResources && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <TriangleAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-foreground">部分资源暂时加载失败</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {resourceErrors.map((kind) => RESOURCE_KIND_LABELS[kind]).join('、')} 未能载入，其他可用资源仍可正常使用。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResourceReloadKey((key) => key + 1)}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent"
              >
                <RefreshCw aria-hidden className="h-4 w-4" />
                重新加载资源
              </button>
            </div>
          )}

          <OnlineResourceGrid
            resources={onlineResources}
            loading={loadingResources}
            selectedEpisode={selectedEpisode}
            episodeLabel={episodeLabel}
            onPlay={(r) => {
              if (r.sourceUrl) {
                setPlayerSrc(r.sourceUrl);
                setPlayerSourceId(r.id);
              }
            }}
            activeSourceId={playerSourceId}
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
              <div className="space-y-4">
                {magnetResources.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="磁力资源画质筛选">
                    {['全部', ...magnetCategories].map((category) => {
                      const count = category === '全部'
                        ? magnetResources.length
                        : magnetResources.filter((resource) => resource.qualityCategory === category).length;
                      const active = activeMagnetQuality === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setMagnetQuality(category)}
                          aria-pressed={active}
                          className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-[color,background-color,border-color] ${
                            active
                              ? 'border-accent bg-accent text-white'
                              : 'border-border bg-background text-secondary-foreground hover:border-accent/45'
                          }`}
                        >
                          {category} <span className={active ? 'text-white/75' : 'text-muted-foreground'}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <CopyableResourceList
                  resources={visibleMagnets.map((resource) => {
                    const presentation = resourcePresentation(resource.title, resource.updatedAt || resource.createdAt);
                    return {
                      id: resource.id,
                      title: presentation.title,
                      url: resource.magnetUrl,
                      badges: [resource.qualityCategory || '未知'],
                      timeLabel: presentation.timeLabel,
                    };
                  })}
                  copiedId={copiedId}
                  onCopy={copyLink}
                  icon={<Magnet aria-hidden className="h-5 w-5" />}
                  emptyText={selectedEpisode ? `该${episodeLabel}暂无磁力链接` : '暂无磁力链接'}
                />
              </div>
            ) : (
              <CopyableResourceList
                resources={cloudResources.map((resource) => {
                  const presentation = resourcePresentation(resource.title, resource.updatedAt || resource.createdAt);
                  return {
                    id: resource.id,
                    title: presentation.title,
                    url: resource.url,
                    badges: [DISK_LABELS[resource.diskType || ''] || resource.diskType || '网盘'],
                    timeLabel: presentation.timeLabel,
                    openLabel: '打开网盘',
                  };
                })}
                copiedId={copiedId}
                onCopy={copyLink}
                icon={<CloudDownload aria-hidden className="h-5 w-5" />}
                emptyText={selectedEpisode ? `该${episodeLabel}暂无网盘资源` : '暂无网盘资源'}
              />
            )}
          </ResourceTabs>
        </>
      )}

      <div className="animate-fade-in-up stagger-10">
        <RelatedSection contentType={contentType} contentId={item.id} />
      </div>
    </div>
  );
}
