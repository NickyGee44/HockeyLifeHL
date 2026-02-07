'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';
import type { Season } from '@/lib/types';

interface ScoresFiltersProps {
  seasons: Season[];
  currentFilters: {
    season?: string;
    division?: string;
    period?: string;
  };
  leagueSlug: string;
}

export function ScoresFilters({
  seasons,
  currentFilters,
  leagueSlug,
}: ScoresFiltersProps) {
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

    // Preserve period if set
    if (currentFilters.period) {
      params.set('period', currentFilters.period);
    }

    router.push(`/${leagueSlug}/scores?${params.toString()}`);
  }, [selectedDivisionId, searchParams, router, leagueSlug, currentFilters.period]);

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

  if (seasons.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Season Filter (division is handled globally in nav bar) */}
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
    </div>
  );
}
