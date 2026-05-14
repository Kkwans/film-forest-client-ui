// 筛选标签按钮组件 - 统一列表页/搜索页的筛选按钮样式
// 用于：类型筛选、类型标签、分类切换等场景

'use client';

interface FilterChipProps {
  /** 显示文本 */
  label: string;
  /** 是否选中 */
  active: boolean;
  /** 点击回调 */
  onClick: () => void;
  /** 尺寸变体 */
  size?: 'sm' | 'md';
}

export default function FilterChip({ label, active, onClick, size = 'md' }: FilterChipProps) {
  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1 rounded-lg text-xs'
    : 'px-3 py-1.5 rounded-full text-sm';

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses} font-medium cursor-pointer transition-colors`}
      style={
        active
          ? { background: 'var(--accent)', color: '#fff' }
          : {
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }
      }
    >
      {label}
    </button>
  );
}
