/**
 * 共享样式工具
 * 提供常用的样式类名和样式对象，减少内联样式
 */

/**
 * 卡片样式类名
 */
export const cardStyles = {
  base: 'rounded-xl border transition-colors',
  primary: 'bg-[var(--bg-primary)] border-[var(--border-color)]',
  secondary: 'bg-[var(--bg-secondary)] border-[var(--border-color)]',
  card: 'bg-[var(--bg-card)] border-[var(--border-color)]',
  hover: 'hover:shadow-md hover:border-[var(--accent)]',
} as const;

/**
 * 按钮样式类名
 */
export const buttonStyles = {
  primary: 'px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90',
  secondary: 'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
  ghost: 'px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--bg-card)]',
} as const;

/**
 * 输入框样式类名
 */
export const inputStyles = {
  base: 'w-full h-10 px-4 rounded-lg text-sm border outline-none transition-colors',
  focus: 'focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)]',
} as const;

/**
 * 文本样式类名
 */
export const textStyles = {
  primary: 'text-[var(--text-primary)]',
  secondary: 'text-[var(--text-secondary)]',
  muted: 'text-[var(--text-muted)]',
  accent: 'text-[var(--accent)]',
} as const;

/**
 * 布局样式类名
 */
export const layoutStyles = {
  container: 'flex flex-col gap-6',
  section: 'rounded-xl p-5 border',
  grid: 'grid gap-3 md:gap-4',
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
} as const;

/**
 * 动画样式类名
 */
export const animationStyles = {
  pulse: 'animate-pulse',
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
} as const;

/**
 * 获取卡片样式对象（用于内联样式）
 */
export function getCardStyle(variant: 'primary' | 'secondary' | 'card' = 'card') {
  return {
    backgroundColor: `var(--bg-${variant})`,
    borderColor: 'var(--border-color)',
  };
}

/**
 * 获取按钮样式对象（用于内联样式）
 */
export function getButtonStyle(variant: 'primary' | 'secondary' | 'ghost' = 'primary') {
  if (variant === 'primary') {
    return { backgroundColor: 'var(--accent)' };
  }
  return {
    borderColor: 'var(--border-color)',
    color: 'var(--text-secondary)',
  };
}

/**
 * 获取输入框样式对象（用于内联样式）
 */
export function getInputStyle() {
  return {
    backgroundColor: 'var(--bg-primary)',
    borderColor: 'var(--border-color)',
    color: 'var(--text-primary)',
  };
}
