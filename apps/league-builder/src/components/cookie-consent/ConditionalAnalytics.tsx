'use client';

import { Analytics } from '@vercel/analytics/next';
import { useCookieConsent } from '@/lib/hooks/use-cookie-consent';

/* ============================================================
   Conditional Analytics

   Only renders Vercel Analytics if the user has consented
   to analytics cookies. This is a GDPR requirement: no
   tracking scripts should load before explicit consent.
   ============================================================ */

export function ConditionalAnalytics() {
  const { analyticsAllowed, mounted } = useCookieConsent();

  // Don't render anything until mounted (SSR safety)
  // and don't render analytics without consent
  if (!mounted || !analyticsAllowed) {
    return null;
  }

  return <Analytics />;
}
