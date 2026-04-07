'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

/**
 * Client component that redirects authenticated users from the homepage
 * to their player dashboard (/[leagueSlug]/me).
 *
 * Renders nothing visible — purely a side-effect component.
 * Only redirects on initial page load, not on subsequent navigation back.
 */
export function AuthRedirect() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const leagueSlug = params.leagueSlug as string;
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (isLoading || hasChecked) return;
    setHasChecked(true);

    if (user && leagueSlug) {
      router.replace(`/${leagueSlug}/me`);
    }
  }, [user, isLoading, hasChecked, leagueSlug, router]);

  return null;
}
