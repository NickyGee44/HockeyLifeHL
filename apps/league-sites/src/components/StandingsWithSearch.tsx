'use client';

import { useState } from 'react';
import { StandingsTable } from './StandingsTable';
import { StandingsSearch } from './StandingsSearch';
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
  const [activeTab, setActiveTab] = useState<string>('all');

  // Get current standings based on active tab
  const currentStandings = standingsByDivision[activeTab] || standings;

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6 max-w-sm">
        <StandingsSearch
          onSearch={setSearchTerm}
          placeholder="Find a team..."
        />
      </div>

      {/* Division Tabs (if multiple divisions) */}
      {divisions.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <TabButton
            label="All"
            isActive={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          />
          {divisions.map((division) => (
            <TabButton
              key={division.id}
              label={division.name}
              isActive={activeTab === division.id}
              onClick={() => setActiveTab(division.id)}
            />
          ))}
        </div>
      )}

      {/* Standings Table */}
      <div className="card overflow-hidden">
        <StandingsTable standings={currentStandings} searchTerm={searchTerm} />
      </div>

      {/* No results message */}
      {searchTerm && currentStandings.filter((t) => t.team_name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
        <div className="mt-4 text-center text-[var(--color-text-secondary)]">
          No teams found matching "{searchTerm}"
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
            ? 'bg-[var(--league-primary)] text-[var(--color-background)]'
            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      {label}
    </button>
  );
}
