'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import LazyImage from '@/components/ui/lazy-image';

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
    <nav className="flex items-center gap-2 text-sm text-muted-foreground" >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span>›</span>}
          {item.href ? (
            <Link className="text-secondary-foreground" href={item.href} >{item.label}</Link>
          ) : (
            <span className="text-foreground" >{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ============================================================
 * 2. 封面海报
 * ============================================================ */

export function DetailCover({ src, alt, seed }: { src?: string; alt: string; seed: string }) {
  return (
    <div className="w-full sm:w-48 md:w-64 shrink-0 mx-auto sm:mx-0 max-w-[256px]">
      <LazyImage
        src={src || `https://picsum.photos/seed/${seed}/400/600`}
        alt={alt}
        className="rounded-xl"
        placeholder="skeleton"
        fallbackSrc={`https://picsum.photos/seed/${seed}/400/600`}
        lazy={false}
      />
    </div>
  );
}

/* ============================================================
 * 3. 标题 + 年份
 * ============================================================ */

export function DetailTitle({ title, year }: { title: string; year?: number }) {
  return (
    <h1 className="text-2xl md:text-3xl font-bold text-foreground" >
      {title}
      {year != null && year > 0 && (
        <span className="text-lg font-normal ml-2 text-muted-foreground" >
          ({year})
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
  imdb?: number | null;
  rt?: number | null;
}

export function RatingBadges({ douban, imdb, rt }: RatingBadgesProps) {
  const badges: { label: string; value: string; bg: string; color: string; }[] = [
    douban != null ? { label: '豆瓣', value: douban.toFixed(1), bg: 'var(--badge-douban-bg)', color: 'var(--badge-douban-text)' } : null,
    imdb != null ? { label: 'IMDB', value: imdb.toFixed(1), bg: 'var(--badge-imdb-bg)', color: 'var(--badge-imdb-text)' } : null,
    rt != null ? { label: '烂番茄', value: `${rt}%`, bg: 'var(--badge-rt-bg)', color: 'var(--badge-rt-text)' } : null,
  ].filter((b): b is NonNullable<typeof b> => b !== null);

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {badges.map((b, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold"
          style={{ backgroundColor: b.bg, color: b.color }}
        >
          {b.label} {b.value}
        </span>
      ))}
    </div>
  );
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
    <div className="flex gap-2 text-sm leading-relaxed">
      <span className="shrink-0 font-medium text-muted-foreground" style={{ minWidth: '3.5em' }}>
        {label}
      </span>
      <div className={accent ? "text-accent" : "text-secondary-foreground"}>{children}</div>
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
  if (!text) return null;

  return (
    <section
      className="rounded-xl p-5 border"

    >
      <h2 className="text-lg font-bold mb-3 text-foreground" >简介</h2>
      <p
        className={`text-sm leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}

      >
        {text}
      </p>
      {text.length > 200 && (
        <button
          onClick={onToggle}
          className="mt-3 text-sm font-medium active:opacity-70 transition-opacity flex items-center gap-1"

        >
          {expanded ? '收起' : '展开全部'}
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
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
    <div className="flex gap-6 border-b border-border" >
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className="pb-3 text-sm font-medium border-b-2 transition-colors"
          style={{
            color: active === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
            borderColor: active === tab.key ? 'var(--accent)' : 'transparent',
          }}
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
    <div>
      <h3 className="font-medium mb-3 text-foreground" >
        全部{label} ({total}{label})
      </h3>
      <div className={`grid ${gridCols} gap-2`}>
        {episodes.map(ep => (
          <button
            key={ep}
            onClick={() => onSelect(selected === ep ? null : ep)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: selected === ep ? 'var(--accent)' : 'var(--bg-card)',
              color: selected === ep ? '#fff' : 'var(--text-primary)',
              border: selected === ep ? 'none' : '1px solid var(--border-color)',
            }}
          >
            {ep}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * 9. 在线播放资源网格（按平台分组展示）
 * ============================================================ */

interface OnlineResource {
  id: number;
  sourceName?: string;
  sourceUrl?: string;
}

/** 平台名称到图标/颜色的映射 */
const PLATFORM_STYLES: Record<string, { icon: string; color: string }> = {
  '优酷': { icon: '▶️', color: '#00BEFF' },
  '腾讯视频': { icon: '▶️', color: '#FF6A00' },
  '爱奇艺': { icon: '▶️', color: '#00BE06' },
  '芒果TV': { icon: '▶️', color: '#FF7F00' },
  'bilibili': { icon: '▶️', color: '#FB7299' },
  '哔哩哔哩': { icon: '▶️', color: '#FB7299' },
  '搜狐视频': { icon: '▶️', color: '#EE2F2F' },
  'PPTV': { icon: '▶️', color: '#0099FF' },
  '乐视': { icon: '▶️', color: '#E60012' },
};

function getPlatformStyle(name: string) {
  const key = Object.keys(PLATFORM_STYLES).find(k => name.includes(k));
  return key ? PLATFORM_STYLES[key] : { icon: '🎬', color: 'var(--accent)' };
}

export function OnlineResourceGrid({ resources, loading, emptyText = '暂无在线播放资源', selectedEpisode, episodeLabel = '集' }: {
  resources: OnlineResource[];
  loading: boolean;
  emptyText?: string;
  selectedEpisode?: number | null;
  episodeLabel?: string;
}) {
  const title = selectedEpisode ? `第${selectedEpisode}${episodeLabel} 播放源` : '在线播放';

  // 按平台（sourceName）分组
  const grouped = useMemo(() => {
    const map = new Map<string, OnlineResource[]>();
    for (const r of resources) {
      const name = r.sourceName || '未知来源';
      const arr = map.get(name) || [];
      arr.push(r);
      map.set(name, arr);
    }
    return Array.from(map.entries());
  }, [resources]);

  return (
    <section
      className="rounded-xl p-5 border"
    >
      <h3 className="font-bold mb-4 text-foreground">{title}</h3>
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 rounded-lg animate-pulse bg-background" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">
          {selectedEpisode ? `该${episodeLabel}暂无资源` : emptyText}
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([platformName, items]) => {
            const style = getPlatformStyle(platformName);
            return (
              <div key={platformName}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{style.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{platformName}</span>
                  <span className="text-xs text-muted-foreground">({items.length}条线路)</span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {items.map(r => (
                    <a
                      key={r.id}
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-2.5 rounded-lg border transition-colors hover:opacity-80"
                    >
                      <span className="text-sm font-medium truncate text-foreground">
                        {items.length > 1 ? `线路${items.indexOf(r) + 1}` : platformName}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: style.color }}
                      >
                        播放
                      </span>
                    </a>
                  ))}
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
  resolution?: string;
  storageName?: string;
}

export function CopyableResourceList({ resources, copiedId, onCopy, icon, emptyText }: {
  resources: CopyableResource[];
  copiedId: number | null;
  onCopy: (url: string, id: number) => void;
  icon: string;
  emptyText: string;
}) {
  if (resources.length === 0) {
    return <p className="text-center py-8 text-sm text-muted-foreground" >{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {resources.map(r => (
        <div
          key={r.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-lg border"
          
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-lg shrink-0">{icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium break-all sm:truncate text-foreground" >
                {r.resolution && (
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2"

                  >
                    {r.resolution}
                  </span>
                )}
                {r.title || '资源链接'}
              </p>
              {r.storageName && (
                <p className="text-xs mt-0.5 text-muted-foreground" >{r.storageName}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => onCopy(r.url || '', r.id)}
            className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-medium text-white ${copiedId === r.id ? 'bg-copied' : 'bg-accent'}`}
          >
            {copiedId === r.id ? '已复制 ✓' : '复制链接'}
          </button>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
 * 11. 资源 Tab 容器（磁力 + 网盘）
 * ============================================================ */

export function ResourceTabs({ tabs, activeTab, onTabChange, children }: {
  tabs: { key: string; label: string; count: number }[];
  activeTab: string;
  onTabChange: (key: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl p-5 border"

    >
      <h2 className="text-lg font-bold mb-4 text-foreground" >下载资源</h2>
      <DetailTabBar
        tabs={tabs}
        active={activeTab}
        onChange={onTabChange}
      />
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ============================================================
 * 12. 加载骨架屏
 * ============================================================ */

export function DetailPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex flex-col sm:flex-row gap-6">
        <div
          className="w-full sm:w-48 md:w-64 aspect-[2/3] rounded-xl max-w-[256px] mx-auto sm:mx-0"

        />
        <div className="flex-1 space-y-4">
          <div className="h-8 w-48 rounded bg-card"  />
          <div className="h-4 w-32 rounded bg-card"  />
          <div className="h-4 w-64 rounded bg-card"  />
        </div>
      </div>
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
    <div className="text-center py-16">
      <p className="text-secondary-foreground" >{message}</p>
      <Link href={backHref} className="text-sm mt-4 inline-block bg-accent" >
        ← {backLabel}
      </Link>
    </div>
  );
}
