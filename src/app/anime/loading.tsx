// @ts-nocheck
export default function Loading() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-current border-t-transparent rounded-full animate-spin" style={{ color: 'var(--accent)' }} />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>加载中...</span>
      </div>
    </div>
  );
}
