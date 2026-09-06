'use client';

import { LogIn, UserPlus } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useAuth } from './AuthProvider';
import { UserMenu } from './UserMenu';

interface AuthButtonProps {
  leagueSlug: string;
  leagueId?: string;
}

export function AuthButton({ leagueSlug, leagueId }: AuthButtonProps) {
  const { user, isLoading } = useUser();
  const { openLogin, openSignup } = useAuth();

  if (isLoading) {
    return (
      <div className="glass-control h-11 w-11 animate-pulse rounded-full" aria-label="Loading account" />
    );
  }

  if (user) {
    return <UserMenu leagueSlug={leagueSlug} leagueId={leagueId} />;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={openLogin}
        className="glass-control flex min-h-11 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--blh-glass-border)] hover:text-[var(--color-text-primary)]"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Sign In</span>
      </button>

      <button
        onClick={openSignup}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--league-primary-border)] bg-[var(--league-primary-strong)] px-4 py-2 text-sm font-semibold text-[var(--league-on-primary)] transition-colors hover:bg-[var(--league-primary-hover)]"
      >
        <UserPlus className="w-4 h-4 hidden sm:inline" />
        <span>Join</span>
      </button>
    </div>
  );
}
