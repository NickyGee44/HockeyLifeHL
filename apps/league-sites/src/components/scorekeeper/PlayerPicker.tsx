'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import type { PlayerData } from '@/lib/actions/scorekeeper';

function isGoaliePosition(position: string | null | undefined): boolean {
  if (!position) return false;
  const normalized = position.trim().toLowerCase();
  return normalized === 'goalie' || normalized === 'g';
}

interface PlayerPickerProps {
  players: PlayerData[];
  teamName: string;
  teamColor?: string | null;
  onSelect: (player: PlayerData) => void;
  onClose: () => void;
  /** Filter to only show goalies (for goalie-specific picks) */
  goaliesOnly?: boolean;
  /** Title override */
  title?: string;
  /** Show a skip/no-selection button */
  allowSkip?: boolean;
  /** Label for the skip button (e.g., "Unassisted Goal") */
  skipLabel?: string;
  /** Callback when skip is tapped */
  onSkip?: () => void;
}

export function PlayerPicker({
  players,
  teamName,
  teamColor,
  onSelect,
  onClose,
  goaliesOnly = false,
  title,
  allowSkip = false,
  skipLabel = 'Skip',
  onSkip,
}: PlayerPickerProps) {
  const sortedPlayers = useMemo(() => {
    const list = goaliesOnly
      ? players.filter(p => isGoaliePosition(p.position))
      : players;

    return [...list].sort((a, b) => a.jerseyNumber - b.jerseyNumber);
  }, [players, goaliesOnly]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel - slides up from bottom */}
      <div className="relative mt-auto max-h-[85vh] flex flex-col bg-[var(--color-background)] rounded-t-2xl border-t border-[var(--color-border)] animate-in slide-in-from-bottom duration-200">
        {/* Team color accent bar */}
        <div
          className="h-1 rounded-t-2xl"
          style={{ backgroundColor: teamColor || 'var(--league-primary, #d4af37)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--color-text-primary)]">
              {title || 'Select Player'}
            </h3>
            {/* Team name badge */}
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                backgroundColor: teamColor ? `${teamColor}20` : 'var(--color-surface)',
                color: teamColor || 'var(--color-text-secondary)',
              }}
            >
              {teamName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Skip button - shown at top when allowed */}
        {allowSkip && onSkip && (
          <div className="px-3 pt-2">
            <button
              onClick={onSkip}
              className="w-full py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium active:scale-95 transition-all"
            >
              {skipLabel}
            </button>
          </div>
        )}

        {/* Player Grid */}
        <div className="flex-1 overflow-y-auto px-2 pb-safe">
          {sortedPlayers.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
              No players found
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2">
              {sortedPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => onSelect(player)}
                  className="relative flex min-h-[108px] flex-col items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-3 transition-all duration-150 active:scale-95 hover:border-[var(--color-border-emphasis)] hover:bg-[var(--color-surface-hover,var(--color-surface))]"
                >
                  {player.avatarUrl ? (
                    <Image
                      src={player.avatarUrl}
                      alt={player.fullName}
                      width={22}
                      height={22}
                      className="absolute right-2 top-2 h-5 w-5 rounded-full border object-cover"
                      style={{ borderColor: teamColor || 'var(--color-border)' }}
                    />
                  ) : null}

                  <div
                    className="text-3xl font-black leading-none tabular-nums sm:text-4xl"
                    style={{ color: teamColor || 'var(--color-text-primary)' }}
                  >
                    {player.jerseyNumber}
                  </div>

                  <div className="w-full truncate text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-primary)]">
                    {player.fullName.split(' ').pop()}
                  </div>

                  {/* Position + Captain badges */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      {isGoaliePosition(player.position) ? 'G' : player.position === 'Defense' ? 'D' : 'F'}
                    </span>
                    {player.isCaptain && (
                      <span className="text-[10px] font-bold text-yellow-500">C</span>
                    )}
                    {player.isAssistantCaptain && (
                      <span className="text-[10px] font-bold text-yellow-500/70">A</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
