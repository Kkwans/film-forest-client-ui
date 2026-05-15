'use client';

/**
 * 内容展示共享 UI 组件
 * 从 MovieCard / SearchPage / ListDetailPage 等多处提取的重复渲染逻辑
 */

import { getStatusConfig, TYPE_LABELS, type StatusIconConfig } from '@/lib/contentConstants';

/* ============================================================
 * 1. 状态图标按钮（想看/在看/看过/收藏）
 * 用于：MovieCard 左上角、SearchPage 右上角等
 * ============================================================ */

interface StatusIconButtonProps {
  /** 当前状态（listType），null 表示未收藏 */
  listType: string | null | undefined;
  /** 点击事件（单击：切换想看） */
  onClick: (e: React.MouseEvent) => void;
  /** 双击事件（打开片单选择） */
  onDoubleClick?: (e: React.MouseEvent) => void;
  /** 按钮大小 */
  size?: 'sm' | 'md';
  /** 额外 class */
  className?: string;
  /** 提示文字 */
  title?: string;
  /** 加载中 */
  loading?: boolean;
}

export function StatusIconButton({
  listType,
  onClick,
  onDoubleClick,
  size = 'sm',
  className = '',
  title,
  loading = false,
}: StatusIconButtonProps) {
  const config = listType ? getStatusConfig(listType) : null;
  const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6 md:w-7 md:h-7';
  const iconClass = size === 'sm' ? 'w-3 h-3' : 'w-3 h-3 md:w-4 md:h-4';

  const defaultTitle = config
    ? `${config.label}（单击提示，双击选择片单）`
    : '想看（单击加入，双击选择片单）';

  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`${sizeClass} rounded-full flex items-center justify-center backdrop-blur-sm transition-colors hover:scale-110 ${className}`}
      style={{
        backgroundColor: config ? `${config.color}cc` : 'rgba(0,0,0,0.4)',
        color: '#fff',
      }}
      title={title || defaultTitle}
    >
      {loading ? (
        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : config ? (
        config.fill ? (
          <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
            <path d={config.icon} />
          </svg>
        ) : (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={config.icon} />
          </svg>
        )
      ) : (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </button>
  );
}

/* ============================================================
 * 2. 类型标签（电影/电视剧/综艺/动漫/短剧）
 * ============================================================ */

export function TypeBadge({ contentType, size = 'sm' }: { contentType: string; size?: 'xs' | 'sm' }) {
  const label = TYPE_LABELS[contentType] || contentType;
  const sizeClass = size === 'xs' ? 'text-[10px]' : 'text-[10px] md:text-xs';

  return (
    <span
      className={`px-1.5 py-0.5 rounded ${sizeClass}`}

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
  { label: '电视剧', value: 'drama' },
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
        <span
          key={i}
          className="text-[9px] md:text-[10px] px-1 py-0.5 rounded shrink-0"
          style={{
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {g}
        </span>
      ))}
    </div>
  );
}
