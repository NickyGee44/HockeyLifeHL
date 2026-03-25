'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';
import type { Season } from '@/lib/types';

interface GoalieStatsFiltersProps {
  seasons: Season[];
  currentFilters: {
    season?: string;
    view?: string;
    sort?: string;
    division?: string;
  };
  leagueSlug: string;
  disableDivisionFilter?: boolean;
}

export function GoalieStatsFilters({
  seasons,
  currentFilters,
  leagueSlug,
  disableDivisionFilter = false,
}: GoalieStatsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { divisions, selectedDivisionId, setDivision } = useDivisionFilter();
  const prevDivisionRef = useRef<string | null | undefined>(undefined);

  // Sync global division filter → URL param so server-side query picks it up
  useEffect(() => {
    if (disableDivisionFilter) {
      return;
    }

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
    router.replace(`/${leagueSlug}/stats/goalies?${params.toString()}`);
  }, [disableDivisionFilter, selectedDivisionId, searchParams, router, leagueSlug]);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (key === 'season') {
      if (value === 'all-time') {
        params.set('view', 'all-time');
        params.delete('season');
        params.delete('division');
      } else {
        params.delete('view');
        if (value && value !== 'all') {
          params.set('season', value);
        } else {
          params.delete('season');
        }
      }
    } else {
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    router.push(`/${leagueSlug}/stats/goalies?${params.toString()}`);
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
      {!disableDivisionFilter && divisions.length > 1 && (
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

      {/* Season Filter */}
      {seasons.length > 0 && (
        <select
          value={currentFilters.view === 'all-time' ? 'all-time' : currentFilters.season || 'all'}
          onChange={(e) => handleFilterChange('season', e.target.value)}
          className={selectClass}
        >
          <option value="all-time">All-Time Career Stats</option>
          <option value="all">Current Season</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
      )}

      {/* Sort By - Quick Filters */}
      <div className="flex gap-2">
        <SortChip
          label="Wins"
          sortKey="wins"
          currentSort={currentFilters.sort || 'wins'}
          leagueSlug={leagueSlug}
        />
        <SortChip
          label="SV%"
          sortKey="save_percentage"
          currentSort={currentFilters.sort || 'wins'}
          leagueSlug={leagueSlug}
        />
        <SortChip
          label="GAA"
          sortKey="goals_against_average"
          currentSort={currentFilters.sort || 'wins'}
          leagueSlug={leagueSlug}
        />
        <SortChip
          label="Shutouts"
          sortKey="shutouts"
          currentSort={currentFilters.sort || 'wins'}
          leagueSlug={leagueSlug}
        />
      </div>
    </div>
  );
}

function SortChip({
  label,
  sortKey,
  currentSort,
  leagueSlug,
}: {
  label: string;
  sortKey: string;
  currentSort: string;
  leagueSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isActive = currentSort === sortKey;

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sortKey);
    router.push(`/${leagueSlug}/stats/goalies?${params.toString()}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
        ${
          isActive
            ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      {label}
    </button>
  );
}
