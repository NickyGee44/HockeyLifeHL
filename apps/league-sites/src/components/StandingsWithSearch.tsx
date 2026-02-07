'use client';

import { useState, useEffect } from 'react';
import { StandingsTable } from './StandingsTable';
import { StandingsSearch } from './StandingsSearch';
import { useDivisionFilter } from './DivisionFilterProvider';
import type { TeamStanding, Division } from '@/lib/types';

interface StandingsWithSearchProps {
  standings: TeamStanding[];
  divisions: Division[];
  standingsByDivision: Record<string, TeamStanding[]>;
}

export function StandingsWithSearch({
  standings,
  divisions,
  standingsByDivision,
}: StandingsWithSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedDivisionId, setDivision } = useDivisionFilter();

  // For multi-division leagues: default to first division (no "All" overall standings)
  // For single/no division leagues: show all standings
  const hasMultipleDivisions = divisions.length > 1;
  const defaultTab = hasMultipleDivisions ? divisions[0].id : 'all';
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Sync local tab with global division filter
  useEffect(() => {
    if (selectedDivisionId && standingsByDivision[selectedDivisionId]) {
      setActiveTab(selectedDivisionId);
      return;
    }

    if (!selectedDivisionId && !standingsByDivision[activeTab]) {
      setActiveTab(defaultTab);
    }
  }, [selectedDivisionId, standingsByDivision, activeTab, defaultTab]);

  // When user clicks a division tab, update both local and global state
  const handleTabSelect = (divisionId: string) => {
    setActiveTab(divisionId);
    setDivision(divisionId);
  };

  // Get current standings based on active tab
  const currentStandings = activeTab in standingsByDivision ? standingsByDivision[activeTab] : standings;

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6 max-w-sm">
        <StandingsSearch
          onSearch={setSearchTerm}
          placeholder="Find a team..."
        />
      </div>

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
        <StandingsTable standings={currentStandings} searchTerm={searchTerm} />
      </div>

      {/* No results message */}
      {searchTerm && currentStandings.filter((t) => (t.team_name || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
        <div className="mt-4 text-center text-[var(--color-text-secondary)]">
          No teams found matching &quot;{searchTerm}&quot;
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
