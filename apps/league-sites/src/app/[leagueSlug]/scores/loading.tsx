import { Activity } from 'lucide-react';

export default function ScoresLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-[var(--color-background-elevated)] border border-[var(--color-border)] rounded-2xl shadow-lg max-w-4xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-9 w-32 bg-[var(--color-surface-hover)] rounded animate-pulse" />
          <Activity className="w-7 h-7 text-[var(--league-primary)] opacity-50" />
        </div>

        {/* Period Chips Skeleton */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-24 bg-[var(--color-surface-hover)] rounded-full animate-pulse"
            />
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex gap-3 mb-6">
          <div className="h-10 w-40 bg-[var(--color-surface-hover)] rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-[var(--color-surface-hover)] rounded-lg animate-pulse" />
        </div>

        {/* Score Cards Skeleton */}
        <div className="space-y-8 mt-6">
          {/* Date Section */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="h-4 w-24 bg-[var(--color-surface-hover)] rounded animate-pulse" />
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <div className="h-4 w-16 bg-[var(--color-surface-hover)] rounded animate-pulse" />
            </div>

            {/* Game Cards */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-[var(--color-surface-hover)]/50 border border-[var(--color-border)] rounded-xl p-4 animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    {/* Away Team */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-border)]" />
                      <div className="h-5 w-32 bg-[var(--color-border)] rounded" />
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-4 px-6">
                      <div className="h-8 w-8 bg-[var(--color-border)] rounded" />
                      <div className="h-4 w-4 bg-[var(--color-border)] rounded" />
                      <div className="h-8 w-8 bg-[var(--color-border)] rounded" />
                    </div>

                    {/* Home Team */}
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <div className="h-5 w-32 bg-[var(--color-border)] rounded" />
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-border)]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
