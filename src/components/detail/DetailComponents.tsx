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
    <nav className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in-up stagger-1">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span className="text-border">›</span>}
          {item.href ? (
            <Link className="text-secondary-foreground hover:text-accent transition-colors" href={item.href}>{item.label}</Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
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
    <div className="w-full sm:w-48 md:w-56 lg:w-64 shrink-0 mx-auto sm:mx-0 max-w-[256px] animate-fade-in-up stagger-2">
      <div className="relative group">
        <LazyImage
          src={src || `https://picsum.photos/seed/${seed}/400/600`}
          alt={alt}
          className="rounded-xl shadow-lg"
          placeholder="skeleton"
          fallbackSrc={`https://picsum.photos/seed/${seed}/400/600`}
          lazy={false}
        />
        {/* Decorative glow behind cover */}
        <div className="absolute -inset-1 rounded-xl bg-accent/10 blur-sm -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </div>
  );
}

/* ============================================================
 * 3. 标题 + 年份
 * ============================================================ */

export function DetailTitle({ title, year }: { title: string; year?: number }) {
  return (
    <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
      {title}
      {year != null && year > 0 && (
        <span className="text-lg font-normal ml-2 text-muted-foreground">
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
  const badges: { label: string; value: string; bg: string; color: string; icon: string }[] = [
    douban != null ? { label: '豆瓣', value: douban.toFixed(1), bg: 'var(--badge-douban-bg)', color: 'var(--badge-douban-text)', icon: '⭐' } : null,
    imdb != null ? { label: 'IMDB', value: imdb.toFixed(1), bg: 'var(--badge-imdb-bg)', color: 'var(--badge-imdb-text)', icon: '🎬' } : null,
    rt != null ? { label: '烂番茄', value: `${rt}%`, bg: 'var(--badge-rt-bg)', color: 'var(--badge-rt-text)', icon: '🍅' } : null,
  ].filter((b): b is NonNullable<typeof b> => b !== null);

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((b, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm"
          style={{ backgroundColor: b.bg, color: b.color }}
        >
          <span className="text-xs">{b.icon}</span>
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
      <span className="shrink-0 font-medium text-muted-foreground border-l-2 border-accent/30 pl-2" style={{ minWidth: '3.5em' }}>
        {label}
      </span>
      <div className={accent ? "text-accent font-medium" : "text-secondary-foreground"}>{children}</div>
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
    <section className="rounded-xl p-5 border animate-fade-in-up stagger-6">
      <h2 className="text-lg font-bold mb-3 text-foreground flex items-center gap-2">
        <span className="w-1 h-5 bg-accent rounded-full" />
        简介
      </h2>
      <p className={`text-sm leading-relaxed text-secondary-foreground ${expanded ? '' : 'line-clamp-3'}`}>
        {text}
      </p>
      {text.length > 200 && (
        <button
          onClick={onToggle}
          className="mt-3 text-sm font-medium text-accent active:opacity-70 transition-opacity flex items-center gap-1 hover:gap-2 transition-all"
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
    <div className="flex gap-6 border-b border-border">
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
    <div className="animate-fade-in-up stagger-7">
      <h3 className="font-bold mb-3 text-foreground flex items-center gap-2">
        <span className="w-1 h-5 bg-accent rounded-full" />
        全部{label} ({total}{label})
      </h3>
      <div className={`grid ${gridCols} gap-2`}>
        {episodes.map(ep => (
          <button
            key={ep}
            onClick={() => onSelect(selected === ep ? null : ep)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              selected === ep
                ? 'shadow-md'
                : 'hover:border-accent/50 hover:text-accent'
            }`}
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
    <section className="rounded-xl p-5 border animate-fade-in-up stagger-8">
      <h3 className="font-bold mb-4 text-foreground flex items-center gap-2">
        <span className="w-1 h-5 bg-accent rounded-full" />
        {title}
      </h3>
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 rounded-lg animate-pulse bg-background" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl mb-2">📺</p>
          <p className="text-sm text-muted-foreground">
            {selectedEpisode ? `该${episodeLabel}暂无资源` : emptyText}
          </p>
        </div>
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
                      className="flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all hover:border-accent/40 hover:shadow-sm active:scale-[0.98]"
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
    return (
      <div className="text-center py-10">
        <p className="text-3xl mb-2">📭</p>
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {resources.map(r => (
        <div
          key={r.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 rounded-lg border hover:border-accent/30 hover:bg-accent/5 transition-all group"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">{icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium break-all sm:truncate text-foreground">
                {r.resolution && (
                  <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2 bg-accent/10 text-accent">
                    {r.resolution}
                  </span>
                )}
                {r.title || '资源链接'}
              </p>
              {r.storageName && (
                <p className="text-xs mt-0.5 text-muted-foreground">{r.storageName}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => onCopy(r.url || '', r.id)}
            className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all active:scale-95 ${
              copiedId === r.id ? 'bg-copied' : 'bg-accent hover:bg-accent-hover shadow-sm'
            }`}
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
    <section className="rounded-xl p-5 border animate-fade-in-up stagger-9">
      <h2 className="text-lg font-bold mb-4 text-foreground flex items-center gap-2">
        <span className="w-1 h-5 bg-accent rounded-full" />
        下载资源
      </h2>
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
      <p className="text-5xl mb-4">🎬</p>
      <p className="text-lg font-medium text-foreground mb-2">{message}</p>
      <p className="text-sm text-muted-foreground mb-6">抱歉，您查找的内容暂时不可用</p>
      <Link href={backHref} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-accent hover:bg-accent-hover transition-colors shadow-sm">
        ← {backLabel}
      </Link>
    </div>
  );
}
