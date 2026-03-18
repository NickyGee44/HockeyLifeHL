'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui';
import { ChevronDown, Check, CalendarDays } from 'lucide-react';
import { useAppSidebar } from './AppSidebarContext';
import { createClient } from '@/lib/supabase/client';

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
  active: 'bg-emerald-500/20 text-emerald-400',
  upcoming: 'bg-blue-500/20 text-blue-400',
  draft: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-neutral-500/20 text-neutral-400',
  playoffs: 'bg-purple-500/20 text-purple-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
      STATUS_COLORS[status] || STATUS_COLORS.draft
    )}>
      {status}
    </span>
  );
}

/**
 * Pick the "best" season to auto-select:
 * active > playoffs > upcoming > most recent completed
 */
function pickOperationalSeason(seasons: Season[]): Season | null {
  if (seasons.length === 0) return null;

  const active = seasons.find((s) => s.status === 'active');
  if (active) return active;

  const playoffs = seasons.find((s) => s.status === 'playoffs');
  if (playoffs) return playoffs;

  const upcoming = seasons.find((s) => s.status === 'upcoming');
  if (upcoming) return upcoming;

  // Fall back to most recent by start_date
  const sorted = [...seasons].sort((a, b) => {
    const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
    const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
    return bDate - aDate;
  });
  return sorted[0];
}

export function SeasonPicker({ onMobileNavClose }: SeasonPickerProps) {
  const t = useTranslations('navigation');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { leagueId, seasonId } = useAppSidebar();
  const [isOpen, setIsOpen] = React.useState(false);
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [loading, setLoading] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch seasons when league changes
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
        setSeasons((data || []).map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status ?? 'draft',
          start_date: s.start_date,
          end_date: s.end_date,
        })));
        setLoading(false);
      }
    };

    fetchSeasons();
    return () => { cancelled = true; };
  }, [leagueId]);

  // Auto-navigate to operational season if none selected
  React.useEffect(() => {
    if (seasonId || seasons.length === 0 || !leagueId) return;

    // Only auto-select if user is at a league-level page that could have season context
    const path = pathname.replace(`/${locale}`, '');
    const isLeaguePage = path.includes(`/dashboard/leagues/`) && !path.includes('/seasons/');

    // Don't auto-navigate — just let the picker show the suggestion
    // The user can click to enter a season
  }, [seasonId, seasons, leagueId, pathname, locale]);

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

  if (!leagueId) return null;

  const selectedSeason = seasons.find((s) => s.id === seasonId);
  const operationalSeason = pickOperationalSeason(seasons);

  const handleSeasonSelect = (season: Season) => {
    setIsOpen(false);
    onMobileNavClose?.();

    if (season.id === seasonId) return;

    // If currently on a season-scoped page, swap the season ID
    if (seasonId && pathname.includes(`/seasons/${seasonId}`)) {
      const newPath = pathname.replace(`/seasons/${seasonId}`, `/seasons/${season.id}`);
      router.push(newPath);
    } else {
      // Navigate to the season's schedule page (primary entry point)
      router.push(`/${locale}/dashboard/leagues/${leagueId}/seasons/${season.id}/schedule`);
    }
  };

  const handleClearSeason = () => {
    setIsOpen(false);
    onMobileNavClose?.();
    // Navigate back to league overview
    router.push(`/${locale}/dashboard/leagues/${leagueId}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
          'hover:bg-white/[0.04] text-left',
          selectedSeason ? 'text-neutral-200' : 'text-neutral-500'
        )}
      >
        <CalendarDays className="w-4 h-4 flex-shrink-0 text-neutral-500" />
        <span className="text-[13px] flex-1 truncate">
          {loading
            ? t('loading') || 'Loading...'
            : selectedSeason
            ? selectedSeason.name
            : seasons.length > 0
            ? t('selectSeason') || 'Select season...'
            : t('noSeasons') || 'No seasons'
          }
        </span>
        {seasons.length > 0 && (
          <ChevronDown className={cn('w-3.5 h-3.5 text-neutral-600 transition-transform', isOpen && 'rotate-180')} />
        )}
      </button>

      {isOpen && seasons.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 py-1 rounded-xl bg-neutral-800 border border-white/10 shadow-lg max-h-64 overflow-y-auto">
          {selectedSeason && (
            <button
              onClick={handleClearSeason}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-[13px] text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700 transition-colors"
            >
              <span>{t('allSeasons') || 'Back to league view'}</span>
            </button>
          )}
          {selectedSeason && <div className="border-t border-white/[0.06] my-1" />}
          {seasons.map((season) => (
            <button
              key={season.id}
              onClick={() => handleSeasonSelect(season)}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors hover:bg-neutral-700',
                season.id === seasonId ? 'text-rink-400' : 'text-neutral-300'
              )}
            >
              <span className="text-[13px] font-medium truncate flex-1">{season.name}</span>
              <StatusBadge status={season.status} />
              {season.id === seasonId && (
                <Check className="w-3.5 h-3.5 text-rink-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
