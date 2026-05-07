export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        {/* Title skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
        </div>

        {/* Cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-border p-5">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-3 h-8 w-16 rounded bg-muted" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="rounded-lg border border-border">
          <div className="border-b border-border p-4">
            <div className="h-4 w-full rounded bg-muted" />
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border-b border-border p-4 last:border-0">
              <div className="h-4 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
