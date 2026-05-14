// @ts-nocheck
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Title skeleton */}
      <div className="h-8 w-16 rounded animate-pulse bg-card"  />

      {/* Filter skeletons */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 rounded-full animate-pulse bg-card" style={{ width: `${48 + (i % 3) * 16}px` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-16 rounded-full animate-pulse bg-card"  />
        ))}
      </div>

      {/* Count + sort skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-20 rounded animate-pulse bg-card"  />
        <div className="h-8 w-28 rounded-lg animate-pulse bg-card"  />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4" style={{ minHeight: '60vh' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 animate-pulse">
            <div className="aspect-[2/3] rounded-xl bg-card"  />
            <div className="h-4 w-3/4 rounded bg-card"  />
            <div className="h-3 w-1/2 rounded bg-card"  />
          </div>
        ))}
      </div>
    </div>
  );
}
