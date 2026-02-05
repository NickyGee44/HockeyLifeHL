'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Season } from '@/lib/types';

interface GoalieStatsFiltersProps {
  seasons: Season[];
  currentFilters: {
    season?: string;
    sort?: string;
  };
  leagueSlug: string;
}

export function GoalieStatsFilters({
  seasons,
  currentFilters,
  leagueSlug,
}: GoalieStatsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/${leagueSlug}/stats/goalies?${params.toString()}`);
  };

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
            ? 'bg-[var(--league-primary)] text-[var(--color-background)]'
            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      {label}
    </button>
  );
}
