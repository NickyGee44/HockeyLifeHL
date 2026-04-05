'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { StandingsTable } from './StandingsTable';
import { useDivisionFilter } from './DivisionFilterProvider';
import type { TeamStanding, Division } from '@/lib/types';

interface StandingsWithSearchProps {
  standings: TeamStanding[];
  divisions: Division[];
  standingsByDivision: Record<string, TeamStanding[]>;
  leagueSlug: string;
}

export function StandingsWithSearch({
  standings,
  divisions,
  standingsByDivision,
  leagueSlug,
}: StandingsWithSearchProps) {
  const [showLegend, setShowLegend] = useState(false);
  const { selectedDivisionId, setDivision } = useDivisionFilter();

  // For multi-division leagues: default to first division (no "All" overall standings)
  // For single/no division leagues: show all standings
  const hasMultipleDivisions = divisions.length > 1;
  const defaultTab = hasMultipleDivisions ? divisions[0].id : 'all';
  const activeTab = (selectedDivisionId && standingsByDivision[selectedDivisionId])
    ? selectedDivisionId
    : defaultTab;

  const handleTabSelect = (divisionId: string) => {
    setDivision(divisionId);
  };

  // Get current standings based on active tab
  const currentStandings = activeTab in standingsByDivision ? standingsByDivision[activeTab] : standings;

  return (
    <div>
      {/* Division Tabs (for multi-division leagues, hidden when global filter is active) */}
      {hasMultipleDivisions && !selectedDivisionId && (
        <div className="flex flex-wrap gap-2 mb-4">
          {divisions.map((division) => (
            <TabButton
              key={division.id}
              label={division.name}
              isActive={activeTab === division.id}
              onClick={() => handleTabSelect(division.id)}
            />
          ))}
        </div>
      )}

      {/* Standings Table */}
      <div className="card overflow-hidden">
        <StandingsTable standings={currentStandings} leagueSlug={leagueSlug} />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowLegend((current) => !current)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
          aria-expanded={showLegend}
          aria-controls="standings-legend"
        >
          Legend
          {showLegend ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {showLegend && (
        <div id="standings-legend" className="mt-4 card p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--color-text-secondary)]">
            <span><strong>GP</strong> - Games Played</span>
            <span><strong>W</strong> - Wins</span>
            <span><strong>L</strong> - Losses</span>
            <span><strong>OTL</strong> - Overtime Losses</span>
            <span><strong>T</strong> - Ties</span>
            <span><strong>PTS</strong> - Points</span>
            <span><strong>GF</strong> - Goals For</span>
            <span><strong>GA</strong> - Goals Against</span>
            <span><strong>DIFF</strong> - Goal Differential</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
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
