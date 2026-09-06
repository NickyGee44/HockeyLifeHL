'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useLeague } from '@/hooks/useLeague';
import { Loader2 } from 'lucide-react';

/**
 * Redirect /me to the user's own player page.
 * Sub-routes (/me/payments, /me/waivers, /me/profile) still work via layout.
 */
export default function MeRedirect() {
  const router = useRouter();
  const { user } = useUser();
  const { league } = useLeague();

  useEffect(() => {
    if (user && league) {
      router.replace(`/${league.slug}/players/${user.id}`);
    }
  }, [user, league, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
        <p className="text-[var(--color-text-secondary)]">Redirecting to your page...</p>
      </div>
    </div>
  );
}
