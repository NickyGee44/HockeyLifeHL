'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import { LogOut, Settings, Trophy } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { useAppSidebar } from './AppSidebarContext';
import { LeagueSwitcher } from './LeagueSwitcher';
import { SeasonPicker } from './SeasonPicker';
import { SidebarNavItem } from './SidebarNavItem';
import { SidebarNavGroup, SidebarSectionLabel } from './SidebarNavGroup';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import type { CaptainTeamOverview } from '@/lib/actions/captain';
import type { DashboardData } from '@/lib/actions/dashboard';
import {
  buildDashboardNavigation,
  getDashboardSectionAccent,
} from '@/lib/dashboard/navigation';

interface AppSidebarProps {
  dashboardData: DashboardData | null;
  captainTeams: CaptainTeamOverview[];
  isSubscribed: boolean;
  isPlatformAdmin: boolean;
  ownerViewLeagueId?: string | null;
}

export function AppSidebar({
  dashboardData,
  captainTeams,
  isSubscribed,
  isPlatformAdmin,
  ownerViewLeagueId = null,
}: AppSidebarProps) {
  const t = useTranslations('navigation');
  const { leagueId, seasonId, isMobileSidebarOpen, toggleMobileSidebar } = useAppSidebar();

  const orgName = dashboardData?.organizations?.[0]?.name || 'Organization';

  const closeMobileNav = React.useCallback(() => {
    if (isMobileSidebarOpen) toggleMobileSidebar();
  }, [isMobileSidebarOpen, toggleMobileSidebar]);

  const navigation = React.useMemo(
    () =>
      buildDashboardNavigation({
        locale: '',
        leagueId,
        seasonId,
        isSubscribed,
        captainTeams,
        isPlatformAdmin,
        t,
      }),
    [captainTeams, isPlatformAdmin, isSubscribed, leagueId, seasonId, t]
  );

  return (
    <>
      {isMobileSidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={toggleMobileSidebar}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[292px] flex-col overflow-hidden border-r border-white/[0.08]',
          'bg-[linear-gradient(180deg,rgba(7,10,15,0.98),rgba(10,15,24,0.96))] shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl',
          'hidden md:flex',
          isMobileSidebarOpen && '!flex'
        )}
      >
        <div className="relative border-b border-white/[0.08] px-4 py-4">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rink-400/40 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.95),rgba(59,130,246,0.7),rgba(7,10,15,0.2))] shadow-[0_0_30px_rgba(34,211,238,0.25)]">
              <Trophy className="h-5 w-5 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-500">
                Organization
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-white">{orgName}</p>
            </div>
            <Link
              href="/dashboard/settings"
              onClick={closeMobileNav}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-neutral-400 transition-colors hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-neutral-200"
              title="Organization settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {dashboardData ? (
          <div className="border-b border-white/[0.08] bg-white/[0.02]">
            <LeagueSwitcher
              dashboardData={dashboardData}
              ownerViewLeagueId={ownerViewLeagueId}
              onMobileNavClose={closeMobileNav}
            />
            {leagueId ? (
              <div className="px-2 pb-2">
                <SeasonPicker onMobileNavClose={closeMobileNav} />
              </div>
            ) : null}
          </div>
        ) : null}

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {navigation.map((section) => (
            <div key={section.id}>
              <SidebarSectionLabel className={getDashboardSectionAccent(section.scope)}>
                {section.label}
              </SidebarSectionLabel>
              <div className="space-y-0.5">
                {section.entries.map((entry) => {
                  if (entry.kind === 'group') {
                    return (
                      <SidebarNavGroup
                        key={entry.id}
                        groupId={entry.id}
                        label={entry.label}
                        icon={entry.icon}
                      >
                        {entry.items.map((item) => (
                          <SidebarNavItem
                            key={item.id}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            locked={item.locked}
                            badge={item.badge}
                            indent
                            onClick={closeMobileNav}
                          />
                        ))}
                      </SidebarNavGroup>
                    );
                  }

                  return (
                    <SidebarNavItem
                      key={entry.id}
                      href={entry.href}
                      icon={entry.icon}
                      label={entry.label}
                      locked={entry.locked}
                      badge={entry.badge}
                      onClick={closeMobileNav}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/[0.08] bg-black/10 p-2">
          <LanguageSwitcher collapsed={false} />
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('signOut') || 'Sign Out'}</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
