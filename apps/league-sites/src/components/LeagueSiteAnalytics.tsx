'use client';

import { useEffect } from 'react';
import { posthog } from '@/lib/posthog-client';

interface LeagueSiteAnalyticsProps {
  leagueSlug: string;
}

export function LeagueSiteAnalytics({ leagueSlug }: LeagueSiteAnalyticsProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if ((posthog as typeof posthog & { __loaded?: boolean }).__loaded) {
        posthog.capture('league_site_viewed', { leagueSlug });
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [leagueSlug]);

  return null;
}
