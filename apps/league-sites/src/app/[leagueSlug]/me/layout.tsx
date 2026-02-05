'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { Loader2 } from 'lucide-react';

interface MeLayoutProps {
  children: React.ReactNode;
  params: Promise<{ leagueSlug: string }>;
}

/**
 * Protected layout for authenticated player routes
 * Redirects to login if user is not authenticated
 */
export default function MeLayout({ children, params }: MeLayoutProps) {
  const { leagueSlug } = use(params);
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we're done loading and there's no user
    if (!isLoading && !user) {
      // Redirect to home page - the auth modal can be opened from there
      router.replace(`/${leagueSlug}`);
    }
  }, [user, isLoading, router, leagueSlug]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children until we confirm user is authenticated
  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
