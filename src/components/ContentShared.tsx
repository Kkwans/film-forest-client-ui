'use client';

/**
 * 内容展示共享 UI 组件
 * 从 MovieCard / SearchPage / ListDetailPage 等多处提取的重复渲染逻辑
 */

import { CONTENT_TYPE_TONE_CLASSES, getContentTypeConfig, getStatusConfig, TYPE_LABELS } from '@/lib/contentConstants';
import { BookmarkPlus, CheckCircle2, Eye, Heart } from 'lucide-react';
import { getGenreColorToken } from '@/lib/uiContracts';

/* ============================================================
 * 1. 状态图标按钮（想看/在看/看过/片单）
 * 用于：MovieCard 左上角、SearchPage 右上角等
 * ============================================================ */

interface StatusIconButtonProps {
  /** 当前状态（listType），null 表示未加入片单 */
  listType: string | null | undefined;
  /** 打开片单管理 */
  onClick: (e: React.MouseEvent) => void;
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
  /** 覆盖在海报上时使用透明深色底，避免白色方块遮挡图片 */
  variant?: 'default' | 'overlay';
  /** 无状态时的入口图标；海报卡片用心形，加入片单入口用书签加号 */
  emptyIcon?: 'heart' | 'list';
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
}: StatusIconButtonProps) {
  const config = listType ? getStatusConfig(listType) : null;
  const sizeClass = size === 'sm' ? 'size-7' : 'size-8';
  const iconClass = size === 'sm' ? 'size-3.5' : 'size-4';

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
    ? 'min-h-8 min-w-8 px-2.5'
    : sizeClass;
  const buttonStyle = variant === 'overlay'
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
      className={`${buttonSize} inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border transition-[background-color,border-color,color] hover:border-current/55 ${variant === 'overlay' ? 'backdrop-blur-[2px] hover:bg-black/40' : ''} ${className}`}
      style={buttonStyle}
      title={title || defaultTitle}
      aria-label={title || defaultTitle}
      aria-haspopup="dialog"
    >
      {loading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <StatusIcon className={iconClass} fill={isWant ? 'currentColor' : 'none'} aria-hidden />}
      {showLabel && <span className="hidden text-xs font-semibold sm:inline">{label}</span>}
    </button>
  );
}

/* ============================================================
 * 2. 类型标签（电影/剧集/综艺/动漫/短剧）
 * ============================================================ */

export function TypeBadge({ contentType, size = 'sm' }: { contentType: string; size?: 'xs' | 'sm' }) {
  const normalizedType = contentType === 'short' || contentType === 'short-drama' ? 'short_drama' : contentType;
  const config = Object.prototype.hasOwnProperty.call(TYPE_LABELS, normalizedType) ? getContentTypeConfig(normalizedType) : null;
  const label = config?.label || TYPE_LABELS[contentType] || contentType;
  const sizeClass = size === 'xs' ? 'text-[10px]' : 'text-[10px] md:text-xs';

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

export function GenreTags({ genres, max = 4 }: { genres: string[]; max?: number }) {
  if (genres.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap overflow-hidden" style={{ maxHeight: '22px' }}>
      {genres.slice(0, max).map((g, i) => (
        <span key={i} className={`genre-tag genre-tag-${getGenreColorToken(g)} text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-md shrink-0`}>
          {g}
        </span>
      ))}
    </div>
  );
}
