'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { List } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TeamLineupView } from './TeamLineupView';

interface LineupPlayer {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  position?: string | null;
  /** When true, this player is a spare and must not occupy a jersey slot. */
  isSub?: boolean;
}

interface TeamRosterToggleProps {
  title?: string;
  statsView: ReactNode;
  skaters: LineupPlayer[];
  goalies: LineupPlayer[];
  primaryColor: string;
  secondaryColor: string;
  availabilityGameId?: string | null;
  availabilityTeamId?: string | null;
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
  availabilityGameId = null,
  availabilityTeamId = null,
}: TeamRosterToggleProps) {
  const [view, setView] = useState<'lineup' | 'stats'>('lineup');
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, 'confirmed' | 'tentative' | 'out'>>({});

  useEffect(() => {
    if (!availabilityGameId || !availabilityTeamId) {
      setAvailabilityMap({});
      return;
    }

    const loadAvailability = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('game_checkins')
        .select('player_id, status')
        .eq('team_id', availabilityTeamId)
        .eq('game_id', availabilityGameId);

      const nextMap: Record<string, 'confirmed' | 'tentative' | 'out'> = {};
      for (const row of data || []) {
        if (row.status === 'confirmed' || row.status === 'tentative' || row.status === 'out') {
          nextMap[row.player_id] = row.status;
        }
      }

      setAvailabilityMap(nextMap);
    };

    const handleAvailabilityUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{
        gameId: string;
        playerId: string;
        status: string;
      }>).detail;

      if (!detail || detail.gameId !== availabilityGameId) return;
      if (
        detail.status !== 'confirmed' &&
        detail.status !== 'tentative' &&
        detail.status !== 'out'
      ) {
        return;
      }

      const nextStatus = detail.status as 'confirmed' | 'tentative' | 'out';

      setAvailabilityMap((prev) => ({
        ...prev,
        [detail.playerId]: nextStatus,
      }));
    };

    loadAvailability();
    window.addEventListener('team-checkin-updated', handleAvailabilityUpdate as EventListener);

    return () => {
      window.removeEventListener('team-checkin-updated', handleAvailabilityUpdate as EventListener);
    };
  }, [availabilityGameId, availabilityTeamId]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)] md:text-3xl">
            {title}
          </h2>
          <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            {skaters.length} skaters
          </span>
          <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background-elevated)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            {goalies.length} goalie{goalies.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          <button
            onClick={() => setView('lineup')}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              view === 'lineup'
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]'
            }`}
            aria-label="Lineup view"
          >
            <JerseyIcon className="h-4 w-4" />
            <span>Lineup</span>
          </button>
          <button
            onClick={() => setView('stats')}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              view === 'stats'
                ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--league-primary)]'
            }`}
            aria-label="Stats view"
          >
            <List className="h-4 w-4" />
            <span>Stats</span>
          </button>
        </div>
      </div>

      {view === 'lineup' ? (
        <TeamLineupView
          skaters={skaters}
          goalies={goalies}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          availabilityMap={availabilityMap}
        />
      ) : (
        statsView
      )}
    </div>
  );
}
