'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Home,
  Calendar,
  CheckCircle2,
  BarChart3,
  Users,
  CalendarDays,
  Settings,
  Flag,
} from 'lucide-react';
import { useAppSidebar } from './AppSidebarContext';

interface TabItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function MobileTabBar() {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const pathname = usePathname();
  const { leagueId, seasonId } = useAppSidebar();

  const leagueBase = leagueId ? `/dashboard/leagues/${leagueId}` : null;
  const seasonBase = leagueBase && seasonId ? `${leagueBase}/seasons/${seasonId}` : null;

  const isActive = (href: string) => {
    const localizedPath = `/${locale}${href}`;
    if (href === '/dashboard') {
      return pathname === localizedPath || pathname === `/${locale}/tableau-de-bord`;
    }
    return pathname.startsWith(localizedPath);
  };

  // Contextual tabs based on scope
  const tabs: TabItem[] = React.useMemo(() => {
    if (seasonBase) {
      // Season scope: most-used season features
      return [
        { label: t('schedule'), href: `${seasonBase}/schedule`, icon: Calendar },
        { label: t('games') || 'Games', href: `${seasonBase}/games`, icon: CheckCircle2 },
        { label: t('standings'), href: `${seasonBase}/standings`, icon: BarChart3 },
        { label: t('rosters') || 'Rosters', href: `${seasonBase}/rosters`, icon: Users },
      ];
    }

    if (leagueBase) {
      // League scope: league-level features
      return [
        { label: t('leagueOverview') || 'Overview', href: leagueBase, icon: Home },
        { label: t('teamsAndDivisions'), href: `${leagueBase}/teams`, icon: Users },
        { label: t('seasons'), href: `${leagueBase}/seasons`, icon: CalendarDays },
        { label: t('settings'), href: `${leagueBase}/settings/general`, icon: Settings },
      ];
    }

    // Org scope
    return [
      { label: t('home') || 'Home', href: '/dashboard', icon: Home },
      { label: t('leagues') || 'Leagues', href: '/dashboard/leagues', icon: CalendarDays },
      { label: t('staffPool') || 'Staff', href: '/dashboard/staff', icon: Flag },
      { label: t('settings'), href: '/dashboard/settings', icon: Settings },
    ];
  }, [seasonBase, leagueBase, t]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-neutral-900 border-t border-white/[0.06]">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-colors min-h-[56px] justify-center',
                active
                  ? 'text-rink-400'
                  : 'text-neutral-500 hover:text-neutral-300'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium truncate max-w-full">{tab.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area inset for devices with home indicator */}
      <div className="pb-safe" />
    </nav>
  );
}
