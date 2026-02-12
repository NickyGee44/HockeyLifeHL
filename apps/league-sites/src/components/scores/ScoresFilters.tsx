'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';
import type { Season, Team } from '@/lib/types';

interface ScoresFiltersProps {
  seasons: Season[];
  teams?: Team[];
  currentFilters: {
    season?: string;
    division?: string;
    team?: string;
    period?: string;
  };
  leagueSlug: string;
}

export function ScoresFilters({
  seasons,
  teams = [],
  currentFilters,
  leagueSlug,
}: ScoresFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { divisions, selectedDivisionId, setDivision } = useDivisionFilter();
  const prevDivisionRef = useRef<string | null | undefined>(undefined);

  // Cascade team list by selected division
  const filteredTeams = selectedDivisionId
    ? teams.filter((t) => t.division_id === selectedDivisionId || (t.division as any)?.id === selectedDivisionId)
    : teams;

  // Sync global division filter → URL param so server-side query picks it up
  useEffect(() => {
    // First render: capture current URL state without navigating
    if (prevDivisionRef.current === undefined) {
      prevDivisionRef.current = searchParams.get('division') || null;
      return;
    }

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

    router.replace(`/${leagueSlug}/scores?${params.toString()}`);
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

  const selectClass = `
    px-4 py-2 rounded-lg
    bg-[var(--color-surface-hover)] border border-[var(--color-border)]
    text-[var(--color-text-primary)] text-sm
    focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50
    cursor-pointer transition-all duration-200
    hover:border-[var(--league-primary)]/50
  `;

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Division Filter */}
      {divisions.length > 1 && (
        <select
          value={selectedDivisionId || ''}
          onChange={(e) => setDivision(e.target.value || null)}
          className={selectClass}
          style={selectedDivisionId ? {
            borderColor: 'var(--league-primary)',
            backgroundColor: 'color-mix(in srgb, var(--league-primary) 8%, var(--color-surface-hover))',
          } : undefined}
        >
          <option value="">All Divisions</option>
          {divisions.map((div) => (
            <option key={div.id} value={div.id}>{div.name}</option>
          ))}
        </select>
      )}

      {/* Team Filter */}
      {teams.length > 0 && (
        <select
          value={currentFilters.team || ''}
          onChange={(e) => handleFilterChange('team', e.target.value)}
          className={selectClass}
          style={currentFilters.team ? {
            borderColor: 'var(--league-primary)',
            backgroundColor: 'color-mix(in srgb, var(--league-primary) 8%, var(--color-surface-hover))',
          } : undefined}
        >
          <option value="">All Teams</option>
          {filteredTeams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      )}

      {/* Season Filter */}
      {seasons.length > 0 && (
        <select
          value={currentFilters.season || 'all'}
          onChange={(e) => handleFilterChange('season', e.target.value)}
          className={selectClass}
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
