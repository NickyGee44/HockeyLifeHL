'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Home,
  Trophy,
  BarChart3,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CreditCard,
  Shield,
  Users,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { signOut } from '@/lib/actions/auth';
import { useSidebar } from './SidebarContext';
import type { CaptainTeamOverview } from '@/lib/actions/captain';

interface DashboardSidebarProps {
  captainTeams: CaptainTeamOverview[];
}

export default function DashboardSidebar({ captainTeams }: DashboardSidebarProps) {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const pathname = usePathname();
  const { isCollapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebar();

  const navigation = [
    { name: t('dashboard'), href: '/dashboard', icon: Home },
    { name: t('teams'), href: '/dashboard/leagues', icon: Trophy },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: t('settings'), href: '/dashboard/settings', icon: Settings },
  ];

  const quickActions = [
    { name: t('createLeague'), href: '/dashboard/leagues/new', icon: Plus },
    { name: t('billing'), href: '/dashboard/settings/subscription', icon: CreditCard },
  ];

  const isPathActive = (href: string) => {
    const localizedPath = `/${locale}${href}`;
    if (href === '/dashboard') {
      return pathname === localizedPath || pathname === `/${locale}/tableau-de-bord`;
    }
    return pathname.startsWith(localizedPath);
  };

  const isCaptainPathActive = (teamId: string) => {
    return pathname.includes(`/dashboard/captain/${teamId}`);
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col',
        'bg-neutral-900 border-r border-white/10',
        'transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rink-500 to-arena-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <span className="font-black text-white tracking-tight">
              Beer League Hockey
            </span>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            'text-neutral-400 hover:text-white hover:bg-neutral-800',
            sidebarCollapsed && 'mx-auto'
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = isPathActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                'group relative',
                isActive
                  ? 'bg-rink-500/10 text-rink-500 border border-rink-500/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent'
              )}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive ? 'text-rink-500' : 'text-neutral-500 group-hover:text-rink-500'
                )}
              />
              {!sidebarCollapsed && (
                <span className="font-medium text-sm">{item.name}</span>
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}

        {/* Captain Teams Section */}
        {captainTeams.length > 0 && (
          <>
            <div className="my-4 border-t border-white/[0.06]" />
            {!sidebarCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  My Teams
                </span>
              </div>
            )}
            {captainTeams.map((team) => {
              const isActive = isCaptainPathActive(team.id);
              const hasPendingRequests = team.pending_requests_count > 0;

              return (
                <Link
                  key={team.id}
                  href={`/dashboard/captain/${team.id}`}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                    'group relative',
                    isActive
                      ? 'bg-rink-500/10 text-rink-500 border border-rink-500/30'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Shield
                      className={cn(
                        'w-5 h-5',
                        isActive ? 'text-rink-500' : 'text-neutral-500 group-hover:text-rink-500'
                      )}
                    />
                    {hasPendingRequests && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-neutral-900" />
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{team.short_name}</span>
                        {hasPendingRequests && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-bold bg-yellow-500 text-black rounded">
                            {team.pending_requests_count}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                      {team.name}
                      {hasPendingRequests && ` (${team.pending_requests_count})`}
                    </div>
                  )}
                </Link>
              );
            })}
          </>
        )}

        {/* Divider */}
        <div className="my-4 border-t border-white/[0.06]" />

        {/* Quick Actions */}
        {!sidebarCollapsed && (
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {t('help')}
            </span>
          </div>
        )}
        {quickActions.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
              'text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent',
              'group relative'
            )}
          >
            <item.icon
              className={cn(
                'w-5 h-5 flex-shrink-0',
                'text-neutral-500 group-hover:text-rink-500'
              )}
            />
            {!sidebarCollapsed && (
              <span className="font-medium text-sm">{item.name}</span>
            )}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                {item.name}
              </div>
            )}
          </Link>
        ))}

        {/* Divider */}
        <div className="my-4 border-t border-white/[0.06]" />

        {/* Language Switcher */}
        <LanguageSwitcher collapsed={sidebarCollapsed} />
      </nav>

      {/* User section */}
      <div className="p-2 border-t border-white/10">
        <form action={signOut}>
          <button
            type="submit"
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
              'text-neutral-400 hover:text-red-400 hover:bg-red-500/10',
              'group relative'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <span className="font-medium text-sm">{t('logout')}</span>
            )}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                {t('logout')}
              </div>
            )}
          </button>
        </form>
      </div>
    </aside>
  );
}
