'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Season, Division } from '@/lib/types';

interface ScoresFiltersProps {
  seasons: Season[];
  divisions: Division[];
  currentFilters: {
    season?: string;
    division?: string;
    period?: string;
  };
  leagueSlug: string;
}

export function ScoresFilters({
  seasons,
  divisions,
  currentFilters,
  leagueSlug,
}: ScoresFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Preserve period if set
    if (currentFilters.period) {
      params.set('period', currentFilters.period);
    }

    router.push(`/${leagueSlug}/scores?${params.toString()}`);
  };

  if (seasons.length === 0 && divisions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Season Filter */}
      {seasons.length > 0 && (
        <select
          value={currentFilters.season || 'all'}
          onChange={(e) => handleFilterChange('season', e.target.value)}
          className="
            px-4 py-2 rounded-lg
            bg-[var(--color-surface-hover)] border border-[var(--color-border)]
            text-[var(--color-text-primary)] text-sm
            focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50
            cursor-pointer transition-all duration-200
            hover:border-[var(--league-primary)]/50
          "
        >
          <option value="all">All Seasons</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
      )}

      {/* Division Filter */}
      {divisions.length > 0 && (
        <select
          value={currentFilters.division || 'all'}
          onChange={(e) => handleFilterChange('division', e.target.value)}
          className="
            px-4 py-2 rounded-lg
            bg-[var(--color-surface-hover)] border border-[var(--color-border)]
            text-[var(--color-text-primary)] text-sm
            focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50
            cursor-pointer transition-all duration-200
            hover:border-[var(--league-primary)]/50
          "
        >
          <option value="all">All Divisions</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.id}>
              {division.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
