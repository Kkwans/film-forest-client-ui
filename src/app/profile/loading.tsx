export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse max-w-2xl mx-auto">
      {/* Profile header skeleton */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-card" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 rounded bg-card" />
          <div className="h-4 w-48 rounded bg-card" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-card" />
        ))}
      </div>

      {/* Lists skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-card" />
        ))}
      </div>
    </div>
  );
}
