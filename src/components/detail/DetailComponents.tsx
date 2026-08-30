'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, CirclePlay, Clapperboard, Clock3, Copy, ExternalLink, Inbox, Magnet } from 'lucide-react';
import LazyImage from '@/components/ui/lazy-image';
import { getPlaybackSourceMode } from '@/lib/playbackSource';
import { RatingSummary } from '@/components/ContentShared';

/**
 * 详情页通用组件库
 * 提取自 movie/drama/variety/anime/short 五个详情页的共用 UI 片段
 */

/* ============================================================
 * 1. 面包屑导航
 * ============================================================ */

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function DetailBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex min-w-0 items-center gap-2 overflow-hidden text-sm text-muted-foreground" aria-label="面包屑">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-border" />}
          {item.href ? (
            <Link className="text-secondary-foreground hover:text-accent transition-colors" href={item.href}>{item.label}</Link>
          ) : (
            <span className="truncate font-medium text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ============================================================
 * 2. 封面海报
 * ============================================================ */

export function DetailCover({ src, alt, fillHeight = false }: { src?: string; alt: string; fillHeight?: boolean }) {
  const wrapperClass = fillHeight
    ? 'h-full w-full max-w-none aspect-[2/3] lg:aspect-auto'
    : 'mx-auto w-full max-w-[15rem] shrink-0 sm:mx-0 sm:w-48 md:w-56 lg:w-full lg:max-w-[16rem]';

  return (
    <div className={wrapperClass}>
      <div className={`relative overflow-hidden rounded-2xl border border-white/15 bg-muted shadow-[0_1.5rem_3rem_rgba(0,0,0,0.22)] ${fillHeight ? 'h-full min-h-[21rem] lg:min-h-0' : ''}`}>
        <LazyImage
          src={src || '/poster-placeholder.svg'}
          alt={alt}
          className={`rounded-2xl ${fillHeight ? 'h-full' : ''}`}
          imgClassName="object-contain bg-muted/25"
          placeholder="skeleton"
          aspectRatio={fillHeight ? null : '2/3'}
          fallbackSrc={'/poster-placeholder.svg'}
          lazy={false}
        />
      </div>
    </div>
  );
}

/* ============================================================
 * 3. 标题 + 年份
 * ============================================================ */

export function DetailTitle({ title, year }: { title: string; year?: number }) {
  return (
    <h1 className="text-2xl font-black leading-[1.16] tracking-[-0.035em] text-foreground sm:text-3xl lg:text-4xl">
      {title}
      {year != null && year > 0 && (
        <span className="ml-2 text-base font-semibold tracking-normal text-muted-foreground sm:text-lg">
          {year}
        </span>
      )}
    </h1>
  );
}

/* ============================================================
 * 4. 评分徽章组
 * ============================================================ */

interface RatingBadgesProps {
  douban?: number | null;
  doubanCount?: number | null;
  imdb?: number | null;
  imdbCount?: number | null;
  rt?: number | null;
  rtCriticCount?: number | null;
  rtAudienceCount?: number | null;
}

export function RatingBadges({ douban, doubanCount, imdb, imdbCount, rt, rtCriticCount, rtAudienceCount }: RatingBadgesProps) {
  const hasCount = (value?: number | null) => value != null && value > 0;
  return <RatingSummary
    douban={douban}
    doubanDetail={hasCount(doubanCount) ? `${doubanCount!.toLocaleString('zh-CN')}人评分` : undefined}
    imdb={imdb}
    imdbDetail={hasCount(imdbCount) ? `${imdbCount!.toLocaleString('zh-CN')}人评分` : undefined}
    rt={rt}
    rtDetail={[hasCount(rtCriticCount) ? `影评人 ${rtCriticCount!.toLocaleString('zh-CN')}` : '', hasCount(rtAudienceCount) ? `观众 ${rtAudienceCount!.toLocaleString('zh-CN')}` : ''].filter(Boolean).join(' / ') || undefined}
    includeEmpty
    variant="detail"
  />;
}

/* ============================================================
 * 5. 信息行
 * ============================================================ */

export function InfoRow({ label, children, accent }: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1 py-2.5 text-sm leading-6">
      <span className="pt-px font-medium text-muted-foreground">
        {label}
      </span>
      <div className={`min-w-0 break-words ${accent ? "font-medium text-accent" : "text-secondary-foreground"}`}>{children}</div>
    </div>
  );
}

/* ============================================================
 * 6. 简介区域（可展开/收起）
 * ============================================================ */

export function SynopsisSection({ text, expanded, onToggle }: {
  text: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [canExpand, setCanExpand] = useState(false);
  const measureRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const update = () => setCanExpand(element.scrollHeight > element.clientHeight + 1);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);

  if (!text) return null;

  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Storyline</p>
      <h2 className="mt-2 text-xl font-black tracking-tight text-foreground">剧情简介</h2>
      <p ref={measureRef} className={`mt-4 text-sm leading-7 text-secondary-foreground ${expanded ? '' : 'line-clamp-3'}`}>
        {text}
      </p>
      {(canExpand || expanded) && (
        <button
          onClick={onToggle}
          className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-semibold text-accent sm:min-h-9"
        >
          {expanded ? '收起' : '展开全部'}
          <ChevronDown aria-hidden className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  );
}

/* ============================================================
 * 7. Tab 切换栏
 * ============================================================ */

interface TabItem<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export function DetailTabBar<T extends string>({ tabs, active, onChange }: {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          role="tab"
          aria-selected={active === tab.key}
          className={`min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold transition-[color,background-color,box-shadow] sm:min-h-9 ${active === tab.key ? 'bg-card text-accent shadow-sm' : 'text-secondary-foreground hover:text-foreground'}`}
        >
          {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
 * 8. 选集/分期网格
 * ============================================================ */

export function EpisodeGrid({ total, selected, onSelect, label = '集', gridCols = 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10' }: {
  total: number;
  selected: number | null;
  onSelect: (ep: number | null) => void;
  label?: string;
  gridCols?: string;
}) {
  if (total <= 0) return null;

  const episodes = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
      <h3 className="mb-4 text-lg font-black tracking-tight text-foreground">选{label} <span className="ml-1 text-sm font-medium text-muted-foreground">· 共 {total}{label}</span></h3>
      <div className={`grid ${gridCols} gap-2`}>
        {episodes.map(ep => (
          <button
            key={ep}
            onClick={() => onSelect(selected === ep ? null : ep)}
            className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition-[color,background-color,border-color] sm:min-h-10 ${
              selected === ep
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-background text-foreground hover:border-accent/50 hover:text-accent'
            }`}
          >
            {ep}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
 * 9. 在线播放资源网格（按来源页动态线路分组展示）
 * ============================================================ */

export interface OnlineResource {
  id: number;
  sourceName?: string;
  providerName?: string;
  sourceUrl?: string;
  sourcePageUrl?: string;
  playbackType?: string;
  season?: number;
  episodeNumber?: number;
  episodeTitle?: string;
}

/**
 * 兼容 V27 之前写成“线路名 · 画质/集名”的电影记录。
 * 新记录的 providerName 来自来源页，不在前端维护任何来源名称白名单。
 */
function legacyProviderParts(resource: OnlineResource) {
  const provider = resource.providerName?.trim();
  const source = resource.sourceName?.trim() || '';
  if (provider) return { provider, label: source };

  const separator = source.indexOf(' · ');
  if (separator > 0 && separator < source.length - 3) {
    return {
      provider: source.slice(0, separator).trim(),
      label: source.slice(separator + 3).trim(),
    };
  }
  return { provider: source || '来源未标注', label: source };
}

function resourceLabel(resource: OnlineResource, selectedEpisode?: number | null) {
  const { label } = legacyProviderParts(resource);
  const episode = resource.episodeTitle?.trim()
    || (resource.episodeNumber != null ? `第${resource.episodeNumber}集` : '');
  if (label) return label;
  if (selectedEpisode == null && episode) return episode;
  return '播放源';
}

export function OnlineResourceGrid({ resources, loading, emptyText = '暂无在线播放资源', selectedEpisode, episodeLabel = '集', onPlay, activeSourceId }: {
  resources: OnlineResource[];
  loading: boolean;
  emptyText?: string;
  selectedEpisode?: number | null;
  episodeLabel?: string;
  /** 点击播放回调（传入则在页面内播放，否则打开新窗口） */
  onPlay?: (resource: OnlineResource) => void;
  /** 当前正在播放的资源 ID */
  activeSourceId?: number | null;
}) {
  const title = selectedEpisode ? `第${selectedEpisode}${episodeLabel} 播放源` : '在线播放';
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // providerName 是来源播放页中的动态线路标题，例如“非凡”“量子”；不维护固定来源列表。
  const grouped = useMemo(() => {
    const map = new Map<string, OnlineResource[]>();
    for (const r of resources) {
      const { provider } = legacyProviderParts(r);
      const arr = map.get(provider) || [];
      arr.push(r);
      map.set(provider, arr);
    }
    return Array.from(map.entries());
  }, [resources]);

  useEffect(() => {
    if (selectedProvider && !grouped.some(([provider]) => provider === selectedProvider)) {
      setSelectedProvider(null);
    }
  }, [grouped, selectedProvider]);

  const visibleGroups = selectedProvider
    ? grouped.filter(([provider]) => provider === selectedProvider)
    : grouped;

  return (
    <section className="rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Streaming</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-foreground">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">选择线路后在上方播放器观看</p>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 rounded-lg animate-pulse bg-background" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-10">
          <Clapperboard aria-hidden className="mx-auto mb-3 size-9 text-muted-foreground/70" />
          <p className="text-sm text-muted-foreground">
            {selectedEpisode ? `该${episodeLabel}暂无资源` : emptyText}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.length > 1 && (
            <div className="flex flex-wrap gap-2 border-b border-border pb-4" role="tablist" aria-label="播放来源">
              <button
                type="button"
                role="tab"
                aria-selected={selectedProvider == null}
                onClick={() => setSelectedProvider(null)}
                className={`min-h-11 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors sm:min-h-0 ${selectedProvider == null ? 'border-accent bg-accent text-white' : 'border-border text-secondary-foreground hover:border-accent/50 hover:text-accent'}`}
              >
                全部来源
              </button>
              {grouped.map(([providerName, items]) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedProvider === providerName}
                  key={providerName}
                  onClick={() => setSelectedProvider(providerName)}
                  className={`min-h-11 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors sm:min-h-0 ${selectedProvider === providerName ? 'border-accent bg-accent text-white' : 'border-border text-secondary-foreground hover:border-accent/50 hover:text-accent'}`}
                >
                  {providerName} <span className="text-xs opacity-75">{items.length}</span>
                </button>
              ))}
            </div>
          )}
          {visibleGroups.map(([providerName, items]) => {
            return (
              <div key={providerName}>
                <div className="mb-2 flex items-center gap-2">
                  <CirclePlay aria-hidden className="size-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">{providerName}</span>
                  <span className="text-xs text-muted-foreground">{items.length} 条线路</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {items.map(r => {
                    const isActive = activeSourceId === r.id;
                    const opensExternally = getPlaybackSourceMode(r.sourceUrl, r.playbackType) === 'external-page';
                    const label = resourceLabel(r, selectedEpisode);
                    return onPlay ? (
                      <button
                        key={r.id}
                        onClick={() => onPlay(r)}
                        className={`flex min-h-11 items-center justify-between rounded-xl border px-4 py-2.5 transition-[color,background-color,border-color] ${
                          isActive
                            ? 'border-accent bg-accent/10 shadow-sm'
                            : 'hover:border-accent/40 hover:shadow-sm'
                        }`}
                      >
                        <span className="text-sm font-medium truncate text-foreground">
                          {label}
                        </span>
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${isActive ? 'bg-accent text-white' : 'bg-accent/10 text-accent'}`}
                        >
                          {isActive
                            ? (opensExternally ? '已选择' : '播放中')
                            : (opensExternally ? '外部打开' : '播放')}
                        </span>
                      </button>
                    ) : (
                      <a
                        key={r.id}
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg border px-4 py-2.5 transition-[color,background-color,border-color,box-shadow] hover:border-accent/40 hover:shadow-sm"
                      >
                        <span className="text-sm font-medium truncate text-foreground">
                          {label}
                        </span>
                        <span
                          className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent"
                        >
                          播放
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ============================================================
 * 10. 可复制资源列表（磁力/网盘）
 * ============================================================ */

interface CopyableResource {
  id: number;
  title?: string;
  url?: string;
  copyValue?: string;
  copyLabel?: string;
  copySuccessMessage?: string;
  badges?: string[];
  timeLabel?: string;
  openLabel?: string;
}

export function CopyableResourceList({ resources, copiedId, onCopy, icon, emptyText }: {
  resources: CopyableResource[];
  copiedId: number | null;
  onCopy: (text: string, id: number, successMessage?: string) => void | Promise<void>;
  icon: React.ReactNode;
  emptyText: string;
}) {
  if (resources.length === 0) {
    return (
      <div className="text-center py-10">
        <Inbox aria-hidden className="mx-auto mb-2 h-8 w-8 text-muted-foreground/70" />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {resources.map(r => (
        <div
          key={r.id}
          className="group grid gap-3 border-b border-border px-1 py-4 last:border-b-0 transition-colors hover:bg-accent/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-2"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">{icon}</span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 break-all text-sm font-medium leading-5 text-foreground">{r.title || '资源链接'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {r.badges?.filter(Boolean).map((badge) => (
                  <span key={badge} className="rounded-md bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent">{badge}</span>
                ))}
                {r.timeLabel && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                    <Clock3 aria-hidden className="size-3" />{r.timeLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            {r.openLabel && r.url && (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-[border-color,color] hover:border-accent/45 hover:text-accent sm:min-h-9"
              >
                <ExternalLink aria-hidden className="size-3.5" />{r.openLabel}
              </a>
            )}
            <button
              type="button"
              onClick={() => onCopy(r.copyValue || r.url || '', r.id, r.copySuccessMessage)}
              disabled={!(r.copyValue || r.url)}
              aria-label={`${r.copyLabel || '复制链接'}：${r.title || '资源'}`}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition-colors sm:min-h-9 ${
                copiedId === r.id ? 'bg-copied' : 'bg-accent hover:bg-accent-hover'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Copy aria-hidden className="size-3.5" />{copiedId === r.id ? '已复制' : r.copyLabel || '复制链接'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface MagnetResourceListItem {
  id: number;
  title?: string;
  url?: string;
  sizeLabel?: string;
}

/** 磁力资源使用表格化桌面布局和信息优先的移动布局，避免下载名与元信息互相挤压。 */
export function MagnetResourceList({ resources, copiedId, onCopy, emptyText }: {
  resources: MagnetResourceListItem[];
  copiedId: number | null;
  onCopy: (text: string, id: number, successMessage?: string) => void | Promise<void>;
  emptyText: string;
}) {
  if (resources.length === 0) {
    return (
      <div className="py-10 text-center">
        <Inbox aria-hidden className="mx-auto mb-2 h-8 w-8 text-muted-foreground/70" />
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden" role="table" aria-label="磁力资源列表">
      <div className="hidden border-b border-border bg-muted/55 px-4 py-2.5 text-xs font-semibold text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_7rem_9rem] md:items-center md:gap-4" role="row">
        <span role="columnheader">名称</span>
        <span role="columnheader" className="text-center">大小</span>
        <span role="columnheader" className="text-center">操作</span>
      </div>
      <div>
        {resources.map((resource) => {
          const value = resource.url || '';
          return (
            <div key={resource.id} className="grid grid-cols-1 gap-x-4 gap-y-2 border-b border-border px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_7rem_9rem] md:items-center md:py-3" role="row">
              <div className="flex min-w-0 items-start gap-2.5 md:items-center">
                <Magnet aria-hidden className="mt-0.5 size-4 shrink-0 text-accent md:mt-0" />
                <p className="min-w-0 break-all text-sm font-medium leading-5 text-accent md:truncate" title={resource.title || '资源链接'} role="cell">
                  {resource.title || '资源链接'}
                </p>
              </div>
              <span className="text-xs text-secondary-foreground md:hidden" role="cell">大小：{resource.sizeLabel || '未知'}</span>
              <span className="hidden text-center text-sm text-secondary-foreground md:block" role="cell">{resource.sizeLabel || '未知'}</span>
              <div className="flex items-center justify-center md:h-full md:self-stretch" role="cell">
                <button
                  type="button"
                  onClick={() => onCopy(value, resource.id, '磁力链接已复制')}
                  disabled={!value}
                  className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg px-3 text-xs font-semibold leading-none transition-colors md:min-h-9 md:w-auto md:whitespace-nowrap ${copiedId === resource.id ? 'bg-copied text-white' : 'bg-accent text-white hover:bg-accent-hover'} disabled:cursor-not-allowed disabled:opacity-50`}
                  aria-label={`${copiedId === resource.id ? '已复制' : '复制磁力'}：${resource.title || '资源'}`}
                >
                  {copiedId === resource.id ? '已复制' : '复制磁力'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
 * 11. 资源 Tab 容器
 * ============================================================ */

export function ResourceTabs({ tabs, activeTab, onTabChange, children }: {
  tabs: { key: string; label: string; count: number }[];
  activeTab: string;
  onTabChange: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <DetailTabBar
        tabs={tabs}
        active={activeTab}
        onChange={onTabChange}
      />
      {children}
    </div>
  );
}

/* ============================================================
 * 12. 加载骨架屏
 * ============================================================ */

export function DetailPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-48 md:w-64 aspect-[2/3] rounded-xl max-w-[256px] mx-auto sm:mx-0 bg-card shadow-md" />
        <div className="flex-1 space-y-4">
          <div className="h-8 w-48 rounded bg-card" />
          <div className="h-4 w-32 rounded bg-card" />
          <div className="h-4 w-64 rounded bg-card" />
          <div className="h-4 w-48 rounded bg-card" />
          <div className="h-4 w-56 rounded bg-card" />
          <div className="flex gap-2 mt-4">
            <div className="h-8 w-20 rounded-lg bg-card" />
            <div className="h-8 w-20 rounded-lg bg-card" />
          </div>
        </div>
      </div>
      <div className="h-24 rounded-xl bg-card" />
      <div className="h-40 rounded-xl bg-card" />
    </div>
  );
}

/* ============================================================
 * 13. 404 状态
 * ============================================================ */

export function DetailNotFound({ message = '内容不存在', backHref = '/', backLabel = '返回列表' }: {
  message?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="text-center py-20">
      <Clapperboard aria-hidden className="mx-auto mb-4 size-12 text-muted-foreground/70" />
      <p className="text-lg font-medium text-foreground mb-2">{message}</p>
      <p className="text-sm text-muted-foreground mb-6">抱歉，您查找的内容暂时不可用</p>
      <Link href={backHref} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-hover transition-colors shadow-sm">
        {backLabel}<ChevronRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}
