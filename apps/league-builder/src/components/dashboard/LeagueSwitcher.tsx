'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { ChevronDown, Check } from 'lucide-react';
import { useAppSidebar } from './AppSidebarContext';
import { LeagueLogo } from '@/components/ui/league-logo';
import type { DashboardData } from '@/lib/actions/dashboard';
import {
  buildLeagueScopedDashboardTarget,
  buildPlatformOwnerViewHref,
} from '@/lib/auth/platform-owner-view-routing';

interface LeagueSwitcherProps {
  dashboardData: DashboardData | null;
  ownerViewLeagueId?: string | null;
  onMobileNavClose?: () => void;
}

interface FlatLeague {
  id: string;
  name: string;
  slug: string;
  status: string;
  logo_url: string | null;
  primary_color: string | null;
}

export function LeagueSwitcher({
  dashboardData,
  ownerViewLeagueId = null,
  onMobileNavClose,
}: LeagueSwitcherProps) {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { leagueId } = useAppSidebar();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const isAdmin = !!(dashboardData?.admin_leagues && dashboardData.admin_leagues.length > 0);

  // Flatten leagues from all orgs (or admin view)
  const allLeagues: FlatLeague[] = React.useMemo(() => {
    if (dashboardData?.admin_leagues && dashboardData.admin_leagues.length > 0) {
      return dashboardData.admin_leagues.map((league) => ({
        id: league.id,
        name: league.name,
        slug: league.slug,
        status: league.status,
        logo_url: league.logo_url,
        primary_color: league.primary_color,
      }));
    }
    if (!dashboardData?.organizations) return [];
    return dashboardData.organizations.flatMap((org) =>
      org.leagues.map((league) => ({
        id: league.id,
        name: league.name,
        slug: league.slug,
        status: league.status,
        logo_url: league.logo_url,
        primary_color: league.primary_color,
      }))
    );
  }, [dashboardData]);

  // Auto-navigate to first active league if at /dashboard with no league selected
  React.useEffect(() => {
    if (leagueId || allLeagues.length === 0) return;

    const path = pathname.replace(`/${locale}`, '');
    // Only auto-select if we're at the dashboard root
    if (path === '/dashboard' || path === '/dashboard/') return; // Don't auto-redirect from home

    const ownerViewLeague = ownerViewLeagueId
      ? allLeagues.find((l) => l.id === ownerViewLeagueId)
      : null;
    const activeLeague = allLeagues.find((l) => l.status === 'active');
    const targetLeague = ownerViewLeague || activeLeague || allLeagues[0];

    if (targetLeague && path.includes('/dashboard/leagues/')) {
      // We're on a league route but the league ID didn't parse — redirect to first league
      router.replace(`/${locale}/dashboard/leagues/${targetLeague.id}`);
    }
  }, [allLeagues, leagueId, ownerViewLeagueId, pathname, locale, router]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLeague = allLeagues.find((l) => l.id === leagueId);

  if (allLeagues.length === 0) return null;

  const handleLeagueSelect = (newLeagueId: string) => {
    setIsOpen(false);
    onMobileNavClose?.();

    if (newLeagueId === leagueId) return;

    const search = '';

    if (ownerViewLeagueId) {
      const redirectTo = buildLeagueScopedDashboardTarget({
        pathname,
        search,
        leagueId: newLeagueId,
      });
      router.push(`/${locale}${buildPlatformOwnerViewHref({ leagueId: newLeagueId, redirectTo })}`);
      return;
    }

    // Navigate to new league's overview
    router.push(`/${locale}/dashboard/leagues/${newLeagueId}`);
  };

  // No league selected — show prompt
  if (!selectedLeague) {
    return (
      <div className="px-2 py-2" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2.5 rounded-lg p-2 hover:bg-white/[0.04] transition-colors"
        >
          <div className="w-7 h-7 rounded-md bg-neutral-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-neutral-400">?</span>
          </div>
          <span className="text-[13px] text-neutral-500 flex-1 text-left truncate">
            {t('selectLeague') || 'Select a league...'}
          </span>
          <ChevronDown className={cn('w-3.5 h-3.5 text-neutral-600 transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <LeagueDropdown
            leagues={allLeagues}
            selectedId={null}
            isAdmin={isAdmin}
            onSelect={handleLeagueSelect}
          />
        )}
      </div>
    );
  }

  // Single league — no dropdown needed
  if (allLeagues.length === 1) {
    return (
      <div className="px-2 py-2">
        <div className="flex items-center gap-2.5 p-2">
          <LeagueLogo
            logoUrl={selectedLeague.logo_url}
            leagueName={selectedLeague.name}
            primaryColor={selectedLeague.primary_color || '#22D3EE'}
            size="sm"
            shape="square"
          />
          <span className="text-[13px] font-semibold text-white truncate flex-1">
            {selectedLeague.name}
          </span>
        </div>
      </div>
    );
  }

  // Multiple leagues — show switcher
  return (
    <div className="px-2 py-2 relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2.5 rounded-lg p-2 hover:bg-white/[0.04] transition-colors"
      >
        <LeagueLogo
          logoUrl={selectedLeague.logo_url}
          leagueName={selectedLeague.name}
          primaryColor={selectedLeague.primary_color || '#22D3EE'}
          size="sm"
          shape="square"
        />
        <span className="text-[13px] font-semibold text-white truncate flex-1 text-left">
          {selectedLeague.name}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-neutral-600 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <LeagueDropdown
          leagues={allLeagues}
          selectedId={leagueId}
          isAdmin={isAdmin}
          onSelect={handleLeagueSelect}
        />
      )}
    </div>
  );
}

function LeagueDropdown({
  leagues,
  selectedId,
  isAdmin,
  onSelect,
}: {
  leagues: FlatLeague[];
  selectedId: string | null;
  isAdmin: boolean;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('navigation');

  return (
    <div className="absolute left-2 right-2 z-50 mt-1 py-1 rounded-xl bg-neutral-800 border border-white/10 shadow-lg max-h-64 overflow-y-auto">
      <div className="px-3 py-1.5">
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
          {isAdmin ? t('allLeaguesAdmin') : t('switchLeague')}
        </span>
      </div>
      {leagues.map((league) => (
        <button
          key={league.id}
          onClick={() => onSelect(league.id)}
          className={cn(
            'flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors hover:bg-neutral-700',
            league.id === selectedId ? 'text-rink-400' : 'text-neutral-300'
          )}
        >
          <LeagueLogo
            logoUrl={league.logo_url}
            leagueName={league.name}
            primaryColor={league.primary_color || '#22D3EE'}
            size="xs"
            shape="square"
          />
          <span className="text-[13px] font-medium truncate flex-1">{league.name}</span>
          {league.id === selectedId && (
            <Check className="w-3.5 h-3.5 text-rink-400 flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}
