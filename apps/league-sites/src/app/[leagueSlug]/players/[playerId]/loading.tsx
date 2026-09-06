export default function PlayerLoading() {
  return (
    <div className="league-page-shell container mx-auto px-4 py-8">
      {/* Back link skeleton */}
      <div className="h-5 w-24 bg-[var(--color-surface-hover)] rounded animate-pulse mb-6" />

      <div className="max-w-4xl mx-auto">
        {/* Player Header Skeleton */}
        <div className="glass-card-strong rounded-[28px] p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-[var(--color-surface-hover)] animate-pulse" />

            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="h-8 w-48 bg-[var(--color-surface-hover)] rounded animate-pulse mx-auto sm:mx-0" />
              <div className="h-5 w-32 bg-[var(--color-surface-hover)] rounded animate-pulse mx-auto sm:mx-0" />
              <div className="flex gap-4 justify-center sm:justify-start">
                <div className="h-6 w-16 bg-[var(--color-surface-hover)] rounded animate-pulse" />
                <div className="h-6 w-20 bg-[var(--color-surface-hover)] rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Season Selector Skeleton */}
        <div className="h-10 w-48 bg-[var(--color-surface-hover)] rounded-lg animate-pulse mb-6" />

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-4 text-center"
            >
              <div className="h-4 w-12 bg-[var(--color-surface-hover)] rounded animate-pulse mx-auto mb-2" />
              <div className="h-8 w-8 bg-[var(--color-surface-hover)] rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>

        {/* Game Log Skeleton */}
        <div className="glass-card-strong rounded-[28px] p-6">
          <div className="h-6 w-24 bg-[var(--color-surface-hover)] rounded animate-pulse mb-4" />

          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-12 bg-[var(--color-surface-hover)] rounded animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
