'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Season, Division } from '@/lib/types';

interface ScheduleFiltersProps {
  seasons: Season[];
  divisions: Division[];
  venues?: string[];
  currentFilters: {
    season?: string;
    division?: string;
    type?: string;
    venue?: string;
    status?: string;
  };
  leagueSlug: string;
}

// Season types for filtering
const SEASON_TYPES = [
  { value: '', label: 'All Games' },
  { value: 'regular', label: 'Regular Season' },
  { value: 'playoffs', label: 'Playoffs' },
  { value: 'exhibition', label: 'Exhibition' },
] as const;

// Game status for filtering
const GAME_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'final', label: 'Final' },
  { value: 'postponed', label: 'Postponed' },
] as const;

/**
 * ScheduleFilters - Clean inline native select dropdowns for schedule filtering
 *
 * Layout: [Season] [Division] [Season Type] in a horizontal row, equal width.
 * Uses native <select> elements with consistent styling.
 * URL-driven state via searchParams for shareable URLs.
 */
export function ScheduleFilters({
  seasons,
  divisions,
  venues = [],
  currentFilters,
  leagueSlug,
}: ScheduleFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  const selectClass =
    'flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50 focus:border-transparent transition-all cursor-pointer appearance-none';

  return (
    <div className="space-y-3 mb-6">
      {/* Primary Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Season Filter */}
        <div className="flex-1">
          <label htmlFor="season-filter" className="sr-only">
            Season
          </label>
          <select
            id="season-filter"
            value={currentFilters.season || ''}
            onChange={(e) => handleFilterChange('season', e.target.value)}
            className={selectClass}
          >
            <option value="">All Seasons</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
                {season.is_current ? ' (Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Division Filter */}
        <div className="flex-1">
          <label htmlFor="division-filter" className="sr-only">
            Division
          </label>
          <select
            id="division-filter"
            value={currentFilters.division || ''}
            onChange={(e) => handleFilterChange('division', e.target.value)}
            className={selectClass}
          >
            <option value="">All Divisions</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>
        </div>

        {/* Season Type Filter */}
        <div className="flex-1">
          <label htmlFor="type-filter" className="sr-only">
            Season Type
          </label>
          <select
            id="type-filter"
            value={currentFilters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className={selectClass}
          >
            {SEASON_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Secondary Filters Row (Venue & Status) */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Venue Filter */}
        {venues.length > 0 && (
          <div className="flex-1">
            <label htmlFor="venue-filter" className="sr-only">
              Venue
            </label>
            <select
              id="venue-filter"
              value={currentFilters.venue || ''}
              onChange={(e) => handleFilterChange('venue', e.target.value)}
              className={selectClass}
            >
              <option value="">All Venues</option>
              {venues.map((venue) => (
                <option key={venue} value={venue}>
                  {venue}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Game Status Filter */}
        <div className="flex-1">
          <label htmlFor="status-filter" className="sr-only">
            Game Status
          </label>
          <select
            id="status-filter"
            value={currentFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={selectClass}
          >
            {GAME_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default ScheduleFilters;
