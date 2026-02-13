'use client';

import { StandingsWidget } from './StandingsWidget';
import { useDivisionFilter } from './DivisionFilterProvider';
import type { TeamStanding, Division } from '@/lib/types';

interface DivisionStandingsWidgetProps {
  standings: TeamStanding[];
  divisions: Division[];
  teamsPerDivision?: number;
}

/**
 * DivisionStandingsWidget - Compact sidebar standings with division tabs.
 * For multi-division leagues (like BMHL), each division has its own standings.
 * Defaults to the first division.
 */
export function DivisionStandingsWidget({
  standings,
  divisions,
  teamsPerDivision = 5,
}: DivisionStandingsWidgetProps) {
  const { selectedDivisionId, setDivision } = useDivisionFilter();
  const fallbackDivisionId = divisions[0]?.id || '';
  const activeDivision = (selectedDivisionId && divisions.some((d) => d.id === selectedDivisionId))
    ? selectedDivisionId
    : fallbackDivisionId;

  const divisionStandings = standings
    .filter((t) => t.division_id === activeDivision)
    .slice(0, teamsPerDivision);

  const handleDivisionSelect = (divisionId: string) => {
    setDivision(divisionId);
  };

  return (
    <div>
      {/* Division selector - scrollable pills */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {divisions.map((division) => (
          <button
            key={division.id}
            onClick={() => handleDivisionSelect(division.id)}
            className={`
              px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200
              ${
                activeDivision === division.id
                  ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                  : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
              }
            `}
          >
            {division.name}
          </button>
        ))}
      </div>

      {/* Standings for selected division */}
      <StandingsWidget standings={divisionStandings} />
    </div>
  );
}
