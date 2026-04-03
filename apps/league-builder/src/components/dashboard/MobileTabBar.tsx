'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import { motion, useReducedMotion } from 'framer-motion';
import { useAppSidebar } from './AppSidebarContext';
import {
  buildDashboardNavigation,
  getDashboardMobileTabs,
  isDashboardNavigationItemActive,
} from '@/lib/dashboard/navigation';

export function MobileTabBar() {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const { leagueId, seasonId, scope } = useAppSidebar();

  const navigation = React.useMemo(
    () =>
      buildDashboardNavigation({
        locale: '',
        leagueId,
        seasonId,
        isSubscribed: true,
        captainTeams: [],
        isPlatformAdmin: false,
        t,
      }),
    [leagueId, seasonId, t]
  );

  const tabs = getDashboardMobileTabs(
    scope === 'org' ? 'organization' : scope,
    navigation
  );
  const itemsById = new Map(
    navigation
      .flatMap((section) =>
        section.entries.flatMap((entry) => (entry.kind === 'group' ? entry.items : [entry]))
      )
      .map((item) => [item.id, item])
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[linear-gradient(180deg,rgba(9,13,20,0.94),rgba(7,10,15,0.98))] backdrop-blur-2xl md:hidden">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {tabs.map((tab) => {
          const navItem = itemsById.get(tab.id);
          const active = navItem
            ? isDashboardNavigationItemActive(navItem, pathname, locale)
            : false;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                'relative flex min-h-[58px] flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-1 py-2',
                active ? 'text-rink-200' : 'text-neutral-500 hover:text-neutral-200'
              )}
            >
              {active ? (
                <motion.span
                  layoutId="mobile-tab-indicator"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-2xl border border-rink-400/20 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(59,130,246,0.08))]"
                />
              ) : null}
              <tab.icon className="relative h-5 w-5" />
              <span className="relative max-w-full truncate text-[10px] font-semibold tracking-[0.04em]">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="pb-safe" />
    </nav>
  );
}
