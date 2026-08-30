'use client';

import type { ReactNode } from 'react';

/**
 * 内容展示共享 UI 组件
 * 从 MovieCard / SearchPage / ListDetailPage 等多处提取的重复渲染逻辑
 */

import { CONTENT_TYPE_TONE_CLASSES, getContentTypeConfig, getStatusConfig, TYPE_LABELS } from '@/lib/contentConstants';
import { BookmarkPlus, CheckCircle2, Eye, Heart, Star } from 'lucide-react';
import { getGenreColorToken, getPosterStatusMode } from '@/lib/uiContracts';

/* ============================================================
 * 1. 状态图标按钮（想看/在看/看过/片单）
 * 用于：MovieCard 左上角、SearchPage 右上角等
 * ============================================================ */

interface StatusIconButtonProps {
  /** 当前状态（listType），null 表示未加入片单 */
  listType: string | null | undefined;
  /** 打开片单管理 */
  onClick?: (e: React.MouseEvent) => void;
  /** 按钮大小 */
  size?: 'sm' | 'md';
  /** 额外 class */
  className?: string;
  /** 提示文字 */
  title?: string;
  /** 加载中 */
  loading?: boolean;
  /** 在桌面端同时展示状态文案，移动端仍保持图标按钮 */
  showLabel?: boolean;
  /** 覆盖模式提供对比底；bare 只保留原始图标，用于海报卡片。 */
  variant?: 'default' | 'overlay' | 'bare';
  /** 无状态时的入口图标；海报卡片用心形，加入片单入口用书签加号 */
  emptyIcon?: 'heart' | 'list';
  /** 只读状态仍保留可识别图标，但不伪装成可点击操作。 */
  readOnly?: boolean;
}

export function StatusIconButton({
  listType,
  onClick,
  size = 'sm',
  className = '',
  title,
  loading = false,
  showLabel = false,
  variant = 'default',
  emptyIcon = 'list',
  readOnly = false,
}: StatusIconButtonProps) {
  const config = listType ? getStatusConfig(listType) : null;
  const sizeClass = size === 'sm' ? 'size-11 sm:size-9' : 'size-11';
  const iconClass = variant === 'bare' ? 'size-6' : size === 'sm' ? 'size-4' : 'size-[18px]';

  const label = config?.label || '加入片单';
  const defaultTitle = label;
  const StatusIcon = listType === 'watched'
    ? CheckCircle2
    : listType === 'watching'
      ? Eye
      : listType === 'want_to_watch'
        ? Heart
        : emptyIcon === 'heart' ? Heart : BookmarkPlus;
  const isWant = listType === 'want_to_watch';
  const buttonSize = showLabel
    ? 'min-h-11 min-w-11 px-3'
    : sizeClass;
  const buttonStyle = variant === 'bare'
    ? {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        color: config?.color || '#fff',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.9)) drop-shadow(0 0 5px rgba(0,0,0,.55))',
      }
    : variant === 'overlay'
    ? {
        backgroundColor: isWant && config ? `color-mix(in srgb, ${config.color} 18%, rgba(15, 23, 42, 0.28))` : 'rgba(15, 23, 42, 0.28)',
        borderColor: isWant && config ? `color-mix(in srgb, ${config.color} 60%, rgba(255, 255, 255, 0.65))` : 'rgba(255, 255, 255, 0.65)',
        color: config?.color && listType !== null ? config.color : '#fff',
      }
    : {
        backgroundColor: config ? `color-mix(in srgb, ${config.color} 12%, transparent)` : 'var(--bg-card)',
        borderColor: config ? `color-mix(in srgb, ${config.color} 32%, var(--border-color))` : 'var(--border-color)',
        color: config?.color || 'var(--text-secondary)',
      };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || readOnly}
      className={`${buttonSize} inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border transition-[background-color,border-color,color,transform] hover:border-current/55 ${variant === 'overlay' ? 'backdrop-blur-[2px] hover:bg-black/40' : ''} ${variant === 'bare' ? 'hover:scale-110' : ''} ${className}`}
      style={buttonStyle}
      title={title || defaultTitle}
      aria-label={title || defaultTitle}
      aria-haspopup={!readOnly && variant !== 'bare' ? 'dialog' : undefined}
      aria-disabled={readOnly || undefined}
    >
      {loading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <StatusIcon className={iconClass} fill={isWant ? 'currentColor' : 'none'} aria-hidden />}
      {showLabel && <span className="hidden text-xs font-semibold sm:inline">{label}</span>}
    </button>
  );
}

