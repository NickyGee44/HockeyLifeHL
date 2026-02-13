'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Home,
  Calendar,
  Users,
  MoreHorizontal,
  User,
  X,
  Newspaper,
  Star,
  Award,
  Image,
  Palette,
  Trophy,
  ClipboardCheck,
  Dices,
  Settings,
  CreditCard,
} from 'lucide-react';
import { useSidebar } from './SidebarContext';

export function MobileBottomNav() {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const pathname = usePathname();
  const { selected, isMobileMoreOpen, toggleMobileMore } = useSidebar();

  const leagueBase = selected.leagueId
    ? `/dashboard/leagues/${selected.leagueId}`
    : '/dashboard';

  const isActive = (href: string) => {
    const localizedPath = `/${locale}${href}`;
    if (href === '/dashboard') {
      return pathname === localizedPath || pathname === `/${locale}/tableau-de-bord`;
    }
    return pathname.startsWith(localizedPath);
  };

  const primaryTabs = [
    { label: t('overview'), href: '/dashboard', icon: Home },
    { label: t('schedule'), href: `${leagueBase}/schedule`, icon: Calendar },
    { label: t('teamsAndDivisions'), href: `${leagueBase}/teams`, icon: Users },
    { label: t('more'), href: '#more', icon: MoreHorizontal, isMore: true },
    { label: t('profile'), href: '/dashboard/settings', icon: User },
  ];

  const moreItems = [
    { label: t('standings'), href: `${leagueBase}/games`, icon: Trophy },
    { label: t('registration'), href: `${leagueBase}/registrations`, icon: ClipboardCheck },
    { label: t('staff'), href: `${leagueBase}/staff`, icon: User },
    { label: t('draftRoom'), href: `${leagueBase}/draft`, icon: Dices },
    { label: t('news'), href: `${leagueBase}/news`, icon: Newspaper },
    { label: t('sponsors'), href: `${leagueBase}/sponsors`, icon: Star },
    { label: t('awards'), href: `${leagueBase}/awards`, icon: Award },
    { label: t('gallery'), href: `${leagueBase}/gallery`, icon: Image },
    { label: t('websiteEditor'), href: `/website-editor?league=${selected.leagueId}`, icon: Palette },
    { label: t('settings'), href: '/dashboard/settings', icon: Settings },
    { label: t('billing'), href: '/dashboard/settings/billing', icon: CreditCard },
  ];

  return (
    <>
      {/* More drawer overlay */}
      {isMobileMoreOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={toggleMobileMore}
        />
      )}

      {/* More drawer */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 md:hidden',
          'bg-neutral-900 border-t border-white/10 rounded-t-2xl',
          'transition-transform duration-300 ease-in-out',
          isMobileMoreOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-semibold text-white">{t('more')}</span>
          <button
            onClick={toggleMobileMore}
            className="p-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="grid grid-cols-3 gap-1 p-3 max-h-[60vh] overflow-y-auto">
          {moreItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={toggleMobileMore}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors',
                  active
                    ? 'bg-rink-500/10 text-rink-500'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-neutral-900 border-t border-white/10">
        <div className="flex items-stretch">
          {primaryTabs.map((tab) => {
            if (tab.isMore) {
              return (
                <button
                  key="more"
                  onClick={toggleMobileMore}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-colors min-h-[56px] justify-center',
                    isMobileMoreOpen
                      ? 'text-rink-500'
                      : 'text-neutral-500 hover:text-neutral-300'
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </button>
              );
            }

            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-colors min-h-[56px] justify-center',
                  active
                    ? 'text-rink-500'
                    : 'text-neutral-500 hover:text-neutral-300'
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
        {/* Safe area inset for devices with home indicator */}
        <div className="pb-safe" />
      </nav>
    </>
  );
}
