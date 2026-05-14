// @ts-nocheck
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-8 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
        <div className="h-4 w-1 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
        <div className="h-4 w-10 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
        <div className="h-4 w-1 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
        <div className="h-4 w-24 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
      </div>

      {/* Header: poster + info */}
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-48 md:w-64 aspect-[2/3] rounded-xl max-w-[256px] mx-auto sm:mx-0" style={{ backgroundColor: 'var(--bg-card)' }} />
        <div className="flex-1 space-y-4">
          <div className="h-8 w-48 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="h-10 w-36 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-6 w-16 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
          </div>
          <div className="space-y-2 mt-2">
            <div className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-4 w-2/3 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
          </div>
        </div>
      </div>

      {/* Synopsis skeleton */}
      <div className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="h-6 w-12 rounded mb-3" style={{ backgroundColor: 'var(--bg-card)' }} />
        <div className="space-y-2">
          <div className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="h-4 w-full rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="h-4 w-2/3 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
        </div>
      </div>

      {/* Resources skeleton */}
      <div className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="h-6 w-20 rounded mb-4" style={{ backgroundColor: 'var(--bg-card)' }} />
        <div className="flex gap-6 border-b mb-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="h-5 w-16 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="h-5 w-16 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
