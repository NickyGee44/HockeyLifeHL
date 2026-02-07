'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Home,
  Trophy,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  CreditCard,
  Shield,
  Building2,
  Calendar,
  Users,
  LayoutGrid,
  Palette,
  Loader2,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { signOut } from '@/lib/actions/auth';
import { useSidebar } from './SidebarContext';
import { LeagueLogo } from '@/components/ui/league-logo';
import type { CaptainTeamOverview } from '@/lib/actions/captain';
import type { DashboardData } from '@/lib/actions/dashboard';

interface HierarchicalSidebarProps {
  dashboardData: DashboardData | null;
  captainTeams: CaptainTeamOverview[];
}

interface SeasonData {
  id: string;
  name: string;
  status: string;
}

interface DivisionData {
  id: string;
  name: string;
  team_count: number;
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
    expandedSections,
    toggleSection,
  } = useSidebar();

  // Cache for lazy-loaded seasons and divisions
  const [seasonsCache, setSeasonsCache] = React.useState<Record<string, SeasonData[]>>({});
  const [divisionsCache, setDivisionsCache] = React.useState<Record<string, DivisionData[]>>({});
  const [loadingSeasons, setLoadingSeasons] = React.useState<Record<string, boolean>>({});
  const [loadingDivisions, setLoadingDivisions] = React.useState<Record<string, boolean>>({});

  const organizations = dashboardData?.organizations || [];

  // Lazy load seasons when league is expanded
  const loadSeasonsForLeague = React.useCallback(async (leagueId: string) => {
    if (seasonsCache[leagueId] || loadingSeasons[leagueId]) return;

    setLoadingSeasons(prev => ({ ...prev, [leagueId]: true }));
    try {
      const response = await fetch(`/api/leagues/${leagueId}/seasons`);
      if (response.ok) {
        const data = await response.json();
        setSeasonsCache(prev => ({ ...prev, [leagueId]: data.seasons || [] }));
      }
    } catch (error) {
      console.error('Failed to load seasons:', error);
    } finally {
      setLoadingSeasons(prev => ({ ...prev, [leagueId]: false }));
    }
  }, [seasonsCache, loadingSeasons]);

  // Lazy load divisions when season is expanded
  const loadDivisionsForLeague = React.useCallback(async (leagueId: string) => {
    if (divisionsCache[leagueId] || loadingDivisions[leagueId]) return;

    setLoadingDivisions(prev => ({ ...prev, [leagueId]: true }));
    try {
      const response = await fetch(`/api/leagues/${leagueId}/divisions`);
      if (response.ok) {
        const data = await response.json();
        setDivisionsCache(prev => ({ ...prev, [leagueId]: data.divisions || [] }));
      }
    } catch (error) {
      console.error('Failed to load divisions:', error);
    } finally {
      setLoadingDivisions(prev => ({ ...prev, [leagueId]: false }));
    }
  }, [divisionsCache, loadingDivisions]);

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

  // Toggle league expansion and load seasons
  const handleLeagueToggle = (leagueId: string) => {
    const sectionKey = `league-${leagueId}`;
    toggleSection(sectionKey);
    if (!expandedSections[sectionKey]) {
      loadSeasonsForLeague(leagueId);
      loadDivisionsForLeague(leagueId);
    }
  };

  // Toggle org expansion
  const handleOrgToggle = (orgId: string) => {
    toggleSection(`org-${orgId}`);
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col',
        'bg-neutral-900 border-r border-white/10',
        'transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-16' : 'w-72'
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
        {/* Dashboard Home */}
        <NavLink
          href="/dashboard"
          icon={Home}
          label={t('dashboard')}
          isActive={pathname === `/${locale}/dashboard` || pathname === `/${locale}/tableau-de-bord`}
          collapsed={sidebarCollapsed}
        />

        {/* Your Company & Leagues Hierarchy */}
        {!sidebarCollapsed && organizations.length > 0 && (
          <>
            <div className="my-4 border-t border-white/[0.06]" />
            <div className="px-3 mb-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Your Company
              </span>
            </div>
          </>
        )}

        {organizations.map((org) => (
          <div key={org.id} className="space-y-0.5">
            {/* Company Row (formerly Organization) */}
            {!sidebarCollapsed ? (
              <button
                onClick={() => handleOrgToggle(org.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                  'text-neutral-300 hover:text-white hover:bg-neutral-800/50',
                  'group'
                )}
              >
                <Building2 className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                <span className="text-sm font-medium truncate flex-1 text-left">
                  {org.name}
                </span>
                {expandedSections[`org-${org.id}`] ? (
                  <ChevronUp className="w-4 h-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                )}
              </button>
            ) : (
              <div className="relative group">
                <div className="p-2 mx-auto w-fit">
                  <Building2 className="w-5 h-5 text-neutral-500" />
                </div>
                <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {org.name}
                </div>
              </div>
            )}

            {/* Leagues under Organization */}
            {!sidebarCollapsed && expandedSections[`org-${org.id}`] && (
              <div className="ml-4 space-y-0.5">
                {org.leagues.map((league) => (
                  <div key={league.id}>
                    {/* League Row */}
                    <div className="flex items-center">
                      <button
                        onClick={() => handleLeagueToggle(league.id)}
                        className={cn(
                          'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                          'text-neutral-300 hover:text-white hover:bg-neutral-800/50',
                          isPathActive(`/dashboard/leagues/${league.id}`) &&
                            'bg-rink-500/10 text-rink-500 border border-rink-500/30'
                        )}
                      >
                        <LeagueLogo
                          logoUrl={league.logo_url}
                          leagueName={league.name}
                          primaryColor={league.primary_color || '#22D3EE'}
                          size="xs"
                          shape="square"
                        />
                        <span className="text-sm font-medium truncate flex-1 text-left">
                          {league.name}
                        </span>
                        {loadingSeasons[league.id] ? (
                          <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                        ) : expandedSections[`league-${league.id}`] ? (
                          <ChevronUp className="w-4 h-4 text-neutral-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-500" />
                        )}
                      </button>
                    </div>

                    {/* League Sub-Items */}
                    {expandedSections[`league-${league.id}`] && (
                      <div className="ml-4 space-y-0.5 mt-1">
                        {/* Seasons */}
                        {seasonsCache[league.id]?.map((season) => (
                          <NavLink
                            key={season.id}
                            href={`/dashboard/leagues/${league.id}/schedule?season=${season.id}`}
                            icon={Calendar}
                            label={season.name}
                            isActive={pathname.includes(`season=${season.id}`)}
                            collapsed={false}
                            compact
                          />
                        ))}

                        {/* Divisions */}
                        <NavLink
                          href={`/dashboard/leagues/${league.id}/divisions`}
                          icon={LayoutGrid}
                          label="Divisions"
                          isActive={isPathActive(`/dashboard/leagues/${league.id}/divisions`)}
                          collapsed={false}
                          compact
                        />

                        {/* Teams */}
                        <NavLink
                          href={`/dashboard/leagues/${league.id}/teams`}
                          icon={Users}
                          label="Teams"
                          isActive={isPathActive(`/dashboard/leagues/${league.id}/teams`)}
                          collapsed={false}
                          compact
                        />

                        {/* Schedule */}
                        <NavLink
                          href={`/dashboard/leagues/${league.id}/schedule`}
                          icon={Calendar}
                          label="Schedule"
                          isActive={isPathActive(`/dashboard/leagues/${league.id}/schedule`)}
                          collapsed={false}
                          compact
                        />

                        {/* Website Editor */}
                        <NavLink
                          href={`/website-editor?league=${league.id}`}
                          icon={Palette}
                          label="Website Editor"
                          isActive={pathname.includes(`website-editor`) && pathname.includes(league.id)}
                          collapsed={false}
                          compact
                          highlight
                        />

                        {/* League Settings */}
                        <NavLink
                          href={`/dashboard/leagues/${league.id}/settings`}
                          icon={Settings}
                          label="Settings"
                          isActive={isPathActive(`/dashboard/leagues/${league.id}/settings`)}
                          collapsed={false}
                          compact
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Create New League under Org */}
                <NavLink
                  href="/dashboard/leagues/new"
                  icon={Plus}
                  label={t('createLeague')}
                  isActive={false}
                  collapsed={false}
                  compact
                  muted
                />
              </div>
            )}
          </div>
        ))}

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

        <NavLink
          href="/dashboard/leagues/new"
          icon={Plus}
          label={t('createLeague')}
          isActive={isPathActive('/dashboard/leagues/new')}
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
          href="/dashboard/settings"
          icon={Settings}
          label={t('settings')}
          isActive={isPathActive('/dashboard/settings')}
          collapsed={sidebarCollapsed}
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
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  collapsed: boolean;
  compact?: boolean;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
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