export function RatingBadge({ score, source = '豆瓣' }: { score: number; source?: string }) {
  return (
    <span
      className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-white/20 bg-slate-950/68 px-2 text-[10px] font-semibold text-white shadow-sm backdrop-blur-md sm:h-9"
      aria-label={`${source}评分 ${score.toFixed(1)}`}
    >
      <span className="font-medium text-white/72">{source}</span>
      <span className="tabular-nums">{score.toFixed(1)}</span>
    </span>
  );
}

export interface RatingSummaryProps {
  douban?: number | null;
  imdb?: number | null;
  rt?: number | null;
  doubanDetail?: string;
  imdbDetail?: string;
  rtDetail?: string;
  /** Detail pages may show a source even when only its vote count is known. */
  includeEmpty?: boolean;
  variant?: 'compact' | 'detail';
  className?: string;
}

/** Shared platform-score treatment for search, detail and activity surfaces. */
export function RatingSummary({
  douban,
  imdb,
  rt,
  doubanDetail,
  imdbDetail,
  rtDetail,
  includeEmpty = false,
  variant = 'compact',
  className = '',
}: RatingSummaryProps) {
  const formatScore = (value: number | null | undefined, suffix = '') =>
    typeof value === 'number' && value > 0 ? `${value.toFixed(1)}${suffix}` : null;
  const ratings = [
    { label: '豆瓣', score: formatScore(douban), detail: doubanDetail, className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    { label: 'IMDb', score: formatScore(imdb), detail: imdbDetail, className: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    { label: '烂番茄', score: formatScore(rt, '%'), detail: rtDetail, className: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300' },
  ].filter((rating) => rating.score || (includeEmpty && rating.detail));

  if (ratings.length === 0) return null;
  const detail = variant === 'detail';
  return (
    <div className={`${detail ? 'grid grid-flow-col auto-cols-fr items-stretch gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2' : 'flex min-w-0 flex-wrap items-center gap-1.5'} ${className}`} aria-label="平台评分">
      {ratings.map((rating) => (
        <span key={rating.label} className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border ${detail ? 'px-1.5 py-1.5 text-xs sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2 sm:text-sm' : 'h-6 px-1.5 text-[10px]'} ${rating.className}`}>
          <Star aria-hidden className={`${detail ? 'hidden size-3.5 sm:block' : 'size-3'} fill-current`} />
          <span className={`truncate font-medium opacity-80 ${detail ? 'text-[10px] sm:text-xs' : ''}`}>{rating.label}</span>
          <strong className="tabular-nums">{rating.score || '暂无'}</strong>
          {rating.detail && <span className={`${detail ? 'hidden text-[11px] xl:inline' : 'hidden'} opacity-70`}>{rating.detail}</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * Shared responsive horizontal media shell.  The desktop action column is a
 * real grid track; on narrow screens it moves below the content instead of
 * covering long titles or relying on compensating right padding.
 */
export function MediaHorizontalCard({
  poster,
  actions,
  footer,
  children,
  className = '',
}: {
  poster: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`grid min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-3 transition-[border-color,box-shadow] hover:border-accent/40 hover:shadow-sm sm:p-4 ${className}`}>
      <div className="grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:gap-4">
        <div className="min-w-0 sm:row-span-2">{poster}</div>
        <div className="min-w-0">{children}</div>
        {actions && <div className="col-span-2 flex min-w-0 items-center justify-end gap-1.5 border-t border-border/60 pt-2 sm:col-span-1 sm:row-span-2 sm:flex-col sm:items-end sm:justify-start sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">{actions}</div>}
      </div>
      {footer && <div className="mt-3 min-w-0 border-t border-border/60 pt-3">{footer}</div>}
    </article>
  );
}

interface PosterStatusControlProps {
  listType: string | null | undefined;
  wantToWatch?: boolean;
  loading?: boolean;
  onToggleWant: (event: React.MouseEvent) => void;
}

export function PosterStatusControl({ listType, wantToWatch, loading = false, onToggleWant }: PosterStatusControlProps) {
  const mode = getPosterStatusMode(listType);
  const effectiveType = mode === 'toggle-want' && wantToWatch ? 'want_to_watch' : listType;
  const config = effectiveType ? getStatusConfig(effectiveType) : null;
  const title = mode === 'toggle-want'
    ? wantToWatch ? '移出想看' : '加入想看'
    : `${config?.label || '已加入片单'}，请在详情页或收藏中管理`;

  return (
    <StatusIconButton
      listType={effectiveType}
      onClick={mode === 'toggle-want' ? onToggleWant : undefined}
      size="sm"
      loading={loading}
      title={title}
      variant="bare"
      emptyIcon="heart"
      readOnly={mode === 'readonly'}
    />
  );
}

/* ============================================================
 * 2. 类型标签（电影/剧集/综艺/动漫/短剧）
 * ============================================================ */

export function TypeBadge({ contentType, size = 'sm' }: { contentType: string; size?: 'xs' | 'sm' }) {
  const normalizedType = contentType === 'short' || contentType === 'short-drama' ? 'short_drama' : contentType;
  const config = Object.prototype.hasOwnProperty.call(TYPE_LABELS, normalizedType) ? getContentTypeConfig(normalizedType) : null;
  const label = config?.label || TYPE_LABELS[contentType] || contentType;
  const sizeClass = size === 'xs' ? 'text-[11px]' : 'text-[11px] md:text-xs';

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-lg border px-2 py-1 font-semibold ${sizeClass} ${config ? CONTENT_TYPE_TONE_CLASSES[config.code] : 'border-border bg-background text-secondary-foreground'}`}
    >
      {label}
    </span>
  );
}

/* ============================================================
 * 3. 类型标签组（用于筛选）
 * ============================================================ */

interface TypeFilterProps {
  value: string;
  onChange: (value: string) => void;
  /** 额外选项（如"全部"） */
  includeAll?: boolean;
}

const DEFAULT_TYPES = [
  { label: '全部', value: '' },
  { label: '电影', value: 'movie' },
  { label: '剧集', value: 'drama' },
  { label: '综艺', value: 'variety' },
  { label: '动漫', value: 'anime' },
  { label: '短剧', value: 'short_drama' },
];

export function TypeFilter({ value, onChange, includeAll = true }: TypeFilterProps) {
  const types = includeAll ? DEFAULT_TYPES : DEFAULT_TYPES.filter(t => t.value !== '');

  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: value === t.value ? 'var(--accent)' : 'var(--bg-card)',
            color: value === t.value ? '#fff' : 'var(--text-secondary)',
            border: value === t.value ? 'none' : '1px solid var(--border-color)',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
 * 4. Genre 标签列表
 * ============================================================ */

export function GenreTags({ genres, max = 2 }: { genres: string[]; max?: number }) {
  if (genres.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden">
      {genres.slice(0, max).map((g, i) => (
        <span key={i} className={`genre-tag genre-tag-${getGenreColorToken(g)} min-w-0 max-w-[7.5rem] shrink truncate rounded-md px-2 py-0.5 text-[11px] font-medium leading-4 md:text-xs`} title={g}>
          {g}
        </span>
      ))}
    </div>
  );
}
