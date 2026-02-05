'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Calendar,
  CreditCard,
  FileCheck,
  Trophy,
  Users,
  Settings,
  Shield,
  Loader2,
} from 'lucide-react';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';

interface QuickActionsProps {
  leagueSlug: string;
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  variant?: 'primary' | 'default';
}

export function QuickActions({ leagueSlug }: QuickActionsProps) {
  const { currentTeam, isLoading: profileLoading, error } = usePlayerProfile();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;

  const actions: QuickAction[] = [
    {
      label: 'View Schedule',
      href: `/${leagueSlug}/schedule`,
      icon: Calendar,
      description: 'See all upcoming games',
    },
    {
      label: 'Pay Fees',
      href: `/${leagueSlug}/me/payments`,
      icon: CreditCard,
      description: 'View and pay registration',
      variant: 'primary',
    },
    {
      label: 'Sign Waivers',
      href: `/${leagueSlug}/me/waivers`,
      icon: FileCheck,
      description: 'Complete required forms',
    },
    {
      label: 'Standings',
      href: `/${leagueSlug}/standings`,
      icon: Trophy,
      description: 'Check league standings',
    },
    {
      label: 'My Team',
      href: `/${leagueSlug}/teams`,
      icon: Users,
      description: 'View team roster',
    },
    {
      label: 'Settings',
      href: `/${leagueSlug}/me/profile`,
      icon: Settings,
      description: 'Update your profile',
    },
  ];

  // Add captain action if user is captain/alternate
  if (isCaptain) {
    actions.splice(1, 0, {
      label: 'Captain',
      href: `/${leagueSlug}/captain`,
      icon: Shield,
      description: 'Manage your team',
      variant: 'primary',
    });
  }

  // Show skeleton loader while profile is loading
  if (profileLoading) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 p-3 rounded-lg animate-pulse"
            >
              <div className="w-5 h-5 bg-[var(--color-surface-hover)] rounded" />
              <div className="w-12 h-3 bg-[var(--color-surface-hover)] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleActionClick = (href: string) => {
    setLoadingAction(href);
    // Reset loading state after navigation (the component will unmount anyway)
    setTimeout(() => setLoadingAction(null), 2000);
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const isLoading = loadingAction === action.href;
          const IconComponent = action.icon;

          return (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => handleActionClick(action.href)}
              className={`group flex flex-col items-center gap-2 p-3 rounded-lg text-center transition-all relative ${
                action.variant === 'primary'
                  ? 'bg-[var(--league-primary)]/10 hover:bg-[var(--league-primary)]/20 border border-[var(--league-primary)]/20'
                  : 'hover:bg-[var(--color-surface-hover)]'
              } ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
            >
              {isLoading ? (
                <Loader2
                  className={`w-5 h-5 animate-spin ${
                    action.variant === 'primary'
                      ? 'text-[var(--league-primary)]'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                />
              ) : (
                <IconComponent
                  className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                    action.variant === 'primary'
                      ? 'text-[var(--league-primary)]'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                />
              )}
              <span
                className={`text-xs font-medium ${
                  action.variant === 'primary'
                    ? 'text-[var(--league-primary)]'
                    : 'text-[var(--color-text-primary)]'
                }`}
              >
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
