'use client';

import { useEffect, useState, useCallback } from 'react';
import { WifiOff, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Reappear on navigation while offline
  useEffect(() => {
    if (isOffline) {
      setDismissed(false);
    }
  }, [pathname, isOffline]);

  const handleDismiss = useCallback(() => setDismissed(true), []);

  if (!isOffline || dismissed) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-2 bg-amber-500/90 px-4 py-2 text-neutral-900 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">
          You&apos;re offline — viewing cached data
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="rounded p-1 hover:bg-amber-600/50 transition-colors"
        aria-label="Dismiss offline banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
