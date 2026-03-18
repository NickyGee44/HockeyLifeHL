'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Menu, X, Trophy } from 'lucide-react';
import { useAppSidebar } from './AppSidebarContext';
import type { DashboardData } from '@/lib/actions/dashboard';

interface MobileAppHeaderProps {
  dashboardData: DashboardData | null;
}

export function MobileAppHeader({ dashboardData }: MobileAppHeaderProps) {
  const t = useTranslations('navigation');
  const { leagueId, isMobileSidebarOpen, toggleMobileSidebar } = useAppSidebar();

  // Find selected league name
  const selectedLeagueName = React.useMemo(() => {
    if (!dashboardData?.organizations || !leagueId) return null;
    for (const org of dashboardData.organizations) {
      const league = org.leagues.find((l) => l.id === leagueId);
      if (league) return league.name;
    }
    // Check admin_leagues
    if (dashboardData.admin_leagues) {
      const league = dashboardData.admin_leagues.find((l) => l.id === leagueId);
      if (league) return league.name;
    }
    return null;
  }, [dashboardData, leagueId]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden">
      <div className="flex items-center justify-between h-14 px-4 bg-neutral-900 border-b border-white/[0.06]">
        {/* Hamburger */}
        <button
          onClick={toggleMobileSidebar}
          className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors"
          aria-label={isMobileSidebarOpen ? t('close') : t('menu')}
        >
          {isMobileSidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-rink-500 to-arena-500 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-sm font-semibold text-white truncate">
            {selectedLeagueName || t('dashboard')}
          </span>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-9" />
      </div>
    </header>
  );
}
