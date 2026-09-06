'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ScheduleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Schedule page error:', error);
  }, [error]);

  return (
    <div className="league-page-shell container mx-auto px-4 py-12">
      <div className="glass-card-strong p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">
          We couldn&apos;t load the schedule. Please try again.
        </p>
        <button
          onClick={reset}
          className="btn-primary inline-flex min-h-11 items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
