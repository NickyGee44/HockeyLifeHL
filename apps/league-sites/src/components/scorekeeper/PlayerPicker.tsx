'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { PlayerData } from '@/lib/actions/scorekeeper';

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
}

export function PlayerPicker({
  players,
  teamName,
  teamColor,
  onSelect,
  onClose,
  goaliesOnly = false,
  title,
}: PlayerPickerProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredPlayers = useMemo(() => {
    let list = goaliesOnly
      ? players.filter(p => p.position === 'Goalie')
      : players;

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      list = list.filter(
        p =>
          p.fullName.toLowerCase().includes(query) ||
          p.jerseyNumber.toString().includes(query)
      );
    }

    return list;
  }, [players, search, goaliesOnly]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel - slides up from bottom */}
      <div className="relative mt-auto max-h-[80vh] flex flex-col bg-[var(--color-background)] rounded-t-2xl border-t border-[var(--color-border)] animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)]">
              {title || `Select Player - ${teamName}`}
            </h3>
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

        {/* Search */}
        <div className="px-4 py-2">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or number..."
            className="w-full px-3 py-2.5 text-sm rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--league-primary,#d4af37)] focus:border-transparent"
          />
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto px-2 pb-safe">
          {filteredPlayers.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
              No players found
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2">
              {filteredPlayers.map(player => (
                <button
                  key={player.id}
                  onClick={() => onSelect(player)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-emphasis)] hover:bg-[var(--color-surface-hover,var(--color-surface))] transition-all duration-150 active:scale-95 text-left"
                >
                  {/* Jersey Number */}
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm flex-shrink-0"
                    style={{
                      backgroundColor: teamColor ? `${teamColor}20` : 'var(--color-surface)',
                      color: teamColor || 'var(--color-text-primary)',
                    }}
                  >
                    #{player.jerseyNumber}
                  </div>

                  {/* Name & Position */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {player.fullName}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {player.position}
                      {player.isCaptain && ' (C)'}
                      {player.isAssistantCaptain && ' (A)'}
                    </div>
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
