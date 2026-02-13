'use client';

import { useEffect, useState, useCallback } from 'react';
import { WifiOff, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [dismissedOnPathname, setDismissedOnPathname] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setDismissedOnPathname(null);
    };
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleDismiss = useCallback(() => setDismissedOnPathname(pathname), [pathname]);

  // Dismissed only if the user dismissed on this exact pathname
  const dismissed = dismissedOnPathname === pathname;

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
