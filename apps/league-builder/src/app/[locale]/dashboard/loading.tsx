export default function Loading() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-9 w-64 bg-white/[0.04] rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white/[0.04] border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 bg-white/[0.06] rounded-xl animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-white/[0.06] rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-20 bg-white/[0.04] rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Quick actions skeleton */}
        <div className="mb-8">
          <div className="h-6 w-32 bg-white/[0.04] rounded-lg animate-pulse mb-4" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white/[0.04] border border-white/10 rounded-2xl p-5"
              >
                <div className="w-9 h-9 bg-white/[0.06] rounded-xl animate-pulse mb-3" />
                <div className="h-5 w-24 bg-white/[0.06] rounded animate-pulse mb-2" />
                <div className="h-4 w-32 bg-white/[0.04] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-40 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
            <div className="h-5 w-48 bg-white/[0.06] rounded animate-pulse mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-3 w-16 bg-white/[0.04] rounded animate-pulse mb-2" />
                  <div className="h-7 w-12 bg-white/[0.06] rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
