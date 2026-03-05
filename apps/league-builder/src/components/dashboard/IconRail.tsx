'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@hockey-life/ui';
import {
  Home,
  CalendarDays,
  Users,
  Calendar,
  UserCircle2,
  DollarSign,
  Newspaper,
  Settings,
  LogOut,
  Trophy,
  Shield,
  Zap,
  ChevronRight,
  PanelLeftClose,
} from 'lucide-react';
import { signOut } from '@/lib/actions/auth';
import { useSidebar, type NavSection } from './SidebarContext';
import type { CaptainTeamOverview } from '@/lib/actions/captain';

interface IconRailProps {
  captainTeams: CaptainTeamOverview[];
  isPlatformAdmin: boolean;
  isOrgOwner: boolean;
}

const SECTIONS: { id: NavSection; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'dashboard', icon: Home, label: 'Dashboard' },
  { id: 'seasons', icon: CalendarDays, label: 'Seasons' },
  { id: 'teams', icon: Users, label: 'Teams' },
  { id: 'schedule', icon: Calendar, label: 'Schedule' },
  { id: 'players', icon: UserCircle2, label: 'Players' },
  { id: 'financials', icon: DollarSign, label: 'Financials' },
  { id: 'content', icon: Newspaper, label: 'Content' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function IconRail({ captainTeams, isPlatformAdmin, isOrgOwner }: IconRailProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const {
    activeSection,
    setActiveSection,
    isSecondaryPinned,
    isCollapsed,
    toggle,
    selected,
  } = useSidebar();

  const leagueBase = selected.leagueId
    ? `/dashboard/leagues/${selected.leagueId}`
    : '/dashboard';

  // Determine which section is "active" based on current path
  const currentSection = React.useMemo((): NavSection | null => {
    const p = pathname.replace(`/${locale}`, '');
    if (p === '/dashboard' || p === '/tableau-de-bord') return 'dashboard';
    if (p.includes('/seasons')) return 'seasons';
    if (p.includes('/teams') || p.includes('/divisions') || p.includes('/teams-divisions') || p.includes('/draft')) return 'teams';
    if (p.includes('/schedule') || p.includes('/games') || p.includes('/scorekeepers')) return 'schedule';
    if (p.includes('/players') || p.includes('/ratings') || p.includes('/registrations') || p.includes('/staff') || p.includes('/referees')) return 'players';
    if (p.includes('/payments') || p.includes('/billing') || p.includes('/financials')) return 'financials';
    if (p.includes('/news') || p.includes('/pages') || p.includes('/sponsors') || p.includes('/awards') || p.includes('/gallery') || p.includes('/events') || p.includes('/bugs') || p.includes('/contact-inbox')) return 'content';
    if (p.includes('/settings') || p.includes('/company') || p.includes('/members')) return 'settings';
    if (p.includes('/captain/')) return null; // captain section handled separately
    return 'dashboard';
  }, [pathname, locale]);

  const handleSectionClick = (section: NavSection) => {
    if (activeSection === section && !isSecondaryPinned) {
      setActiveSection(null);
    } else {
      setActiveSection(section);
    }
  };

  if (isCollapsed) {
    return (
      <div className="fixed left-0 top-0 bottom-0 z-50 hidden md:flex w-4 bg-neutral-950/95 border-r border-white/10">
        <button
          type="button"
          onClick={toggle}
          className="mt-4 mx-auto w-3 h-10 rounded-full text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 bottom-0 z-50 hidden md:flex flex-col w-16 bg-neutral-950 border-r border-white/10">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center justify-center h-16 border-b border-white/10 hover:bg-neutral-800/50 transition-colors"
        title="Dashboard home"
        aria-label="Dashboard home"
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-rink-500 to-arena-500 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-black" />
        </div>
      </Link>

      {/* Main sections */}
      <nav className="flex-1 flex flex-col items-center py-2 gap-1 overflow-y-auto">
        {(isOrgOwner ? SECTIONS : [SECTIONS[0]]).map((section) => {
          const isActive = currentSection === section.id;
          const isOpen = activeSection === section.id;
          const Icon = section.icon;

          return (
            <button
              key={section.id}
              onClick={() => handleSectionClick(section.id)}
              type="button"
              className={cn(
                'relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-rink-500/15 text-rink-500'
                  : isOpen
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-white hover:bg-neutral-800/50'
              )}
              aria-label={section.label}
              title={section.label}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-rink-500" />
              )}
              <Icon className="w-5 h-5" />
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-neutral-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] shadow-lg border border-white/10">
                {section.label}
              </div>
            </button>
          );
        })}

        {/* Captain teams */}
        {captainTeams.length > 0 && (
          <>
            <div className="w-8 border-t border-white/10 my-2" />
            {captainTeams.map((team) => {
              const isActive = pathname.includes(`/dashboard/captain/${team.id}`);
              return (
                <Link
                  key={team.id}
                  href={`/dashboard/captain/${team.id}`}
                  className={cn(
                    'relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 group',
                    isActive
                      ? 'bg-rink-500/15 text-rink-500'
                      : 'text-neutral-500 hover:text-white hover:bg-neutral-800/50'
                  )}
                  title={team.short_name}
                  aria-label={`Captain team ${team.short_name}`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-rink-500" />
                  )}
                  <Shield className="w-5 h-5" />
                  {team.pending_requests_count > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-neutral-950" />
                  )}
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-neutral-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] shadow-lg border border-white/10">
                    {team.short_name}
                  </div>
                </Link>
              );
            })}
          </>
        )}

        {/* Platform admin */}
        {isPlatformAdmin && (
          <>
            <div className="w-8 border-t border-white/10 my-2" />
            <Link
              href="/dashboard/admin"
              className={cn(
                'relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 group',
                pathname.includes('/dashboard/admin')
                  ? 'bg-arena-500/15 text-arena-400'
                  : 'text-neutral-500 hover:text-arena-400 hover:bg-arena-500/10'
              )}
              title="Admin"
              aria-label="Admin"
            >
              <Zap className="w-5 h-5" />
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-neutral-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] shadow-lg border border-white/10">
                Admin
              </div>
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-white/10">
        <button
          type="button"
          onClick={toggle}
          className="w-12 h-10 flex items-center justify-center rounded-xl text-neutral-500 hover:text-white hover:bg-neutral-800/50 transition-colors group relative mx-auto mb-2"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-neutral-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] shadow-lg border border-white/10">
            Collapse sidebar
          </div>
        </button>
        <form action={signOut}>
          <button
            type="submit"
            className="w-12 h-12 flex items-center justify-center rounded-xl text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors group relative mx-auto"
            aria-label="Sign Out"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-neutral-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60] shadow-lg border border-white/10">
              Sign Out
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}
