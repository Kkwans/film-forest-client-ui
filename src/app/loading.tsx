// @ts-nocheck
export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      {/* Hero skeleton */}
      <section className="relative overflow-hidden rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="px-6 py-6 md:px-16 md:py-14 animate-pulse">
          <div className="h-5 w-32 rounded-full mb-4" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="h-10 w-3/4 rounded mb-4" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="h-6 w-2/3 rounded mb-6" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="flex gap-3">
            <div className="h-11 w-28 rounded-full" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-11 w-28 rounded-full" style={{ backgroundColor: 'var(--bg-card)' }} />
          </div>
        </div>
      </section>

      {/* Section skeletons */}
      {[1, 2, 3].map((section) => (
        <div key={section} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="h-7 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
            <div className="h-5 w-12 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
          </div>
          <div className="hidden md:grid grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 animate-pulse">
                <div className="aspect-[2/3] rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }} />
                <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
                <div className="h-3 w-1/2 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
              </div>
            ))}
          </div>
          <div className="md:hidden flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[120px] flex flex-col gap-2 animate-pulse">
                <div className="aspect-[2/3] rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }} />
                <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
