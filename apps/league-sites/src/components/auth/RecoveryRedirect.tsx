'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

function redirectToReset(error?: string) {
  const resetUrl = new URL('/reset-password', window.location.origin);
  if (error) resetUrl.searchParams.set('error', error);
  window.history.replaceState(null, '', window.location.pathname);
  window.location.replace(resetUrl.toString());
}

export function RecoveryRedirect() {
  useEffect(() => {
    const supabase = createClient();
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const searchError = searchParams.get('error_description');

    if (searchError) {
      redirectToReset(searchError);
      return;
    }

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => redirectToReset(error?.message))
        .catch(() => redirectToReset('Invalid or expired link'));
      return;
    }

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (!hash) return;

    const hashParams = new URLSearchParams(hash);
    const recoveryType = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const hashError = hashParams.get('error_description');

    if (recoveryType !== 'recovery' && !hashError) return;

    if (hashError) {
      redirectToReset(hashError);
      return;
    }

    if (!accessToken || !refreshToken) {
      redirectToReset('Invalid or expired link');
      return;
    }

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }) => redirectToReset(error?.message))
      .catch(() => redirectToReset('Invalid or expired link'));
  }, []);

  return null;
}
