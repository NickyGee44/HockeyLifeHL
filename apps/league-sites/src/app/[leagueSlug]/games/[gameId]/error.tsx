'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const leagueSlug = params.leagueSlug as string;

  useEffect(() => {
    console.error('Game page error:', error);
  }, [error]);

  return (
    <div className="league-page-shell container mx-auto px-4 py-12">
      <div className="glass-card-strong p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-[var(--color-text-secondary)] mb-6">
          We couldn&apos;t load the game details. Please try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary inline-flex min-h-11 items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href={`/${leagueSlug}/schedule`}
            className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Schedule
          </Link>
        </div>
      </div>
    </div>
  );
}
