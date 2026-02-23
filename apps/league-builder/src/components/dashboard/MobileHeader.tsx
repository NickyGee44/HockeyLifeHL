'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Menu, X, Trophy } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import type { DashboardData } from '@/lib/actions/dashboard';

interface MobileHeaderProps {
  dashboardData: DashboardData | null;
}

export function MobileHeader({ dashboardData }: MobileHeaderProps) {
  const t = useTranslations('navigation');
  const { selected, isMobileNavOpen, toggleMobileNav } = useSidebar();

  // Find selected league name
  const selectedLeague = React.useMemo(() => {
    if (!dashboardData?.organizations || !selected.leagueId) return null;
    for (const org of dashboardData.organizations) {
      const league = org.leagues.find((l) => l.id === selected.leagueId);
      if (league) return league;
    }
    return null;
  }, [dashboardData, selected.leagueId]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden">
      <div className="flex items-center justify-between h-14 px-4 bg-neutral-900 border-b border-white/10">
        {/* Hamburger */}
        <button
          onClick={toggleMobileNav}
          className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
          aria-label={isMobileNavOpen ? t('close') : t('menu')}
        >
          {isMobileNavOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        {/* League name */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-rink-500 to-arena-500 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-sm font-semibold text-white truncate">
            {selectedLeague?.name || t('dashboard')}
          </span>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-9" />
      </div>

      {/* Slide-out drawer overlay */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 top-14 bg-black/60 z-40"
          onClick={toggleMobileNav}
        />
      )}

    </header>
  );
}
