export default function GameLoading() {
  return (
    <div className="league-page-shell min-h-screen">
      {/* Header skeleton */}
      <div className="glass-card-strong mx-4 mt-6 h-[280px] animate-pulse overflow-hidden rounded-[28px]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Away team skeleton */}
            <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
              <div className="w-24 h-24 bg-[var(--color-surface-hover)] rounded-lg" />
              <div className="space-y-2">
                <div className="h-8 w-32 bg-[var(--color-surface-hover)] rounded" />
                <div className="h-4 w-20 bg-[var(--color-surface-hover)] rounded" />
              </div>
            </div>

            {/* Center skeleton */}
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-24 bg-[var(--color-surface-hover)] rounded-full" />
              <div className="h-6 w-48 bg-[var(--color-surface-hover)] rounded" />
              <div className="h-8 w-20 bg-[var(--color-surface-hover)] rounded" />
            </div>

            {/* Home team skeleton */}
            <div className="flex-1 flex flex-col md:flex-row-reverse items-center gap-4">
              <div className="w-24 h-24 bg-[var(--color-surface-hover)] rounded-lg" />
              <div className="space-y-2">
                <div className="h-8 w-32 bg-[var(--color-surface-hover)] rounded" />
                <div className="h-4 w-20 bg-[var(--color-surface-hover)] rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content skeleton */}
          <div className="lg:col-span-2 space-y-8">
            <div className="animate-pulse">
              <div className="h-6 w-40 rounded bg-[var(--color-surface)]/70 mb-6" />
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded bg-[var(--color-surface)]/70" />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="glass-card-strong p-4">
                <div className="h-6 w-32 bg-[var(--color-surface-hover)] rounded mb-4" />
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-10 bg-[var(--color-surface-hover)] rounded" />
                  ))}
                </div>
              </div>
            </div>

            <div className="animate-pulse">
              <div className="glass-card-strong p-4">
                <div className="h-6 w-32 bg-[var(--color-surface-hover)] rounded mb-4" />
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-8 bg-[var(--color-surface-hover)] rounded" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
