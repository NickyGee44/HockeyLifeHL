'use client';

import { useEffect } from 'react';
import { posthog, initPostHog } from '@/lib/posthog-client';

interface LeagueSiteAnalyticsProps {
  leagueSlug: string;
}

export function LeagueSiteAnalytics({ leagueSlug }: LeagueSiteAnalyticsProps) {
  useEffect(() => {
    initPostHog();
    posthog.capture('league_site_viewed', { leagueSlug });
  }, [leagueSlug]);

  return null;
}
