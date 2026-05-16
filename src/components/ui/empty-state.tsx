
'use client';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * 空状态组件
 * 用于列表为空、搜索无结果等场景
 */
export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4">
      <span className="text-4xl mb-3">{icon}</span>
      <h3 className="text-lg font-medium mb-1 text-secondary-foreground" >
        {title}
      </h3>
      {description && (
        <p className="text-sm text-center max-w-md text-muted-foreground" >
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"

        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * 搜索无结果组件
 */
export function SearchEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      icon="🔍"
      title={`没有找到「${query}」的相关结果`}
      description="试试其他关键词？"
    />
  );
}

/**
 * 列表为空组件
 */
export function ListEmpty({ type = '内容' }: { type?: string }) {
  return (
    <EmptyState
      icon="📭"
      title={`暂无${type}`}
      description="稍后再来看看吧"
    />
  );
}
