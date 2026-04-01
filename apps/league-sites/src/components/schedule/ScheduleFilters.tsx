'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import { useDivisionFilter } from '@/components/DivisionFilterProvider';
import type { Team } from '@/lib/types';

interface ScheduleFiltersProps {
  venues?: string[];
  teams?: Team[];
  currentFilters: {
    division?: string;
    team?: string;
    type?: string;
    venue?: string;
  };
  leagueSlug: string;
  weekStart: Date;
}

type FilterDraft = {
  division: string;
  team: string;
  type: string;
  venue: string;
};

const GAME_TYPE_OPTIONS = [
  { value: '', label: 'All Games' },
  { value: 'regular', label: 'Regular Season' },
  { value: 'playoff', label: 'Playoffs' },
  { value: 'exhibition', label: 'Exhibition' },
] as const;

function normalizeGameTypeFilter(value?: string | null) {
  if (value === 'playoffs') return 'playoff';
  return value || '';
}

function buildScheduleHref(leagueSlug: string, params: URLSearchParams) {
  const queryString = params.toString();
  return queryString ? `/${leagueSlug}/schedule?${queryString}` : `/${leagueSlug}/schedule`;
}

function buildDraftFilters(
  selectedDivisionId: string | null,
  currentFilters: ScheduleFiltersProps['currentFilters'],
): FilterDraft {
  return {
    division: selectedDivisionId || currentFilters.division || '',
    team: currentFilters.team || '',
    type: normalizeGameTypeFilter(currentFilters.type),
    venue: currentFilters.venue || '',
  };
}

function filterTeamsByDivision(teams: Team[], divisionId: string) {
  if (!divisionId) return teams;

  return teams.filter(
    (team) => team.division_id === divisionId || (team.division as { id?: string } | null)?.id === divisionId,
  );
}

/**
 * ScheduleFilters - compact schedule controls with a filter modal.
 *
 * Keeps week navigation visible and moves the existing filter state into a
 * modal so the page stays compact while still using the same URL params.
 */
