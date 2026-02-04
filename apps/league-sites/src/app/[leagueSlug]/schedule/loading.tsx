export default function ScheduleLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-10 bg-[var(--color-surface)] rounded w-48 mb-6" />

        {/* Week picker skeleton */}
        <div className="flex gap-2 mb-6">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-16 w-16 bg-[var(--color-surface)] rounded" />
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="flex gap-4 mb-6">
          <div className="h-10 w-32 bg-[var(--color-surface)] rounded" />
          <div className="h-10 w-32 bg-[var(--color-surface)] rounded" />
          <div className="h-10 w-32 bg-[var(--color-surface)] rounded" />
        </div>

        {/* Table skeleton */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--color-surface)] rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
