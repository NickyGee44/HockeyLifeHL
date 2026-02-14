'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-neutral-400">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-500 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
