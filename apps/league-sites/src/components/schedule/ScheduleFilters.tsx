'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from 'lucide-react';
import type { Season, Division } from '@/lib/types';

interface ScheduleFiltersProps {
  seasons: Season[];
  divisions: Division[];
  currentFilters: {
    season?: string;
    division?: string;
    type?: string;
  };
  leagueSlug: string;
}

// Game types for filtering
const GAME_TYPES = [
  { value: '', label: 'All Games' },
  { value: 'regular', label: 'Regular Season' },
  { value: 'playoffs', label: 'Playoffs' },
  { value: 'exhibition', label: 'Exhibition' },
] as const;

/**
 * ScheduleFilters - Filter dropdowns for schedule page
 *
 * Allows filtering by season, division, and game type.
 * Uses URL-driven state via searchParams for shareable URLs.
 */
export function ScheduleFilters({
  seasons,
  divisions,
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

  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Filter Icon and Label */}
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter:</span>
        </div>

        {/* Season Filter */}
        {seasons.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="season-filter" className="sr-only">
              Season
            </label>
            <select
              id="season-filter"
              value={currentFilters.season || ''}
              onChange={(e) => handleFilterChange('season', e.target.value)}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)] focus:border-transparent transition-all cursor-pointer hover:border-[var(--color-border-emphasis)]"
            >
              <option value="">All Seasons</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                  {season.is_current && ' (Current)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Division Filter */}
        {divisions.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="division-filter" className="sr-only">
              Division
            </label>
            <select
              id="division-filter"
              value={currentFilters.division || ''}
              onChange={(e) => handleFilterChange('division', e.target.value)}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)] focus:border-transparent transition-all cursor-pointer hover:border-[var(--color-border-emphasis)]"
            >
              <option value="">All Divisions</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Game Type Filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="type-filter" className="sr-only">
            Game Type
          </label>
          <select
            id="type-filter"
            value={currentFilters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)] focus:border-transparent transition-all cursor-pointer hover:border-[var(--color-border-emphasis)]"
          >
            {GAME_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button - only show if filters are active */}
        {(currentFilters.season || currentFilters.division || currentFilters.type) && (
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('season');
              params.delete('division');
              params.delete('type');
              router.push(`/${leagueSlug}/schedule?${params.toString()}`);
            }}
            className="text-sm font-medium text-[var(--league-primary)] hover:text-[var(--league-primary-hover)] transition-colors underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

export default ScheduleFilters;
