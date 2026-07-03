'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function RecoveryHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (!hash) return;

    const params = new URLSearchParams(hash);
    const recoveryType = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const errorDescription = params.get('error_description');

    if (recoveryType !== 'recovery') return;

    const redirectToReset = (error?: string) => {
      const resetUrl = new URL('/en/reset-password', window.location.origin);
      if (error) resetUrl.searchParams.set('error', error);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      window.location.replace(resetUrl.toString());
    };

    if (errorDescription) {
      redirectToReset(errorDescription);
      return;
    }

    if (!accessToken || !refreshToken) {
      redirectToReset('Invalid or expired link');
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }) => {
        if (cancelled) return;
        redirectToReset(error?.message);
      })
      .catch(() => {
        if (cancelled) return;
        redirectToReset('Invalid or expired link');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
