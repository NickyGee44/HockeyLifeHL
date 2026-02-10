'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { TeamData, PlayerData } from '@/lib/actions/scorekeeper';

interface ShotEntryModalProps {
  shootingTeam: TeamData;
  defendingTeam: TeamData;
  period: number;
  onSubmit: (data: {
    goalieId: string;
    shotByPlayerId?: string;
    gameTimeSeconds?: number;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ShotEntryModal({
  shootingTeam,
  defendingTeam,
  period,
  onSubmit,
  onCancel,
  isSubmitting,
}: ShotEntryModalProps) {
  const shooters = useMemo(
    () => shootingTeam.roster.filter((p) => p.position !== 'Goalie').sort((a, b) => a.jerseyNumber - b.jerseyNumber),
    [shootingTeam.roster]
  );
  const goalies = useMemo(
    () => defendingTeam.roster.filter((p) => p.position === 'Goalie').sort((a, b) => a.jerseyNumber - b.jerseyNumber),
    [defendingTeam.roster]
  );

  const [shooterId, setShooterId] = useState<string | null>(null);
  const [goalieId, setGoalieId] = useState<string | null>(goalies.length === 1 ? goalies[0].id : null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');

  const filteredShooters = useMemo(() => {
    if (!searchTerm.trim()) return shooters;
    const term = searchTerm.toLowerCase();
    return shooters.filter((player) =>
      player.jerseyNumber.toString().includes(term) ||
      player.fullName.toLowerCase().includes(term)
    );
  }, [shooters, searchTerm]);

  const selectedShooter = shooters.find((p) => p.id === shooterId) || null;
  const selectedGoalie = goalies.find((p) => p.id === goalieId) || null;

  const handleSubmit = async () => {
    if (!goalieId) return;

    const mm = Number.parseInt(timeMinutes || '0', 10);
    const ss = Number.parseInt(timeSeconds || '0', 10);
    const gameTimeSeconds =
      timeMinutes.trim() || timeSeconds.trim()
        ? Math.max(0, mm * 60 + Math.min(59, Math.max(0, ss)))
        : undefined;

    await onSubmit({
      goalieId,
      shotByPlayerId: shooterId || undefined,
      gameTimeSeconds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="bg-neutral-900 w-full md:max-w-3xl md:rounded-2xl border-t md:border border-cyan-500/20 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">Record Shot On Goal</h2>
            <p className="text-sm text-neutral-400">
              {shootingTeam.name} shooting on {defendingTeam.name} - Period {period}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            aria-label="Close shot modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Shooter (Optional)</p>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${shootingTeam.name} shooter`}
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
            <button
              type="button"
              onClick={() => setShooterId(null)}
              className={`mt-2 w-full text-left px-3 py-2 rounded-lg text-sm border ${
                shooterId === null
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300'
              }`}
            >
              Team Shot (no specific shooter)
            </button>
            <div className="mt-2 space-y-2 max-h-56 overflow-auto">
              {filteredShooters.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  selected={player.id === shooterId}
                  onClick={() => setShooterId(player.id)}
                  accentColor={shootingTeam.primaryColor}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Defending Goalie</p>
            {goalies.length === 0 ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100 text-sm">
                No goalie found on {defendingTeam.name} roster.
              </div>
            ) : (
              <div className="space-y-2">
                {goalies.map((goalie) => (
                  <PlayerRow
                    key={goalie.id}
                    player={goalie}
                    selected={goalie.id === goalieId}
                    onClick={() => setGoalieId(goalie.id)}
                    accentColor={defendingTeam.primaryColor}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3">
            <p className="text-sm text-cyan-100 font-semibold">Shot Summary</p>
            <p className="text-sm text-neutral-300 mt-1">
              Shooter: {selectedShooter ? `#${selectedShooter.jerseyNumber} ${selectedShooter.fullName}` : 'Team shot'}
            </p>
            <p className="text-sm text-neutral-300">
              Saved by: {selectedGoalie ? `#${selectedGoalie.jerseyNumber} ${selectedGoalie.fullName}` : 'Not selected'}
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
            disabled={!goalieId || isSubmitting}
            className="flex-1 py-3 px-5 rounded-xl bg-cyan-600 text-white font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Add Shot'}
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
          ? 'bg-cyan-500/10 border-cyan-500/40'
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
