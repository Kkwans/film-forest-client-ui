'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
import { usePosterResolution } from '@/hooks/usePosterUrl';
import { useToast } from '@/components/Toast';
import { filterResourcesByDiskType } from '@/lib/uiContracts';

/** 在线播放资源 */
interface OnlineResourceItem {
  id: number;
  sourceName: string;
  sourceUrl: string;
  sourcePageUrl?: string;
  playbackType?: string;
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
  extractionCode?: string;
  password?: string;
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

function LinkedValues({ values, href }: { values: string[]; href: (value: string) => string }) {
  if (values.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <span>
      {values.map((value, index) => (
        <span key={`${value}-${index}`}>
          <Link href={href(value)} className="underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] hover:text-accent hover:decoration-current focus-visible:decoration-current">
            {value}
          </Link>
          {index < values.length - 1 && <span className="mx-1.5 text-muted-foreground/70">/</span>}
        </span>
      ))}
    </span>
  );
}

function PlainValues({ values }: { values: string[] }) {
  return values.length > 0
    ? <span>{values.map((value, index) => <span key={`${value}-${index}`}>{value}{index < values.length - 1 && <span className="mx-1.5 text-muted-foreground/70">/</span>}</span>)}</span>
    : <span className="text-muted-foreground">—</span>;
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
  scoreDoubanCount?: number;
  scoreImdbCount?: number;
  scoreRtCriticCount?: number;
  scoreRtAudienceCount?: number;
  ratingCount?: number;
  ratingImdb?: number;
  ratingRT?: number;
  summary: string;
  status?: string;
  totalEpisode?: number;
  currentEpisode?: number;
  duration?: number;
  genre: string[];
  director: string[];
  writer: string[];
  actor: string[];
  language: string[];
  alias: string[];
  releaseDate?: string;
  updatedAt?: string;
  tmdbId?: number;
  tmdbMediaType?: string;
  tmdbMatchStatus?: string;
  tmdbDiagnosticCode?: string;
  tmdbPosterUrl?: string;
  tmdbScore?: number;
  tmdbVoteCount?: number;
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
  const [cloudDiskType, setCloudDiskType] = useState('全部');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [playerSrc, setPlayerSrc] = useState<string | undefined>(undefined);
  const [playerSourceId, setPlayerSourceId] = useState<number | null>(null);
  const [requestedSourceId, setRequestedSourceId] = useState<number | null>(null);
  const requestedSourceHandledRef = useRef(false);

  const ds = useDetailStatus(item.id, contentType);
  const posterResolution = usePosterResolution(contentType, item.id, item.cover, { enrich: true });
  const resolvedCover = posterResolution.url;
  const tmdbScore = posterResolution.tmdbScore ?? item.tmdbScore;
  const tmdbVoteCount = posterResolution.tmdbVoteCount ?? item.tmdbVoteCount;
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
  const cloudDiskTypes = useMemo(() => Array.from(new Set(
    cloudResources.map((resource) => resource.diskType?.trim()).filter((value): value is string => Boolean(value)),
  )), [cloudResources]);
  const visibleClouds = cloudDiskType === '全部'
    ? cloudResources
    : filterResourcesByDiskType(cloudResources, cloudDiskType);

  useEffect(() => {
    if (cloudDiskType !== '全部' && !cloudDiskTypes.includes(cloudDiskType)) setCloudDiskType('全部');
  }, [cloudDiskType, cloudDiskTypes]);

  const filterHref = (key: 'genre' | 'region' | 'language', value: string) => `${listPath}?${key}=${encodeURIComponent(value)}`;
  const searchHref = (value: string) => `/search?q=${encodeURIComponent(value)}`;
  const regionValues = item.region.split(/\s*\/\s*/u).map((entry) => entry.trim()).filter(Boolean);
  const posterStatusLabel = posterResolution.status === 'tmdb'
    ? 'TMDB 海报已匹配'
    : posterResolution.status === 'fallback'
      ? 'TMDB 未匹配，已保留原图'
      : posterResolution.status === 'unavailable'
        ? 'TMDB 暂不可用，已保留原图'
        : posterResolution.status === 'loading'
          ? 'TMDB 状态读取中'
          : '';

  // 播放记录卡片通过 episode/sourceId 深链回来；仅接受当前内容真实存在的集数。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const rawEpisode = Number.parseInt(params.get('episode') || '', 10);
    const episode = hasEpisodes && Number.isInteger(rawEpisode) && rawEpisode > 0
      && item.totalEpisode != null && rawEpisode <= item.totalEpisode
      ? rawEpisode
      : null;
    const rawSourceId = Number.parseInt(params.get('sourceId') || '', 10);
    const sourceId = Number.isInteger(rawSourceId) && rawSourceId > 0 ? rawSourceId : null;
    requestedSourceHandledRef.current = false;
    setSelectedEpisode(episode);
    setRequestedSourceId(sourceId);
  }, [contentType, hasEpisodes, item.id, item.totalEpisode]);

  // sourceId 只在当前集的真实在线播放资源中匹配成功时才自动选中；不存在则保持默认未选择状态。
  useEffect(() => {
    if (loadingResources || requestedSourceId == null || requestedSourceHandledRef.current) return;
    requestedSourceHandledRef.current = true;
    const source = onlineResources.find((resource) => resource.id === requestedSourceId);
    if (!source) return;
    setPlayerSrc(source.sourceUrl);
    setPlayerSourceId(source.id);
  }, [loadingResources, onlineResources, requestedSourceId]);

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

  const copyResource = async (text: string, resId: number, successMessage?: string) => {
    if (!text) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
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
      showToast(successMessage || '资源链接已复制', 'success');
    } catch {
      showToast('复制失败，请长按或手动选择链接', 'error');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <DetailBreadcrumb
        items={[
          { label: '首页', href: '/' },
          { label: listLabel, href: listPath },
          { label: item.title },
        ]}
      />

      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-border bg-card p-4 shadow-[var(--shadow-sm)] sm:p-6 lg:p-7">
        {resolvedCover && (
          <div
            aria-hidden
            className="absolute -right-16 -top-24 -z-10 h-[34rem] w-[34rem] bg-cover bg-center opacity-[0.12] blur-3xl saturate-150 dark:opacity-[0.18]"
            style={{ backgroundImage: `url(${resolvedCover})` }}
          />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-transparent via-transparent to-accent/[0.04]" />
        <div className="grid items-stretch gap-x-8 gap-y-6 lg:grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)] lg:gap-x-9">
          <aside className="lg:row-span-2">
            <DetailCover src={resolvedCover} alt={item.title} fillHeight />
          </aside>
          <div className="flex min-w-0 flex-col gap-4 py-1">
          <DetailTitle title={item.title} year={item.year} />

          <RatingBadges
            douban={item.rating}
            doubanCount={item.scoreDoubanCount ?? item.ratingCount}
            imdb={item.ratingImdb}
            imdbCount={item.scoreImdbCount}
            rt={item.ratingRT}
            rtCriticCount={item.scoreRtCriticCount}
            rtAudienceCount={item.scoreRtAudienceCount}
            tmdb={tmdbScore}
            tmdbVoteCount={tmdbVoteCount}
          />
          {posterStatusLabel && (
            <p className={`text-xs ${posterResolution.status === 'tmdb' ? 'text-accent' : 'text-muted-foreground'}`} role="status">
              {posterStatusLabel}
            </p>
          )}

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

          </div>
          <div className="min-w-0 border-t border-border/70 pt-4 lg:col-start-2">
            <div className="grid gap-x-9 md:grid-cols-2">
              <InfoRow label="状态" accent={item.status === updatingText}>{item.status || '—'}</InfoRow>
              <InfoRow label="类型"><LinkedValues values={item.genre} href={(value) => filterHref('genre', value)} /></InfoRow>
              <InfoRow label="导演" accent><LinkedValues values={item.director} href={searchHref} /></InfoRow>
              <InfoRow label="编剧" accent><LinkedValues values={item.writer} href={searchHref} /></InfoRow>
              <div className="md:col-span-2"><InfoRow label="主演" accent><LinkedValues values={item.actor} href={searchHref} /></InfoRow></div>
              <InfoRow label="地区"><LinkedValues values={regionValues} href={(value) => filterHref('region', value)} /></InfoRow>
              <InfoRow label="语言"><LinkedValues values={item.language} href={(value) => filterHref('language', value)} /></InfoRow>
              <div className="md:col-span-2"><InfoRow label="别名"><PlainValues values={item.alias} /></InfoRow></div>
              <InfoRow label="上映日期">{item.releaseDate || '—'}</InfoRow>
              <InfoRow label="年份">{item.year > 0 ? item.year : '—'}</InfoRow>
              {hasEpisodes && <InfoRow label="集数">{item.totalEpisode && item.totalEpisode > 0 ? `${item.totalEpisode}${episodeLabel}` : '—'}</InfoRow>}
              <InfoRow label="时长">{item.duration && item.duration > 0 ? `${item.duration}分钟` : '—'}</InfoRow>
            </div>
          </div>
        </div>
      </section>

      <SynopsisSection
        text={item.summary}
        expanded={synopsisExpanded}
        onToggle={() => setSynopsisExpanded(!synopsisExpanded)}
      />

      <section className="rounded-2xl border border-border bg-card/70 px-4 py-3 sm:px-5" aria-labelledby="detail-maintenance-title">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <h2 id="detail-maintenance-title" className="text-xs font-semibold text-muted-foreground">维护信息</h2>
          <p className="text-xs text-muted-foreground">
            <span className="mr-2">数据更新</span>
            <span className="text-secondary-foreground">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('zh-CN') : '--'}</span>
          </p>
          {posterResolution.diagnosticCode && (
            <p className="text-xs text-muted-foreground">
              <span className="mr-2">海报状态</span>
              <span className="text-secondary-foreground">{posterResolution.diagnosticCode}</span>
            </p>
          )}
        </div>
      </section>

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
            sourceId={playerSourceId ?? undefined}
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
              sourcePageUrl: r.sourcePageUrl,
              playbackType: r.playbackType,
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
                  onCopy={copyResource}
                  icon={<Magnet aria-hidden className="h-5 w-5" />}
                  emptyText={selectedEpisode ? `该${episodeLabel}暂无磁力链接` : '暂无磁力链接'}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {cloudResources.length > 0 && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="网盘类型筛选">
                    {['全部', ...cloudDiskTypes].map((diskType) => {
                      const active = cloudDiskType === diskType;
                      const count = diskType === '全部'
                        ? cloudResources.length
                        : filterResourcesByDiskType(cloudResources, diskType).length;
                      return (
                        <button
                          key={diskType}
                          type="button"
                          onClick={() => setCloudDiskType(diskType)}
                          aria-pressed={active}
                          className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-[color,background-color,border-color] ${active ? 'border-accent bg-accent text-white' : 'border-border bg-background text-secondary-foreground hover:border-accent/45'}`}
                        >
                          {DISK_LABELS[diskType] || diskType} <span className={active ? 'text-white/75' : 'text-muted-foreground'}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <CopyableResourceList
                resources={visibleClouds.map((resource) => {
                  const presentation = resourcePresentation(resource.title, resource.updatedAt || resource.createdAt);
                  const extractionCode = resource.extractionCode?.trim();
                  const password = resource.password?.trim();
                  return {
                    id: resource.id,
                    title: presentation.title,
                    url: resource.url,
                    badges: [
                      DISK_LABELS[resource.diskType || ''] || resource.diskType || '网盘',
                      extractionCode ? `提取码 ${extractionCode}` : '',
                      password ? `密码 ${password}` : '',
                    ],
                    timeLabel: presentation.timeLabel,
                    openLabel: '打开网盘',
                    copyValue: [resource.url, extractionCode && `提取码：${extractionCode}`, password && `密码：${password}`].filter(Boolean).join('\n'),
                    copyLabel: extractionCode || password ? '复制链接和凭据' : '复制链接',
                    copySuccessMessage: extractionCode || password ? '网盘链接和凭据已复制' : '网盘链接已复制',
                  };
                })}
                copiedId={copiedId}
                onCopy={copyResource}
                icon={<CloudDownload aria-hidden className="h-5 w-5" />}
                emptyText={selectedEpisode ? `该${episodeLabel}暂无网盘资源` : '暂无网盘资源'}
                />
              </div>
            )}
          </ResourceTabs>
        </>
      )}

      <div>
        <RelatedSection contentType={contentType} contentId={item.id} />
      </div>
    </div>
  );
}