export function ScheduleFilters({
  venues = [],
  teams = [],
  currentFilters,
  leagueSlug,
  weekStart,
}: ScheduleFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { divisions, selectedDivisionId, setDivision } = useDivisionFilter();
  const prevDivisionRef = useRef<string | null | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FilterDraft>(() =>
    buildDraftFilters(selectedDivisionId, currentFilters),
  );

  const normalizedTypeFilter = normalizeGameTypeFilter(currentFilters.type);
  const currentDivisionId = selectedDivisionId || currentFilters.division || '';
  const availableTeams = useMemo(
    () => filterTeamsByDivision(teams, draftFilters.division),
    [draftFilters.division, teams],
  );

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // Sync global division filter → URL param so server-side query picks it up.
  useEffect(() => {
    if (prevDivisionRef.current === undefined) {
      prevDivisionRef.current = searchParams.get('division') || null;
      return;
    }

    if (prevDivisionRef.current === selectedDivisionId) return;

    const urlDivision = searchParams.get('division') || null;
    prevDivisionRef.current = selectedDivisionId;

    if (urlDivision === selectedDivisionId) return;

    const params = new URLSearchParams(searchParams.toString());
    if (selectedDivisionId) {
      params.set('division', selectedDivisionId);
    } else {
      params.delete('division');
    }

    router.replace(buildScheduleHref(leagueSlug, params));
  }, [selectedDivisionId, searchParams, router, leagueSlug]);

  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const weekRangeDisplay = sameMonth
    ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`
    : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  const activeFilters = useMemo(() => {
    const items: Array<{ key: keyof FilterDraft; label: string; value: string }> = [];

    if (divisions.length > 1 && currentDivisionId) {
      const divisionName = divisions.find((division) => division.id === currentDivisionId)?.name || 'Division';
      items.push({ key: 'division', label: 'Division', value: divisionName });
    }

    if (currentFilters.team) {
      const teamName = teams.find((team) => team.id === currentFilters.team)?.name || 'Team';
      items.push({ key: 'team', label: 'Team', value: teamName });
    }

    if (normalizedTypeFilter) {
      const typeLabel = GAME_TYPE_OPTIONS.find((type) => type.value === normalizedTypeFilter)?.label || 'Game Type';
      items.push({ key: 'type', label: 'Game Type', value: typeLabel });
    }

    if (currentFilters.venue) {
      items.push({ key: 'venue', label: 'Venue', value: currentFilters.venue });
    }

    return items;
  }, [currentDivisionId, currentFilters.team, currentFilters.venue, divisions, normalizedTypeFilter, teams]);

  const activeFilterCount = activeFilters.length;

  const openFilters = () => {
    setDraftFilters(buildDraftFilters(selectedDivisionId, currentFilters));
    setIsModalOpen(true);
  };

  const handlePrevWeek = () => {
    const prevWeek = subDays(weekStart, 7);
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', format(prevWeek, 'yyyy-MM-dd'));
    params.delete('day');
    router.push(buildScheduleHref(leagueSlug, params));
  };

  const handleNextWeek = () => {
    const nextWeek = addDays(weekStart, 7);
    const params = new URLSearchParams(searchParams.toString());
    params.set('week', format(nextWeek, 'yyyy-MM-dd'));
    params.delete('day');
    router.push(buildScheduleHref(leagueSlug, params));
  };

  const handleDraftDivisionChange = (divisionId: string) => {
    const nextTeams = filterTeamsByDivision(teams, divisionId);

    setDraftFilters((current) => ({
      ...current,
      division: divisionId,
      team: nextTeams.some((team) => team.id === current.team) ? current.team : '',
    }));
  };

  const handleDraftChange = (key: keyof FilterDraft, value: string) => {
    if (key === 'division') {
      handleDraftDivisionChange(value);
      return;
    }

    setDraftFilters((current) => ({
      ...current,
      [key]: key === 'type' ? normalizeGameTypeFilter(value) : value,
    }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (draftFilters.division) {
      params.set('division', draftFilters.division);
    } else {
      params.delete('division');
    }

    if (draftFilters.team) {
      params.set('team', draftFilters.team);
    } else {
      params.delete('team');
    }

    if (draftFilters.type) {
      params.set('type', draftFilters.type);
    } else {
      params.delete('type');
    }

    if (draftFilters.venue) {
      params.set('venue', draftFilters.venue);
    } else {
      params.delete('venue');
    }

    setDivision(draftFilters.division || null);
    setIsModalOpen(false);
    router.push(buildScheduleHref(leagueSlug, params));
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('division');
    params.delete('team');
    params.delete('type');
    params.delete('venue');

    setDraftFilters({
      division: '',
      team: '',
      type: '',
      venue: '',
    });
    setDivision(null);
    setIsModalOpen(false);
    router.push(buildScheduleHref(leagueSlug, params));
  };

  const selectClass =
    'w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-3 text-sm text-[var(--color-text-primary)] transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--league-primary)]/50';

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-2 rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)]/85 p-1.5 shadow-sm">
            <button
              onClick={handlePrevWeek}
              className="inline-flex items-center gap-1 rounded-[16px] px-3 py-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--league-primary)]"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden text-sm font-medium sm:inline">Prev</span>
            </button>

            <h2 className="min-w-0 px-2 text-center text-base font-bold text-[var(--color-text-primary)] sm:text-lg">
              {weekRangeDisplay}
            </h2>

            <button
              onClick={handleNextWeek}
              className="inline-flex items-center gap-1 rounded-[16px] px-3 py-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--league-primary)]"
              aria-label="Next week"
            >
              <span className="hidden text-sm font-medium sm:inline">Next</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={openFilters}
              className="inline-flex items-center gap-2 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
              aria-expanded={isModalOpen}
              aria-haspopup="dialog"
            >
              <Filter className="h-4 w-4 text-[var(--league-primary)]" />
              Filter
              {activeFilterCount > 0 && (
                <span
                  className="inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--league-primary) 14%, transparent)',
                    color: 'var(--league-primary)',
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <span
                key={filter.key}
                className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]"
              >
                <span className="mr-1 text-[var(--color-text-muted)]">{filter.label}:</span>
                <span className="text-[var(--color-text-primary)]">{filter.value}</span>
              </span>
            ))}

            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[var(--league-primary)] transition-opacity hover:opacity-80"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-filter-modal-title"
            className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
              <div>
                <h3
                  id="schedule-filter-modal-title"
                  className="text-lg font-semibold text-[var(--color-text-primary)]"
                >
                  Filter Schedule
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Narrow the slate by team, division, game type, or venue.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {divisions.length > 1 && (
                <div>
                  <label
                    htmlFor="schedule-division-filter"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
                  >
                    Division
                  </label>
                  <select
                    id="schedule-division-filter"
                    value={draftFilters.division}
                    onChange={(event) => handleDraftDivisionChange(event.target.value)}
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
              )}

              {teams.length > 0 && (
                <div>
                  <label
                    htmlFor="schedule-team-filter"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
                  >
                    Team
                  </label>
                  <select
                    id="schedule-team-filter"
                    value={draftFilters.team}
                    onChange={(event) => handleDraftChange('team', event.target.value)}
                    className={selectClass}
                  >
                    <option value="">All Teams</option>
                    {availableTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="schedule-type-filter"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
                >
                  Game Type
                </label>
                <select
                  id="schedule-type-filter"
                  value={draftFilters.type}
                  onChange={(event) => handleDraftChange('type', event.target.value)}
                  className={selectClass}
                >
                  {GAME_TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {venues.length > 0 && (
                <div>
                  <label
                    htmlFor="schedule-venue-filter"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]"
                  >
                    Venue
                  </label>
                  <select
                    id="schedule-venue-filter"
                    value={draftFilters.venue}
                    onChange={(event) => handleDraftChange('venue', event.target.value)}
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
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-hover)]/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                Reset filters
              </button>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-text)] transition-opacity hover:opacity-90"
                  style={{ background: 'var(--league-primary)' }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ScheduleFilters;
