'use client';

import { useState, type ReactNode } from 'react';
import { LayoutGrid, Users } from 'lucide-react';
import { TeamLineupView } from './TeamLineupView';

interface LineupPlayer {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  position?: string | null;
}

interface TeamRosterToggleProps {
  statsView: ReactNode;
  skaters: LineupPlayer[];
  goalies: LineupPlayer[];
  primaryColor: string;
  secondaryColor: string;
}

export function TeamRosterToggle({
  statsView,
  skaters,
  goalies,
  primaryColor,
  secondaryColor,
}: TeamRosterToggleProps) {
  const [view, setView] = useState<'stats' | 'lineup'>('stats');

  return (
    <div>
      {/* Toggle */}
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          <button
            onClick={() => setView('stats')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              view === 'stats'
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]'
            }`}
          >
            <Users className="h-4 w-4" />
            Stats
          </button>
          <button
            onClick={() => setView('lineup')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              view === 'lineup'
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Lineup
          </button>
        </div>
      </div>

      {view === 'stats' ? (
        statsView
      ) : (
        <TeamLineupView
          skaters={skaters}
          goalies={goalies}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      )}
    </div>
  );
}
