'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAppSidebar } from './AppSidebarContext';
import { LeagueLogo } from '@/components/ui/league-logo';
import type { DashboardData } from '@/lib/actions/dashboard';
import { buildPlatformOwnerViewHref } from '@/lib/auth/platform-owner-view-routing';
import { parseActiveSeasonWorkspaceCookie } from '@/lib/dashboard/workspace-cookie';
import { getDashboardContextSwitchHref } from '@/lib/dashboard/navigation';

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

function readPreferredSeasonId(leagueId: string) {
  const raw = document.cookie
    .split('; ')
    .find((item) => item.startsWith('blh_active_season_workspace='))
    ?.split('=')
    .slice(1)
    .join('=');

  return parseActiveSeasonWorkspaceCookie(raw)[leagueId]?.seasonId ?? null;
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
  const reduceMotion = useReducedMotion();
  const { leagueId } = useAppSidebar();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const isAdmin = !!(dashboardData?.admin_leagues && dashboardData.admin_leagues.length > 0);

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

    if (!dashboardData?.organizations) {
      return [];
    }

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

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLeague = allLeagues.find((league) => league.id === leagueId);

  if (allLeagues.length === 0) {
    return null;
  }

  const handleLeagueSelect = (targetLeagueId: string) => {
    setIsOpen(false);
    onMobileNavClose?.();

    if (targetLeagueId === leagueId) {
      return;
    }

    const preferredSeasonId = readPreferredSeasonId(targetLeagueId);
    const redirectTo = getDashboardContextSwitchHref({
      locale,
      pathname,
      currentLeagueId: leagueId,
      targetLeagueId,
      preferredSeasonId,
    });

    if (ownerViewLeagueId) {
      router.push(
        `/${locale}${buildPlatformOwnerViewHref({
          leagueId: targetLeagueId,
          redirectTo,
        })}`
      );
      return;
    }

    router.push(redirectTo);
  };

  return (
    <div className="relative px-2 py-2" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-[border-color,background-color,color]',
          'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.05]',
          selectedLeague ? 'text-white' : 'text-neutral-500'
        )}
      >
        {selectedLeague ? (
          <LeagueLogo
            logoUrl={selectedLeague.logo_url}
            leagueName={selectedLeague.name}
            primaryColor={selectedLeague.primary_color || '#22D3EE'}
            size="sm"
            shape="square"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 text-xs font-bold text-neutral-400">
            ?
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            {isAdmin ? t('allLeaguesAdmin') : t('switchLeague')}
          </p>
          <p className="truncate text-[13px] font-semibold">
            {selectedLeague?.name || (t('selectLeague') || 'Select a league')}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
            className="absolute left-2 right-2 z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/[0.10] bg-[linear-gradient(180deg,rgba(16,23,33,0.98),rgba(11,15,22,0.98))] p-1 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          >
            {allLeagues.map((league) => (
              <button
                key={league.id}
                onClick={() => handleLeagueSelect(league.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors',
                  league.id === leagueId
                    ? 'bg-rink-500/10 text-rink-200'
                    : 'text-neutral-300 hover:bg-white/[0.05]'
                )}
              >
                <LeagueLogo
                  logoUrl={league.logo_url}
                  leagueName={league.name}
                  primaryColor={league.primary_color || '#22D3EE'}
                  size="xs"
                  shape="square"
                />
                <span className="flex-1 truncate text-[13px] font-medium">{league.name}</span>
                {league.id === leagueId ? <Check className="h-4 w-4 text-rink-300" /> : null}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
