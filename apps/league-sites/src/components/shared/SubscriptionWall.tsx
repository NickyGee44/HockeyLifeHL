'use client';

import { useSubscription } from './SubscriptionContext';

/**
 * Wraps page content and shows a "coming soon" wall if the league's
 * organization does not have an active Platform Monthly subscription.
 *
 * Usage in page components:
 * ```tsx
 * <SubscriptionWall>
 *   <ActualPageContent />
 * </SubscriptionWall>
 * ```
 */
export function SubscriptionWall({ children }: { children: React.ReactNode }) {
  const isSubscribed = useSubscription();

  if (isSubscribed) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh] px-4">
      <div className="max-w-md w-full text-center py-16">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--league-primary,#3b82f6)]/10">
          <svg
            className="h-8 w-8"
            style={{ color: 'var(--league-primary, #3b82f6)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text, #fff)' }}>
          Coming Soon
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted, #9ca3af)' }}>
          This league is currently setting up. Check back soon for schedules, standings, and more.
        </p>
      </div>
    </div>
  );
}
