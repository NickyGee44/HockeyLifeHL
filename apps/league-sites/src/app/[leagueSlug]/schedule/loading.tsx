export default function ScheduleLoading() {
  return (
    <div className="league-page-shell container mx-auto px-4 py-8">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-10 rounded bg-[var(--color-surface)]/70 w-48 mb-6" />

        {/* Week picker skeleton */}
        <div className="flex gap-2 mb-6">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="glass-card h-16 w-16 rounded-2xl" />
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="flex gap-4 mb-6">
          <div className="glass-control h-10 w-32 rounded-xl" />
          <div className="glass-control h-10 w-32 rounded-xl" />
          <div className="glass-control h-10 w-32 rounded-xl" />
        </div>

        {/* Table skeleton */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card-strong h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
