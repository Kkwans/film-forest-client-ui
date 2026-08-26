'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, CloudDownload, Magnet, RefreshCw, TriangleAlert } from 'lucide-react';
import { resourceApi, seriesApi, type SeriesItem } from '@/lib/api';
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
  providerName?: string;
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
  if (values.length === 0) return <span className="text-muted-foreground">--</span>;

  return (
    <span>
      {values.map((value, index) => (
        <span key={`${value}-${index}`}>
          <Link href={href(value)} className="text-accent underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] hover:text-accent-hover hover:decoration-current focus-visible:decoration-current">
            {value}
          </Link>
          {index < values.length - 1 && ' / '}
        </span>
      ))}
    </span>
  );
}

function ExpandableLinkedValues({
  values,
  href,
  collapsedLines,
  label,
}: {
  values: string[];
  href: (value: string) => string;
  collapsedLines: 1 | 2;
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const measurementRef = useRef<HTMLSpanElement>(null);
  const measurementText = values.join(' / ');

  useEffect(() => {
    const element = measurementRef.current;
    if (!element) return;

    const updateOverflow = () => {
      const lineHeight = Number.parseFloat(window.getComputedStyle(element).lineHeight);
      const maxHeight = (Number.isFinite(lineHeight) ? lineHeight : 24) * collapsedLines;
      setOverflowing(element.scrollHeight > maxHeight + 1 || (collapsedLines === 2 && values.length >= 6));
    };

    updateOverflow();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [collapsedLines, measurementText]);

  if (values.length === 0) return <span className="text-muted-foreground">--</span>;

  return (
    <div className="relative min-w-0">
      <span
        ref={measurementRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 block invisible whitespace-normal break-words text-sm leading-6"
      >
        {measurementText}
      </span>
      <span className={`block min-w-0 break-words ${expanded ? '' : collapsedLines === 1 ? 'line-clamp-1' : 'max-h-12 overflow-hidden'}`}>
        {values.map((value, index) => (
          <span key={`${value}-${index}`}>
            <Link href={href(value)} className="text-accent underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] hover:text-accent-hover hover:decoration-current focus-visible:decoration-current">
              {value}
            </Link>
            {index < values.length - 1 && ' / '}
          </span>
        ))}
      </span>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className={expanded
            ? 'mt-1 inline-flex min-h-7 items-center gap-1 rounded-md px-1 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card'
            : 'absolute bottom-0 right-0 inline-flex min-h-7 items-center gap-1 rounded-md bg-card px-1 pl-2 text-xs font-semibold text-muted-foreground shadow-[-0.75rem_0_0.75rem_var(--bg-card)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card'}
          aria-expanded={expanded}
          aria-label={`${expanded ? '收起' : '展开'}${label}`}
        >
          {expanded ? '收起' : '展开'}
          <ChevronDown aria-hidden className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

function PlainValues({ values }: { values: string[] }) {
  return values.length > 0
    ? <span>{values.map((value, index) => <span key={`${value}-${index}`}>{value}{index < values.length - 1 && ' / '}</span>)}</span>
    : <span className="text-muted-foreground">--</span>;
}

function SeriesSelect({
  items,
  currentId,
  listPath,
}: {
  items: SeriesItem[];
  currentId: number;
  listPath: string;
}) {
  const router = useRouter();
  if (items.length === 0) return <span className="text-muted-foreground">--</span>;

  return (
    <select
      aria-label="系列影片"
      value={String(currentId)}
      onChange={(event) => {
        const nextId = Number(event.target.value);
        if (Number.isSafeInteger(nextId) && nextId > 0 && nextId !== currentId) router.push(`${listPath}/${nextId}`);
      }}
      className="min-h-8 max-w-full rounded-lg border border-border bg-background px-2 text-sm text-secondary-foreground outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-1 focus:ring-accent/35"
    >
      {items.map((seriesItem) => (
        <option key={seriesItem.id} value={seriesItem.id}>
          [{seriesItem.seriesOrder ?? '-'}] {seriesItem.title}{seriesItem.year ? ` (${seriesItem.year})` : ''}
        </option>
      ))}
    </select>
  );
}

function ResourceErrorNotice({ kind, onRetry }: { kind: ResourceKind; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <TriangleAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-foreground">部分资源暂时加载失败</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {RESOURCE_KIND_LABELS[kind]}未能载入，其他可用资源仍可正常使用。
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        重新加载资源
      </button>
    </div>
  );
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
  seriesName?: string;
  seriesOrder?: number;
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
  releaseLabel?: string;
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
  const {
    contentType,
    listPath,
    listLabel,
    episodeLabel = '集',
    releaseLabel = '首播',
    hasEpisodes,
  } = config;

  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [onlineResources, setOnlineResources] = useState<OnlineResourceItem[]>([]);
  const [magnetResources, setMagnetResources] = useState<MagnetResourceItem[]>([]);
  const [cloudResources, setCloudResources] = useState<CloudResourceItem[]>([]);
  const [seriesItems, setSeriesItems] = useState<SeriesItem[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourceErrors, setResourceErrors] = useState<ResourceKind[]>([]);
  const [resourceReloadKey, setResourceReloadKey] = useState(0);
  const [downloadTab, setDownloadTab] = useState<ResourceKind>('magnet');
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
  const posterStatusLabel = posterResolution.status === 'tmdb'
    ? '已匹配外部海报'
    : posterResolution.status === 'fallback'
      ? '保留来源海报'
      : posterResolution.status === 'unavailable'
        ? '外部海报暂不可用，保留来源海报'
        : '';
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

  useEffect(() => {
    if (contentType !== 'movie' || !item.seriesName) {
      setSeriesItems([]);
      return;
    }
    let active = true;
    seriesApi.get(item.id)
      .then((response) => {
        if (active) setSeriesItems(Array.isArray(response.data?.data) ? response.data.data : []);
      })
      .catch(() => {
        if (active) setSeriesItems([]);
      });
    return () => { active = false; };
  }, [contentType, item.id, item.seriesName]);
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
    <div className="mx-auto flex w-full max-w-none flex-col gap-5">
      <DetailBreadcrumb
        items={[
          { label: '首页', href: '/' },
          { label: listLabel, href: listPath },
          { label: item.title },
        ]}
      />

      <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-border bg-card p-4 shadow-[var(--shadow-sm)] sm:p-5 lg:p-6">
        {resolvedCover && (
          <div
            aria-hidden
            className="absolute -right-16 -top-24 -z-10 h-[34rem] w-[34rem] bg-cover bg-center opacity-[0.12] blur-3xl saturate-150 dark:opacity-[0.18]"
            style={{ backgroundImage: `url(${resolvedCover})` }}
          />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-transparent via-transparent to-accent/[0.04]" />
        <div className="grid items-start gap-x-5 gap-y-6 lg:grid-cols-[minmax(14rem,16rem)_minmax(0,1fr)] lg:gap-x-5">
          <aside className="self-start lg:sticky lg:top-24">
            <DetailCover src={resolvedCover} alt={item.title} />
          </aside>
          <div className="flex min-w-0 flex-col gap-4 py-1">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
              <div className="min-w-0 flex-1">
                <DetailTitle title={item.title} year={item.year} />
              </div>
              <div className="shrink-0">
                <RatingBadges
                  douban={item.rating}
                  doubanCount={item.scoreDoubanCount ?? item.ratingCount}
                  imdb={item.ratingImdb}
                  imdbCount={item.scoreImdbCount}
                  rt={item.ratingRT}
                  rtCriticCount={item.scoreRtCriticCount}
                  rtAudienceCount={item.scoreRtAudienceCount}
                />
              </div>
            </div>

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

            <div className="min-w-0 border-t border-border/40 pt-3">
              <div className="grid gap-x-8 md:grid-cols-2">
                <div className="grid md:col-span-2 md:grid-cols-2">
                  <InfoRow label="类型">
                    <LinkedValues values={item.genre} href={(value) => filterHref('genre', value)} />
                  </InfoRow>
                  <InfoRow label="导演" accent><ExpandableLinkedValues values={item.director} href={searchHref} collapsedLines={1} label="导演" /></InfoRow>
                </div>
                <div className="grid md:col-span-2 md:grid-cols-2">
                  <InfoRow label="编剧" accent><ExpandableLinkedValues values={item.writer} href={searchHref} collapsedLines={2} label="编剧" /></InfoRow>
                  <InfoRow label="主演" accent><ExpandableLinkedValues values={item.actor} href={searchHref} collapsedLines={2} label="主演" /></InfoRow>
                </div>
                <div className="grid md:col-span-2 md:grid-cols-2">
                  <InfoRow label="地区"><LinkedValues values={regionValues} href={(value) => filterHref('region', value)} /></InfoRow>
                  <InfoRow label="语言"><LinkedValues values={item.language} href={(value) => filterHref('language', value)} /></InfoRow>
                </div>
                <div className="grid md:col-span-2 md:grid-cols-2">
                  <InfoRow label={releaseLabel}>{item.releaseDate || '--'}</InfoRow>
                  <InfoRow label="时长">{item.duration && item.duration > 0 ? `${item.duration}分钟` : '--'}</InfoRow>
                </div>
                <div className="grid md:col-span-2 md:grid-cols-2">
                  <InfoRow label="别名"><PlainValues values={item.alias} /></InfoRow>
                  {contentType === 'movie' && (
                    <InfoRow label="系列">
                      {item.seriesName
                        ? <SeriesSelect items={seriesItems} currentId={item.id} listPath={listPath} />
                        : <span className="text-muted-foreground">--</span>}
                    </InfoRow>
                  )}
                </div>
              </div>
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
          {posterStatusLabel && (
            <p className="text-xs text-muted-foreground">
              <span className="mr-2">海报来源</span>
              <span className="text-secondary-foreground">{posterStatusLabel}</span>
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

          <ResourceTabs
            tabs={[
              { key: 'magnet', label: '磁力链接', count: magnetResources.length },
              { key: 'cloud', label: '网盘资源', count: cloudResources.length },
              { key: 'online', label: '在线播放', count: onlineResources.length },
            ]}
            activeTab={downloadTab}
            onTabChange={(key) => setDownloadTab(key as ResourceKind)}
          >
            {downloadTab === 'online' ? (
              <div className="space-y-4">
                {resourceErrors.includes('online') && !loadingResources && (
                  <ResourceErrorNotice
                    kind="online"
                    onRetry={() => setResourceReloadKey((key) => key + 1)}
                  />
                )}
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
                    providerName: r.providerName,
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
              </div>
            ) : loadingResources ? (
              <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-14 rounded-lg animate-pulse bg-background" />
                ))}
              </div>
              </section>
            ) : downloadTab === 'magnet' ? (
              <div className="space-y-4">
                {resourceErrors.includes('magnet') && (
                  <ResourceErrorNotice
                    kind="magnet"
                    onRetry={() => setResourceReloadKey((key) => key + 1)}
                  />
                )}
                <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
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
                </section>
              </div>
            ) : (
              <div className="space-y-4">
                {resourceErrors.includes('cloud') && (
                  <ResourceErrorNotice
                    kind="cloud"
                    onRetry={() => setResourceReloadKey((key) => key + 1)}
                  />
                )}
                <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
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
                </section>
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
