// @ts-nocheck
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse px-4 py-8">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-48 md:w-64 aspect-[2/3] rounded-xl max-w-[256px] mx-auto sm:mx-0" style={{ backgroundColor: 'var(--bg-card)' }} />
        <div className="flex-1 space-y-4">
          <div className="h-8 w-48 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="h-4 w-32 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="h-4 w-64 rounded" style={{ backgroundColor: 'var(--bg-card)' }} />
        </div>
      </div>
    </div>
  );
}
