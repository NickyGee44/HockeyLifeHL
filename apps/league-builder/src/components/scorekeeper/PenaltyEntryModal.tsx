'use client';

import { useState } from 'react';
import type { TeamData, PlayerData } from '@/lib/actions/scorekeeper';

interface PenaltyEntryModalProps {
  team: TeamData;
  teamType: 'home' | 'away';
  period: number;
  onSubmit: (data: {
    playerId: string;
    penaltyType: 'minor' | 'major' | 'misconduct' | 'game_misconduct' | 'match';
    penaltyMinutes: number;
    gameTimeSeconds?: number;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

type PenaltyType = 'minor' | 'major' | 'misconduct' | 'game_misconduct' | 'match';

const PENALTY_TYPES: { type: PenaltyType; label: string; minutes: number; description: string }[] = [
  { type: 'minor', label: 'Minor', minutes: 2, description: '2 minutes' },
  { type: 'major', label: 'Major', minutes: 5, description: '5 minutes' },
  { type: 'misconduct', label: 'Misconduct', minutes: 10, description: '10 minutes' },
  { type: 'game_misconduct', label: 'Game Misconduct', minutes: 10, description: 'Ejection' },
  { type: 'match', label: 'Match', minutes: 5, description: 'Ejection + review' },
];

/**
 * Penalty Entry Modal
 * Form for entering penalty details with player and penalty type selection
 */
export function PenaltyEntryModal({
  team,
  teamType,
  period,
  onSubmit,
  onCancel,
  isSubmitting,
}: PenaltyEntryModalProps) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('minor');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');

  const selectedPlayer = team.roster.find(p => p.id === playerId);
  const selectedPenalty = PENALTY_TYPES.find(p => p.type === penaltyType)!;

  // Filter players based on search
  const filteredPlayers = team.roster.filter(player => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      player.jerseyNumber.toString().includes(term) ||
      player.fullName.toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    if (!searchTerm) return a.jerseyNumber - b.jerseyNumber;
    const aJerseyMatch = a.jerseyNumber.toString().startsWith(searchTerm);
    const bJerseyMatch = b.jerseyNumber.toString().startsWith(searchTerm);
    if (aJerseyMatch && !bJerseyMatch) return -1;
    if (!aJerseyMatch && bJerseyMatch) return 1;
    return a.jerseyNumber - b.jerseyNumber;
  });

  const handleSubmit = async () => {
    if (!playerId) return;

    const gameTimeSeconds = timeMinutes || timeSeconds
      ? (parseInt(timeMinutes || '0') * 60) + parseInt(timeSeconds || '0')
      : undefined;

    await onSubmit({
      playerId,
      penaltyType,
      penaltyMinutes: selectedPenalty.minutes,
      gameTimeSeconds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="bg-neutral-900 w-full md:max-w-lg md:rounded-2xl border-t md:border border-red-500/20 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">Add Penalty</h2>
            <p className="text-sm text-neutral-400">
              {team.name} • Period {period}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-neutral-400 hover:text-white transition-colors touch-manipulation"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Player Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Player
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Search by jersey # or name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-950 border border-red-500/30 rounded-xl
                text-white placeholder-neutral-500
                focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none
                transition-all duration-200 mb-3"
              autoFocus
            />

            {selectedPlayer && (
              <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-red-400 font-bold text-lg">
                    #{selectedPlayer.jerseyNumber}
                  </span>
                  <span className="text-white font-medium">{selectedPlayer.fullName}</span>
                </div>
                <button
                  onClick={() => setPlayerId(null)}
                  className="text-red-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-auto">
              {filteredPlayers.map((player) => (
                <PlayerButton
                  key={player.id}
                  player={player}
                  isSelected={playerId === player.id}
                  onClick={() => setPlayerId(player.id)}
                  color={team.primaryColor}
                />
              ))}
            </div>
          </div>

          {/* Penalty Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-3">
              Penalty Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PENALTY_TYPES.map((penalty) => (
                <button
                  key={penalty.type}
                  onClick={() => setPenaltyType(penalty.type)}
                  className={`p-4 rounded-xl text-left transition-all duration-200 touch-manipulation
                    ${penaltyType === penalty.type
                      ? 'bg-red-500/20 border-2 border-red-500'
                      : 'bg-neutral-800 border border-neutral-700 hover:border-neutral-600'
                    }
                  `}
                >
                  <span className={`block font-semibold ${penaltyType === penalty.type ? 'text-red-400' : 'text-white'}`}>
                    {penalty.label}
                  </span>
                  <span className="block text-sm text-neutral-400 mt-0.5">
                    {penalty.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Time (optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="MM"
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(e.target.value)}
                min="0"
                max="20"
                className="w-20 px-3 py-2 bg-neutral-950 border border-red-500/30 rounded-lg
                  text-white text-center
                  focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
              />
              <span className="text-neutral-400">:</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="SS"
                value={timeSeconds}
                onChange={(e) => setTimeSeconds(e.target.value)}
                min="0"
                max="59"
                className="w-20 px-3 py-2 bg-neutral-950 border border-red-500/30 rounded-lg
                  text-white text-center
                  focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 px-6 bg-neutral-800 text-white font-semibold rounded-xl
              hover:bg-neutral-700 transition-colors touch-manipulation min-h-[56px]"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!playerId || isSubmitting}
            className="flex-1 py-4 px-6 bg-red-600 text-white font-semibold rounded-xl
              hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors touch-manipulation min-h-[56px]"
          >
            {isSubmitting ? 'Saving...' : 'Add Penalty'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Player Button Component
function PlayerButton({
  player,
  isSelected,
  onClick,
  color,
}: {
  player: PlayerData;
  isSelected: boolean;
  onClick: () => void;
  color: string | null;
}) {
  const teamColor = color || '#22D3EE';

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl text-center transition-all duration-200 touch-manipulation min-h-[72px]
        ${isSelected
          ? 'border-2'
          : 'border border-neutral-700 hover:border-neutral-600'
        }
      `}
      style={{
        backgroundColor: isSelected ? `${teamColor}20` : 'transparent',
        borderColor: isSelected ? teamColor : undefined,
      }}
    >
      <span
        className="block text-xl font-bold"
        style={{ color: isSelected ? teamColor : '#fafafa' }}
      >
        {player.jerseyNumber}
      </span>
      <span className="block text-xs text-neutral-400 truncate mt-1">
        {player.fullName.split(' ').pop()}
      </span>
    </button>
  );
}
