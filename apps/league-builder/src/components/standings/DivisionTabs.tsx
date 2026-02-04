'use client';

/**
 * Division Tabs Component
 *
 * Tabbed interface for viewing standings by division.
 */

import { useState } from 'react';
import { cn } from '@hockey-life/ui/lib/utils';
import { Users } from 'lucide-react';
import { StandingsTable } from './StandingsTable';
import type { TeamStanding } from '@/lib/standings/types';

// ============================================================================
// TYPES
// ============================================================================

interface Division {
  divisionId: string | null;
  divisionName: string;
  teams: TeamStanding[];
}

interface DivisionTabsProps {
  divisions: Division[];
  playoffSpotsPerDivision?: number;
  showHomeAway?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DivisionTabs({
  divisions,
  playoffSpotsPerDivision = 4,
  showHomeAway = false,
}: DivisionTabsProps) {
  const [activeTab, setActiveTab] = useState<string | null>(
    divisions[0]?.divisionId ?? null
  );

  if (divisions.length === 0) {
    return (
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-8 text-center">
        <Users className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
        <p className="text-neutral-400">No divisions configured.</p>
      </div>
    );
  }

  // If only one division, don't show tabs
  if (divisions.length === 1) {
    return (
      <div>
        <h3 className="text-lg font-bold text-white mb-4">
          {divisions[0].divisionName}
        </h3>
        <StandingsTable
          standings={divisions[0].teams}
          playoffSpots={playoffSpotsPerDivision}
          showHomeAway={showHomeAway}
        />
      </div>
    );
  }

  const activeDivision = divisions.find((d) => d.divisionId === activeTab) ?? divisions[0];

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {divisions.map((division) => (
          <button
            key={division.divisionId ?? 'null'}
            onClick={() => setActiveTab(division.divisionId)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              activeTab === division.divisionId
                ? 'bg-rink-500 text-black'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            )}
          >
            {division.divisionName}
            <span className="ml-2 text-xs opacity-70">({division.teams.length})</span>
          </button>
        ))}
      </div>

      {/* Active Division Table */}
      <StandingsTable
        standings={activeDivision.teams}
        playoffSpots={playoffSpotsPerDivision}
        showHomeAway={showHomeAway}
      />
    </div>
  );
}
