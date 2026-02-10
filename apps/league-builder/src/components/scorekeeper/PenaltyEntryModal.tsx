'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { TeamData, PlayerData } from '@/lib/actions/scorekeeper';

interface PenaltyEntryModalProps {
  team: TeamData;
  teamType: 'home' | 'away';
  period: number;
  onSubmit: (data: {
    playerId: string;
    penaltyType: string;
    penaltyMinutes: number;
    gameTimeSeconds?: number;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

type PenaltyPreset = {
  key: string;
  label: string;
  minutes: number;
  family: 'minor' | 'major' | 'misconduct' | 'game_misconduct' | 'match';
};

const PENALTY_PRESETS: PenaltyPreset[] = [
  { key: 'minor_tripping', label: 'Tripping', minutes: 2, family: 'minor' },
  { key: 'minor_hooking', label: 'Hooking', minutes: 2, family: 'minor' },
  { key: 'minor_slashing', label: 'Slashing', minutes: 2, family: 'minor' },
  { key: 'minor_interference', label: 'Interference', minutes: 2, family: 'minor' },
  { key: 'minor_holding', label: 'Holding', minutes: 2, family: 'minor' },
  { key: 'minor_cross_checking', label: 'Cross-Checking', minutes: 2, family: 'minor' },
  { key: 'minor_high_sticking', label: 'High-Sticking', minutes: 2, family: 'minor' },
  { key: 'minor_roughing', label: 'Roughing', minutes: 2, family: 'minor' },
  { key: 'minor_unsportsmanlike', label: 'Unsportsmanlike Conduct', minutes: 2, family: 'minor' },
  { key: 'major_fighting', label: 'Fighting', minutes: 5, family: 'major' },
  { key: 'major_boarding', label: 'Boarding', minutes: 5, family: 'major' },
  { key: 'major_charging', label: 'Charging', minutes: 5, family: 'major' },
  { key: 'major_elbowing', label: 'Elbowing', minutes: 5, family: 'major' },
  { key: 'misconduct_ten', label: 'Misconduct', minutes: 10, family: 'misconduct' },
  { key: 'game_misconduct', label: 'Game Misconduct', minutes: 10, family: 'game_misconduct' },
  { key: 'match_penalty', label: 'Match Penalty', minutes: 5, family: 'match' },
];

export function PenaltyEntryModal({
  team,
  period,
  onSubmit,
  onCancel,
  isSubmitting,
}: PenaltyEntryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [presetKey, setPresetKey] = useState<string>('minor_tripping');
  const [customMinutes, setCustomMinutes] = useState('');
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');

  const roster = useMemo(
    () => [...team.roster].sort((a, b) => a.jerseyNumber - b.jerseyNumber),
    [team.roster]
  );

  const filteredRoster = useMemo(() => {
    if (!searchTerm.trim()) return roster;
    const term = searchTerm.toLowerCase();
    return roster.filter((player) =>
      player.jerseyNumber.toString().includes(term) ||
      player.fullName.toLowerCase().includes(term) ||
      player.position.toLowerCase().includes(term)
    );
  }, [roster, searchTerm]);

  const selectedPlayer = roster.find((p) => p.id === playerId) || null;
  const selectedPreset = PENALTY_PRESETS.find((p) => p.key === presetKey) || PENALTY_PRESETS[0];

  const handleSubmit = async () => {
    if (!playerId) return;

    const mm = Number.parseInt(timeMinutes || '0', 10);
    const ss = Number.parseInt(timeSeconds || '0', 10);
    const gameTimeSeconds =
      timeMinutes.trim() || timeSeconds.trim()
        ? Math.max(0, mm * 60 + Math.min(59, Math.max(0, ss)))
        : undefined;

    const minutes = customMinutes.trim() ? Number.parseInt(customMinutes, 10) : selectedPreset.minutes;
    const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : selectedPreset.minutes;

    await onSubmit({
      playerId,
      penaltyType: `${selectedPreset.family}:${selectedPreset.label}`,
      penaltyMinutes: safeMinutes,
      gameTimeSeconds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="bg-neutral-900 w-full md:max-w-3xl md:rounded-2xl border-t md:border border-red-500/20 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">Record Penalty</h2>
            <p className="text-sm text-neutral-400">
              {team.name} - Period {period}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            aria-label="Close penalty modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Select Player</p>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by jersey, name, position"
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
            <div className="mt-3 space-y-2 max-h-64 overflow-auto">
              {filteredRoster.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  selected={player.id === playerId}
                  onClick={() => setPlayerId(player.id)}
                  accentColor={team.primaryColor}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Penalty Type</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PENALTY_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setPresetKey(preset.key)}
                  className={`text-left px-3 py-2 rounded-lg border ${
                    preset.key === presetKey
                      ? 'bg-red-500/20 border-red-500/40 text-red-200'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{preset.label}</p>
                  <p className="text-xs opacity-80">{preset.minutes} min</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3">
              <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Minutes</p>
              <input
                type="number"
                min={1}
                max={25}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder={`${selectedPreset.minutes}`}
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
              />
            </div>
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3">
              <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Minute</p>
              <input
                type="number"
                min={0}
                max={99}
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(e.target.value)}
                placeholder="MM"
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
              />
            </div>
            <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3">
              <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Second</p>
              <input
                type="number"
                min={0}
                max={59}
                value={timeSeconds}
                onChange={(e) => setTimeSeconds(e.target.value)}
                placeholder="SS"
                className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white"
              />
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
            <p className="text-sm text-red-100 font-semibold">Penalty Summary</p>
            <p className="text-sm text-neutral-300 mt-1">
              Player: {selectedPlayer ? `#${selectedPlayer.jerseyNumber} ${selectedPlayer.fullName}` : 'Not selected'}
            </p>
            <p className="text-sm text-neutral-300">
              Type: {selectedPreset.label}
              {customMinutes.trim() ? ` (${customMinutes} min)` : ` (${selectedPreset.minutes} min)`}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-800 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-5 rounded-xl bg-neutral-800 text-white font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!playerId || isSubmitting}
            className="flex-1 py-3 px-5 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Add Penalty'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  selected,
  onClick,
  accentColor,
}: {
  player: PlayerData;
  selected: boolean;
  onClick: () => void;
  accentColor: string | null;
}) {
  const color = accentColor || '#22D3EE';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2 flex items-center gap-3 text-left transition-colors ${
        selected
          ? 'bg-red-500/10 border-red-500/40'
          : 'bg-neutral-800 border-neutral-700 hover:border-neutral-600'
      }`}
    >
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0">
        {player.avatarUrl ? (
          <Image src={player.avatarUrl} alt={player.fullName} fill sizes="40px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-neutral-200">
            {player.fullName.split(' ').map((x) => x[0]).join('').slice(0, 2)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{player.fullName}</p>
        <p className="text-xs text-neutral-400">#{player.jerseyNumber} - {player.position}</p>
      </div>
      <div
        className="text-xs font-bold px-2 py-1 rounded-md border"
        style={{ color, borderColor: `${color}66`, backgroundColor: `${color}14` }}
      >
        #{player.jerseyNumber}
      </div>
    </button>
  );
}
