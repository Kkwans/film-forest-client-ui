export default function UserListLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 rounded bg-card" />
        <div className="h-8 w-20 rounded-lg bg-card" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-[2/3] rounded-xl bg-card" />
            <div className="h-4 w-3/4 rounded bg-card" />
            <div className="h-3 w-1/2 rounded bg-card" />
          </div>
        ))}
      </div>
    </div>
  );
}
