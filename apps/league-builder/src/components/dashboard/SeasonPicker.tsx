'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAppSidebar } from './AppSidebarContext';
import { createClient } from '@/lib/supabase/client';
import {
  ACTIVE_SEASON_WORKSPACE_COOKIE,
  clearActiveSeasonWorkspaceEntry,
  setActiveSeasonWorkspaceEntry,
} from '@/lib/dashboard/workspace-cookie';
import {
  buildEquivalentSeasonWorkspaceHref,
  buildLeagueHubHref,
} from '@/lib/dashboard/workspace-routes';

interface Season {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
}

interface SeasonPickerProps {
  onMobileNavClose?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  upcoming: 'bg-blue-500/15 text-blue-300 border-blue-400/20',
  draft: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
  completed: 'bg-white/[0.06] text-neutral-300 border-white/[0.08]',
  playoffs: 'bg-violet-500/15 text-violet-300 border-violet-400/20',
};

function writeSeasonWorkspaceCookie(
  leagueId: string,
  season: Pick<Season, 'id' | 'name'>
) {
  const currentCookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${ACTIVE_SEASON_WORKSPACE_COOKIE}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  const nextValue = setActiveSeasonWorkspaceEntry(currentCookie, leagueId, {
    seasonId: season.id,
    seasonName: season.name,
  });

  document.cookie = `${ACTIVE_SEASON_WORKSPACE_COOKIE}=${nextValue}; path=/; max-age=7776000; SameSite=Lax`;
}

function clearSeasonWorkspaceCookie(leagueId: string) {
  const currentCookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${ACTIVE_SEASON_WORKSPACE_COOKIE}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  const nextValue = clearActiveSeasonWorkspaceEntry(currentCookie, leagueId);
  document.cookie = `${ACTIVE_SEASON_WORKSPACE_COOKIE}=${nextValue}; path=/; max-age=7776000; SameSite=Lax`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
        STATUS_COLORS[status] || STATUS_COLORS.draft
      )}
    >
      {status}
    </span>
  );
}

export function SeasonPicker({ onMobileNavClose }: SeasonPickerProps) {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { leagueId, seasonId } = useAppSidebar();
  const [isOpen, setIsOpen] = React.useState(false);
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [loading, setLoading] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!leagueId) {
      setSeasons([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchSeasons = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('seasons')
        .select('id, name, status, start_date, end_date')
        .eq('league_id', leagueId)
        .order('start_date', { ascending: false });

      if (!cancelled) {
        setSeasons(
          (data || []).map((season) => ({
            id: season.id,
            name: season.name,
            status: season.status ?? 'draft',
            start_date: season.start_date,
            end_date: season.end_date,
          }))
        );
        setLoading(false);
      }
    };

    fetchSeasons();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!leagueId) {
    return null;
  }

  const selectedSeason = seasons.find((season) => season.id === seasonId);

  const handleSeasonSelect = (season: Season) => {
    setIsOpen(false);
    onMobileNavClose?.();

    if (season.id === seasonId) {
      return;
    }

    writeSeasonWorkspaceCookie(leagueId, season);
    router.push(
      buildEquivalentSeasonWorkspaceHref({
        locale,
        leagueId,
        seasonId: season.id,
        pathname,
      })
    );
  };

  const handleClearSeason = () => {
    setIsOpen(false);
    onMobileNavClose?.();
    clearSeasonWorkspaceCookie(leagueId);
    router.push(buildLeagueHubHref(locale, leagueId));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-[border-color,background-color,color]',
          'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.16] hover:bg-white/[0.05]',
          selectedSeason ? 'text-neutral-100' : 'text-neutral-500'
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-neutral-500" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Season Workspace
          </p>
          <p className="truncate text-[13px] font-semibold">
            {loading
              ? t('loading') || 'Loading...'
              : selectedSeason
                ? selectedSeason.name
                : seasons.length > 0
                  ? t('selectSeason') || 'Choose season workspace'
                  : t('noSeasons') || 'No seasons'}
          </p>
        </div>
        {seasons.length > 0 ? (
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {isOpen && seasons.length > 0 ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/[0.10] bg-[linear-gradient(180deg,rgba(16,23,33,0.98),rgba(11,15,22,0.98))] p-1 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          >
            {selectedSeason ? (
              <>
                <button
                  onClick={handleClearSeason}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-neutral-200"
                >
                  {t('allSeasons') || 'Back to league hub'}
                </button>
                <div className="my-1 border-t border-white/[0.08]" />
              </>
            ) : null}

            {seasons.map((season) => (
              <button
                key={season.id}
                onClick={() => handleSeasonSelect(season)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors',
                  season.id === seasonId
                    ? 'bg-rink-500/10 text-rink-200'
                    : 'text-neutral-300 hover:bg-white/[0.05]'
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{season.name}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    {season.start_date ? new Date(season.start_date).toLocaleDateString() : 'TBD'}
                  </p>
                </div>
                <StatusBadge status={season.status} />
                {season.id === seasonId ? <Check className="h-4 w-4 text-rink-300" /> : null}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
