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
  Calendar,
  Users,
  Palette,
  ClipboardCheck,
  User,
  Dices,
  Newspaper,
  Star,
  Award,
  Image,
  CheckCircle2,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { signOut } from '@/lib/actions/auth';
import { useSidebar } from './SidebarContext';
import { LeagueScopeSelector } from './LeagueScopeSelector';
import type { CaptainTeamOverview } from '@/lib/actions/captain';
import type { DashboardData } from '@/lib/actions/dashboard';

interface HierarchicalSidebarProps {
  dashboardData: DashboardData | null;
  captainTeams: CaptainTeamOverview[];
}

export default function HierarchicalSidebar({
  dashboardData,
  captainTeams
}: HierarchicalSidebarProps) {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const pathname = usePathname();
  const {
    isCollapsed: sidebarCollapsed,
    toggle: toggleSidebar,
    selected,
    isMobileNavOpen,
    toggleMobileNav,
  } = useSidebar();

  // Close mobile nav when a link is tapped
  const closeMobileNav = React.useCallback(() => {
    if (isMobileNavOpen) {
      toggleMobileNav();
    }
  }, [isMobileNavOpen, toggleMobileNav]);

  const leagueBase = selected.leagueId
    ? `/dashboard/leagues/${selected.leagueId}`
    : '/dashboard';

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

  // Check if selected league exists (show draft room conditionally)
  const hasDraft = React.useMemo(() => {
    if (!dashboardData?.organizations || !selected.leagueId) return false;
    for (const org of dashboardData.organizations) {
      const league = org.leagues.find((l) => l.id === selected.leagueId);
      if (league) return true;
    }
    return false;
  }, [dashboardData, selected.leagueId]);

  return (
    <aside
      className={cn(
        'fixed left-0 bottom-0 z-50 flex flex-col',
        'bg-neutral-900 border-r border-white/10',
        'transition-all duration-300 ease-in-out',
        // Top: below mobile header on mobile, full height on desktop
        'top-14 md:top-0',
        // Width: always expanded on mobile, collapsible on desktop
        'w-72',
        sidebarCollapsed && 'md:w-16',
        // Visibility: slide in/out on mobile, always visible on desktop
        isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}
    >
      {/* Logo — hidden on mobile (MobileHeader shows brand) */}
      <div className="hidden md:flex h-16 items-center justify-between px-4 border-b border-white/10">
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
            'p-2.5 rounded-lg transition-colors',
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

      {/* League Scope Selector */}
      <div className="border-b border-white/[0.06]">
        <LeagueScopeSelector dashboardData={dashboardData} collapsed={sidebarCollapsed} />
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-2 py-4 space-y-1 overflow-y-auto"
        onClick={(e) => {
          // Close mobile nav when any link is clicked
          if ((e.target as HTMLElement).closest('a')) {
            closeMobileNav();
          }
        }}
      >
        {/* Primary nav */}
        <NavLink
          href="/dashboard"
          icon={Home}
          label={t('overview')}
          isActive={pathname === `/${locale}/dashboard` || pathname === `/${locale}/tableau-de-bord`}
          collapsed={sidebarCollapsed}
        />

        {/* League Management — core league operations */}
        {selected.leagueId && (
          <>
            <SectionLabel label={t('sectionLeague')} collapsed={sidebarCollapsed} />
            <NavLink
              href={`${leagueBase}/schedule`}
              icon={Calendar}
              label={t('schedule')}
              isActive={isPathActive(`${leagueBase}/schedule`)}
              collapsed={sidebarCollapsed}
            />
            <NavLink
              href={`${leagueBase}/teams`}
              icon={Users}
              label={t('teamsAndDivisions')}
              isActive={isPathActive(`${leagueBase}/teams`) || isPathActive(`${leagueBase}/divisions`)}
              collapsed={sidebarCollapsed}
            />
            <NavLink
              href={`${leagueBase}/ratings`}
              icon={BarChart3}
              label={t('playerRatings')}
              isActive={isPathActive(`${leagueBase}/ratings`)}
              collapsed={sidebarCollapsed}
            />
            <NavLink
              href={`${leagueBase}/games`}
              icon={CheckCircle2}
              label={t('completedGames')}
              isActive={isPathActive(`${leagueBase}/games`) || pathname.includes('/standings')}
              collapsed={sidebarCollapsed}
            />
            <NavLink
              href={`${leagueBase}/registrations`}
              icon={ClipboardCheck}
              label={t('registration')}
              isActive={isPathActive(`${leagueBase}/registrations`)}
              collapsed={sidebarCollapsed}
            />
            <NavLink
              href={`${leagueBase}/staff`}
              icon={User}
              label={t('staff')}
              isActive={isPathActive(`${leagueBase}/staff`)}
              collapsed={sidebarCollapsed}
            />
            {hasDraft && (
              <NavLink
                href={`${leagueBase}/draft`}
                icon={Dices}
                label={t('draftRoom')}
                isActive={isPathActive(`${leagueBase}/draft`)}
                collapsed={sidebarCollapsed}
              />
            )}

            {/* Content — news, media, and presentation */}
            <SectionLabel label={t('sectionContent')} collapsed={sidebarCollapsed} />
            <NavLink
              href={`${leagueBase}/news`}
              icon={Newspaper}
              label={t('news')}
              isActive={isPathActive(`${leagueBase}/news`)}
              collapsed={sidebarCollapsed}
            />
            <NavLink
              href={`${leagueBase}/sponsors`}
              icon={Star}
              label={t('sponsors')}
              isActive={isPathActive(`${leagueBase}/sponsors`)}
              collapsed={sidebarCollapsed}
            />
            <NavLink
              href={`${leagueBase}/awards`}
              icon={Award}
              label={t('awards')}
              isActive={isPathActive(`${leagueBase}/awards`)}
              collapsed={sidebarCollapsed}
            />
            <NavLink
              href={`${leagueBase}/gallery`}
              icon={Image}
              label={t('gallery')}
              isActive={isPathActive(`${leagueBase}/gallery`)}
              collapsed={sidebarCollapsed}
            />
            <NavLink
              href={`/website-editor?league=${selected.leagueId}`}
              icon={Palette}
              label={t('websiteEditor')}
              isActive={pathname.includes('website-editor')}
              collapsed={sidebarCollapsed}
              highlight
            />
          </>
        )}

        {/* Captain Teams Section */}
        {captainTeams.length > 0 && (
          <>
            <div className="my-4 border-t border-white/[0.06]" />
            {!sidebarCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  {t('myTeams')}
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

        {/* Settings & Account */}
        <SectionLabel label={t('sectionSettings')} collapsed={sidebarCollapsed} />
        <NavLink
          href="/dashboard/settings"
          icon={Settings}
          label={t('settings')}
          isActive={isPathActive('/dashboard/settings') && !isPathActive('/dashboard/settings/billing')}
          collapsed={sidebarCollapsed}
        />
        <NavLink
          href="/dashboard/settings/billing"
          icon={CreditCard}
          label={t('billing')}
          isActive={isPathActive('/dashboard/settings/billing')}
          collapsed={sidebarCollapsed}
        />
        <NavLink
          href="/dashboard/leagues/new"
          icon={Plus}
          label={t('createLeague')}
          isActive={isPathActive('/dashboard/leagues/new')}
          collapsed={sidebarCollapsed}
          muted
        />

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

// Section label for grouping nav items
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-3 mx-3 border-t border-white/[0.06]" />;
  }
  return (
    <div className="mt-5 mb-2 px-3">
      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// Reusable Nav Link component
function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  collapsed,
  compact = false,
  muted = false,
  highlight = false,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  collapsed: boolean;
  compact?: boolean;
  muted?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg transition-all duration-200',
        'group relative',
        compact ? 'px-2 py-1.5' : 'px-3 py-2.5 rounded-xl',
        isActive
          ? 'bg-rink-500/10 text-rink-500 border border-rink-500/30'
          : muted
          ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30 border border-transparent'
          : highlight
          ? 'text-arena-400 hover:text-arena-300 hover:bg-arena-500/10 border border-transparent'
          : 'text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent'
      )}
    >
      <Icon
        className={cn(
          'flex-shrink-0',
          compact ? 'w-4 h-4' : 'w-5 h-5',
          isActive
            ? 'text-rink-500'
            : highlight
            ? 'text-arena-400 group-hover:text-arena-300'
            : 'text-neutral-500 group-hover:text-rink-500'
        )}
      />
      {!collapsed && (
        <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </Link>
  );
}
