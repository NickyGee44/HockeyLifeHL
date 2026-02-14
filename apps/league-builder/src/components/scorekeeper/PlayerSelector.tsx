'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { usePlayerSearch, type Player, type Team } from '@/lib/scorekeeper';
import { cn } from '@hockey-life/ui';

interface PlayerSelectorProps {
  teamId: string;
  team?: Team;
  onSelect: (player: Player) => void;
  onCancel?: () => void;
  excludePlayerIds?: string[];
  label?: string;
  placeholder?: string;
}

/**
 * PlayerSelector - Quick player selection via jersey number
 * iPad-optimized with large touch targets
 * Features:
 * - Jersey number search (primary)
 * - Name search (secondary)
 * - Quick-tap number pad for fast entry
 */
export function PlayerSelector({
  teamId,
  team,
  onSelect,
  onCancel,
  excludePlayerIds = [],
  label,
  placeholder }: PlayerSelectorProps) {
  const t = useTranslations('scorekeeper.playerSelector');
  const resolvedLabel = label ?? t('selectPlayer');
  const resolvedPlaceholder = placeholder ?? t('jerseyOrName');
  const { players, searchTerm, setSearchTerm } = usePlayerSearch(teamId);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter out excluded players
  const availablePlayers = players.filter(
    (p) => !excludePlayerIds.includes(p.id)
  );

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle number pad input
  const handleNumberPad = useCallback((digit: string) => {
    if (digit === 'clear') {
      setSearchTerm('');
    } else if (digit === 'backspace') {
      setSearchTerm((prev) => prev.slice(0, -1));
    } else {
      setSearchTerm((prev) => prev + digit);
    }
  }, [setSearchTerm]);

  const teamColor = team?.primary_color || '#22D3EE';

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{resolvedLabel}</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-white p-2 -mr-2 touch-manipulation"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-neutral-800">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={resolvedPlaceholder}
            className={cn(
              'w-full px-4 py-4 text-xl font-mono',
              'bg-neutral-950 border border-neutral-700 rounded-xl',
              'text-white placeholder:text-neutral-500',
              'focus:outline-none focus:border-rink-500 focus:ring-1 focus:ring-rink-500',
              'touch-manipulation'
            )}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Quick Number Pad */}
      <div className="p-3 border-b border-neutral-800 bg-neutral-950/50">
        <div className="grid grid-cols-6 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleNumberPad(digit)}
              className={cn(
                'h-14 rounded-xl font-bold text-xl transition-all touch-manipulation',
                digit === 'clear'
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : digit === 'backspace'
                  ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                  : 'bg-neutral-800 text-white hover:bg-neutral-700 active:bg-rink-500/20 active:text-rink-400'
              )}
            >
              {digit === 'clear' ? (
                'C'
              ) : digit === 'backspace' ? (
                <svg className="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              ) : (
                digit
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Player List */}
      <div className="max-h-[300px] overflow-y-auto">
        {availablePlayers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-neutral-400">
              {searchTerm ? t('noPlayersFound') : t('noPlayersAvailable')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {availablePlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => onSelect(player)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 text-left transition-all touch-manipulation',
                  'hover:bg-neutral-800 active:bg-rink-500/10'
                )}
              >
                {/* Jersey Number */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${teamColor}20` }}
                >
                  <span
                    className="text-2xl font-black"
                    style={{ color: teamColor }}
                  >
                    {player.jersey_number}
                  </span>
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {player.full_name}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {player.position}
                  </p>
                </div>

                {/* Select Indicator */}
                <svg
                  className="w-5 h-5 text-neutral-600 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact player chip for displaying selected players
 */
interface PlayerChipProps {
  player: Player;
  team?: Team;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayerChip({ player, team, onRemove, size = 'md' }: PlayerChipProps) {
  const teamColor = team?.primary_color || '#22D3EE';

  const sizeClasses = {
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-2 px-3',
    lg: 'text-lg py-3 px-4' };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-xl',
        sizeClasses[size]
      )}
      style={{ backgroundColor: `${teamColor}15`, borderColor: `${teamColor}30` }}
    >
      <span
        className="font-black"
        style={{ color: teamColor }}
      >
        #{player.jersey_number}
      </span>
      <span className="text-white font-medium">{player.full_name}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 text-neutral-400 hover:text-white touch-manipulation"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
