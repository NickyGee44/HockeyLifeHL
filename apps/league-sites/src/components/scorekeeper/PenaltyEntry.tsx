'use client';

import { useState, useTransition } from 'react';
import type { PlayerData } from '@/lib/actions/scorekeeper';
import { addPenaltyEvent } from '@/lib/actions/scorekeeper';
import { PlayerPicker } from './PlayerPicker';

interface PenaltyEntryProps {
  gameId: string;
  teamId: string;
  teamType: 'home' | 'away';
  teamName: string;
  teamColor?: string | null;
  roster: PlayerData[];
  period: number;
  gameTimeSeconds: number;
  onComplete: () => void;
  onCancel: () => void;
}

const COMMON_PENALTIES = [
  { type: 'Tripping', minutes: 2 },
  { type: 'Hooking', minutes: 2 },
  { type: 'Holding', minutes: 2 },
  { type: 'Slashing', minutes: 2 },
  { type: 'Interference', minutes: 2 },
];

const ALL_PENALTIES = [
  { type: 'Tripping', minutes: 2 },
  { type: 'Hooking', minutes: 2 },
  { type: 'Holding', minutes: 2 },
  { type: 'Slashing', minutes: 2 },
  { type: 'Interference', minutes: 2 },
  { type: 'High Sticking', minutes: 2 },
  { type: 'Roughing', minutes: 2 },
  { type: 'Cross-Checking', minutes: 2 },
  { type: 'Boarding', minutes: 2 },
  { type: 'Elbowing', minutes: 2 },
  { type: 'Charging', minutes: 2 },
  { type: 'Delay of Game', minutes: 2 },
  { type: 'Too Many Men', minutes: 2 },
  { type: 'Unsportsmanlike Conduct', minutes: 2 },
  { type: 'High Sticking (Double)', minutes: 4 },
  { type: 'Spearing', minutes: 5 },
  { type: 'Fighting', minutes: 5 },
  { type: 'Checking from Behind', minutes: 5 },
  { type: 'Game Misconduct', minutes: 10 },
  { type: 'Match Penalty', minutes: 5 },
];

type Step = 'player' | 'penalty' | 'confirm';

export function PenaltyEntry({
  gameId,
  teamId,
  teamType,
  teamName,
  teamColor,
  roster,
  period,
  gameTimeSeconds,
  onComplete,
  onCancel,
}: PenaltyEntryProps) {
  const [step, setStep] = useState<Step>('player');
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [penaltyType, setPenaltyType] = useState<string | null>(null);
  const [penaltyMinutes, setPenaltyMinutes] = useState<number>(2);
  const [showAllPenalties, setShowAllPenalties] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handlePlayerSelect(p: PlayerData) {
    setPlayer(p);
    setStep('penalty');
  }

  function handlePenaltySelect(type: string, minutes: number) {
    setPenaltyType(type);
    setPenaltyMinutes(minutes);
    setStep('confirm');
  }

  function submitPenalty() {
    if (!player || !penaltyType) return;

    startTransition(async () => {
      const result = await addPenaltyEvent({
        gameId,
        teamId,
        teamType,
        playerId: player.id,
        period,
        gameTimeSeconds,
        penaltyType,
        penaltyMinutes,
      });

      if (result.success) {
        onComplete();
      }
    });
  }

  if (step === 'player') {
    return (
      <PlayerPicker
        players={roster}
        teamName={teamName}
        teamColor={teamColor}
        onSelect={handlePlayerSelect}
        onClose={onCancel}
        title={`Penalty - Select Player`}
      />
    );
  }

  if (step === 'penalty') {
    const penalties = showAllPenalties ? ALL_PENALTIES : COMMON_PENALTIES;

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)] animate-in slide-in-from-bottom duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text-primary)]">
              #{player?.jerseyNumber} {player?.fullName}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">Select penalty type</p>
          </div>

          {/* Penalty List */}
          <div className="max-h-[50vh] overflow-y-auto p-2">
            <div className="space-y-1">
              {penalties.map(p => (
                <button
                  key={p.type}
                  onClick={() => handlePenaltySelect(p.type, p.minutes)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[var(--color-surface)] transition-colors text-left active:scale-[0.98]"
                >
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {p.type}
                  </span>
                  <span className={`
                    text-xs font-bold px-2 py-0.5 rounded-full
                    ${p.minutes >= 5
                      ? 'bg-red-500/10 text-red-400'
                      : p.minutes === 4
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }
                  `}>
                    {p.minutes} min
                  </span>
                </button>
              ))}
            </div>

            {!showAllPenalties && (
              <button
                onClick={() => setShowAllPenalties(true)}
                className="w-full py-3 mt-2 text-sm text-[var(--league-primary,#d4af37)] font-medium hover:underline"
              >
                Show all penalties
              </button>
            )}
          </div>

          {/* Cancel */}
          <div className="px-4 py-3 border-t border-[var(--color-border)]">
            <button
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm font-medium hover:bg-[var(--color-surface)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirm
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)] p-6 animate-in slide-in-from-bottom duration-200">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
          Confirm Penalty
        </h3>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] w-16">PLAYER</span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              #{player?.jerseyNumber} {player?.fullName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] w-16">TYPE</span>
            <span className="text-[var(--color-text-primary)]">{penaltyType}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] w-16">TIME</span>
            <span className="text-[var(--color-text-primary)]">{penaltyMinutes} minutes</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium hover:bg-[var(--color-surface)] transition-colors"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={submitPenalty}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl bg-yellow-600 text-white font-semibold hover:bg-yellow-500 transition-colors active:scale-95 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Confirm Penalty'}
          </button>
        </div>
      </div>
    </div>
  );
}
