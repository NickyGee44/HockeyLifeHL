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
      <div className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] animate-pulse" />
    );
  }

  if (user) {
    return <UserMenu leagueSlug={leagueSlug} leagueId={leagueId} />;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={openLogin}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
      >
        <LogIn className="w-4 h-4" />
        <span className="hidden sm:inline">Sign In</span>
      </button>

      <button
        onClick={openSignup}
        className="flex items-center gap-2 rounded-lg border border-[var(--league-primary-border)] bg-[var(--league-primary-strong)] px-4 py-2 text-sm font-medium text-[var(--league-on-primary)] transition-colors hover:bg-[var(--league-primary-hover)]"
      >
        <UserPlus className="w-4 h-4 hidden sm:inline" />
        <span>Join</span>
      </button>
    </div>
  );
}
