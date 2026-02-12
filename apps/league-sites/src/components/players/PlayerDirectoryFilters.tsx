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
  leagueSlug,
}: PlayerDirectoryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchQuery || '');
  const { selectedDivisionId } = useDivisionFilter();
  const prevDivisionRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    setSearch(searchQuery || '');
  }, [searchQuery]);

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
    <div className="mb-8 space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players by name or jersey number..."
          className="w-full pl-12 pr-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)] focus:border-transparent"
        />
      </form>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter by:</span>
        </div>

        {/* Division Filter (shown inline for pages that don't use global header) */}
        {divisions.length > 1 && (
          <select
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
        )}

        {/* Team Filter */}
        <select
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
        <select
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
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
