export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-8 rounded bg-card"  />
        <div className="h-4 w-1 rounded bg-card"  />
        <div className="h-4 w-10 rounded bg-card"  />
        <div className="h-4 w-1 rounded bg-card"  />
        <div className="h-4 w-24 rounded bg-card"  />
      </div>
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-48 md:w-64 aspect-[2/3] rounded-xl max-w-[256px] mx-auto sm:mx-0 bg-card"  />
        <div className="flex-1 space-y-4">
          <div className="h-8 w-48 rounded bg-card"  />
          <div className="h-10 w-36 rounded-lg bg-card"  />
          <div className="space-y-2 mt-2">
            <div className="h-4 w-full rounded bg-card"  />
            <div className="h-4 w-3/4 rounded bg-card"  />
          </div>
        </div>
      </div>
      <div className="rounded-xl p-5 border bg-secondary border-border" >
        <div className="h-6 w-12 rounded mb-3 bg-card"  />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-card"  />
          <div className="h-4 w-full rounded bg-card"  />
          <div className="h-4 w-2/3 rounded bg-card"  />
        </div>
      </div>
      <div className="rounded-xl p-5 border bg-secondary border-border" >
        <div className="h-6 w-20 rounded mb-4 bg-card"  />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-card"  />)}
        </div>
      </div>
    </div>
  );
}
