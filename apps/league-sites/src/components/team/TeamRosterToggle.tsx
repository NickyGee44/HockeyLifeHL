'use client';

import { useState, type ReactNode } from 'react';
import { List } from 'lucide-react';
import { TeamLineupView } from './TeamLineupView';

interface LineupPlayer {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  position?: string | null;
}

interface TeamRosterToggleProps {
  title?: string;
  statsView: ReactNode;
  skaters: LineupPlayer[];
  goalies: LineupPlayer[];
  primaryColor: string;
  secondaryColor: string;
}

function JerseyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 5 L8.5 3 Q12 6 15.5 3 L19 5 L22 8 L20.5 11 L18.5 10 L18.5 21 Q12 22 5.5 21 L5.5 10 L3.5 11 L2 8 Z" />
    </svg>
  );
}

export function TeamRosterToggle({
  title = 'Roster',
  statsView,
  skaters,
  goalies,
  primaryColor,
  secondaryColor,
}: TeamRosterToggleProps) {
  const [view, setView] = useState<'lineup' | 'stats'>('lineup');

  return (
    <div>
      {/* Header row: title + toggle inline */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] md:text-3xl">
          {title}
        </h2>
        <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          <button
            onClick={() => setView('lineup')}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              view === 'lineup'
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]'
            }`}
            aria-label="Lineup view"
          >
            <JerseyIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('stats')}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              view === 'stats'
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]'
            }`}
            aria-label="Stats view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {view === 'lineup' ? (
        <TeamLineupView
          skaters={skaters}
          goalies={goalies}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />
      ) : (
        statsView
      )}
    </div>
  );
}
