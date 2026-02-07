'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';
import type { Season } from '@/lib/types';

interface ScheduleFiltersProps {
  seasons: Season[];
  venues?: string[];
  currentFilters: {
    season?: string;
    division?: string;
    type?: string;
    venue?: string;
    status?: string;
  };
  leagueSlug: string;
  weekStart: Date;
}

const SEASON_TYPES = [
  { value: '', label: 'All Games' },
  { value: 'regular', label: 'Regular Season' },
  { value: 'playoffs', label: 'Playoffs' },
  { value: 'exhibition', label: 'Exhibition' },
] as const;

/**
 * ScheduleFilters - BMHL-style filter bar with integrated week selector
 *
 * Row 1: < Prev  |  Jan 25 - 31, 2026  |  Next >
 * Row 2: [Season] [Type] [Venue]
 *
 * Division filtering is handled by the global nav bar filter.
 */
export function ScheduleFilters({
  seasons,
  venues = [],
  currentFilters,
  leagueSlug,
  weekStart,
}: ScheduleFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedDivisionId } = useDivisionFilter();
  const prevDivisionRef = useRef(currentFilters.division || null);

  // Sync global division filter → URL param so server-side query picks it up
  useEffect(() => {
    if (prevDivisionRef.current === selectedDivisionId) return;
    prevDivisionRef.current = selectedDivisionId;

    const params = new URLSearchParams(searchParams.toString());
    if (selectedDivisionId) {
      params.set('division', selectedDivisionId);
    } else {
      params.delete('division');
    }
    router.push(`/${leagueSlug}/schedule?${params.toString()}`);
  }, [selectedDivisionId, searchParams, router, leagueSlug]);

  // Handle filter change - update URL params
  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/${leagueSlug}/schedule?${params.toString()}`);
  };

  // Week navigation
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const weekRangeDisplay = sameMonth
    ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`
    : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  const handlePrevWeek = () => {
    const prevWeek = subDays(weekStart, 7);
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', format(prevWeek, 'yyyy-MM-dd'));
    params.delete('day');
    router.push(`/${leagueSlug}/schedule?${params.toString()}`);
  };

  const handleNextWeek = () => {
    const nextWeek = addDays(weekStart, 7);
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', format(nextWeek, 'yyyy-MM-dd'));
    params.delete('day');
    router.push(`/${leagueSlug}/schedule?${params.toString()}`);
  };

  const selectClass =
    'flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-transparent transition-all cursor-pointer appearance-none';

  return (
    <div className="space-y-3">
      {/* Row 1: Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevWeek}
          className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Prev</span>
        </button>

        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          {weekRangeDisplay}
        </h2>

        <button
          onClick={handleNextWeek}
          className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]"
          aria-label="Next week"
        >
          <span className="text-sm font-medium hidden sm:inline">Next</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Row 2: Dropdown Filters (division is handled globally in nav bar) */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Season Filter */}
        <div className="flex-1">
          <label htmlFor="season-filter" className="sr-only">Season</label>
          <select
            id="season-filter"
            value={currentFilters.season || ''}
            onChange={(e) => handleFilterChange('season', e.target.value)}
            className={selectClass}
          >
            <option value="">All Seasons</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}{season.is_current ? ' (Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Season Type Filter */}
        <div className="flex-1">
          <label htmlFor="type-filter" className="sr-only">Season Type</label>
          <select
            id="type-filter"
            value={currentFilters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className={selectClass}
          >
            {SEASON_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Venue Filter (only if venues exist) */}
        {venues.length > 0 && (
          <div className="flex-1">
            <label htmlFor="venue-filter" className="sr-only">Venue</label>
            <select
              id="venue-filter"
              value={currentFilters.venue || ''}
              onChange={(e) => handleFilterChange('venue', e.target.value)}
              className={selectClass}
            >
              <option value="">All Venues</option>
              {venues.map((venue) => (
                <option key={venue} value={venue}>{venue}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScheduleFilters;
