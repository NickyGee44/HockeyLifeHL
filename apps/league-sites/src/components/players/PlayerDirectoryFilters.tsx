'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, Filter, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface Division {
  id: string;
  name: string;
}

interface PlayerDirectoryFiltersProps {
  teams: Team[];
  divisions: Division[];
  positions: string[];
  selectedTeam?: string;
  selectedPosition?: string;
  selectedDivision?: string;
  searchQuery?: string;
  leagueSlug: string;
}

export function PlayerDirectoryFilters({
  teams,
  divisions,
  positions,
  selectedTeam,
  selectedPosition,
  selectedDivision,
  searchQuery,
  leagueSlug: _leagueSlug,
}: PlayerDirectoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedDivisionId } = useDivisionFilter();
  const prevDivisionRef = useRef<string | null | undefined>(undefined);

  const [search, setSearch] = useState(searchQuery || '');
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setSearch(searchQuery || '');
  }

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
      // Clear team filter if switching divisions (team may not be in new division)
      params.delete('team');
    } else {
      params.delete('division');
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [selectedDivisionId, searchParams, router, pathname]);

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('search', search || null);
  };

  const clearFilters = () => {
    router.push(pathname);
    setSearch('');
  };

  const hasFilters = selectedTeam || selectedPosition || searchQuery || selectedDivision;

  return (
    <div className="mb-8 space-y-4 lg:sticky lg:top-24 lg:rounded-[28px] lg:border lg:border-[var(--color-border)] lg:bg-[var(--color-surface)]/70 lg:p-5 lg:shadow-[0_30px_90px_-64px_rgba(0,0,0,0.95)] lg:backdrop-blur">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative" aria-label="Search players">
        <label htmlFor="player-directory-search" className="sr-only">
          Search players
        </label>
        <Search
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]"
        />
        <input
          id="player-directory-search"
          name="search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="Search players by name or jersey number…"
          className="w-full pl-12 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)] focus:border-transparent"
        />
      </form>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-center lg:flex-col lg:items-stretch">
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <Filter aria-hidden="true" className="w-4 h-4" />
          <span className="text-sm font-medium">Filter by:</span>
        </div>

        {/* Division Filter (shown inline for pages that don't use global header) */}
        {divisions.length > 1 && (
          <>
            <label htmlFor="player-directory-division" className="sr-only">
              Filter by division
            </label>
            <select
              id="player-directory-division"
              aria-label="Filter by division"
              value={selectedDivision || ''}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value) {
                  params.set('division', e.target.value);
                  // Clear team filter when division changes
                  params.delete('team');
                } else {
                  params.delete('division');
                }
                router.push(`${pathname}?${params.toString()}`);
              }}
              className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]"
            >
              <option value="">All Divisions</option>
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.name}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Team Filter */}
        <label htmlFor="player-directory-team" className="sr-only">
          Filter by team
        </label>
        <select
          id="player-directory-team"
          aria-label="Filter by team"
          value={selectedTeam || ''}
          onChange={(e) => updateFilters('team', e.target.value || null)}
          className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]"
        >
          <option value="">All Teams</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        {/* Position Filter */}
        <label htmlFor="player-directory-position" className="sr-only">
          Filter by position
        </label>
        <select
          id="player-directory-position"
          aria-label="Filter by position"
          value={selectedPosition || ''}
          onChange={(e) => updateFilters('position', e.target.value || null)}
          className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]"
        >
          <option value="">All Positions</option>
          {positions.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X aria-hidden="true" className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
