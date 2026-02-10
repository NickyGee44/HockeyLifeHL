'use client';

import { useState, useTransition } from 'react';
import type { PlayerData } from '@/lib/actions/scorekeeper';
import { addShotEvent } from '@/lib/actions/scorekeeper';
import { PlayerPicker } from './PlayerPicker';

interface ShotEntryProps {
  gameId: string;
  /** The team whose goalie made the save (defending team) */
  defendingTeamId: string;
  defendingTeamType: 'home' | 'away';
  /** Goalie roster from defending team */
  goalies: PlayerData[];
  /** Skaters from the shooting team */
  shootingRoster: PlayerData[];
  shootingTeamName: string;
  shootingTeamColor?: string | null;
  period: number;
  gameTimeSeconds: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function ShotEntry({
  gameId,
  defendingTeamId,
  defendingTeamType,
  goalies,
  shootingRoster,
  shootingTeamName,
  shootingTeamColor,
  period,
  gameTimeSeconds,
  onComplete,
  onCancel,
}: ShotEntryProps) {
  const [step, setStep] = useState<'goalie' | 'shooter'>('goalie');
  const [goalie, setGoalie] = useState<PlayerData | null>(
    // Auto-select if only one goalie
    goalies.length === 1 ? goalies[0] : null
  );
  const [isPending, startTransition] = useTransition();

  // If only one goalie, skip to shooter selection
  if (step === 'goalie' && goalies.length === 1 && !goalie) {
    setGoalie(goalies[0]);
    setStep('shooter');
  }

  function handleGoalieSelect(g: PlayerData) {
    setGoalie(g);
    setStep('shooter');
  }

  function handleShooterSelect(shooter: PlayerData) {
    if (!goalie) return;

    startTransition(async () => {
      const result = await addShotEvent({
        gameId,
        teamId: defendingTeamId,
        teamType: defendingTeamType,
        goalieId: goalie.id,
        shotByPlayerId: shooter.id,
        period,
        gameTimeSeconds,
      });

      if (result.success) {
        onComplete();
      }
    });
  }

  function handleQuickSave() {
    // Record save without specifying shooter
    if (!goalie) return;

    startTransition(async () => {
      const result = await addShotEvent({
        gameId,
        teamId: defendingTeamId,
        teamType: defendingTeamType,
        goalieId: goalie.id,
        period,
        gameTimeSeconds,
      });

      if (result.success) {
        onComplete();
      }
    });
  }

  if (step === 'goalie' && goalies.length > 1) {
    return (
      <PlayerPicker
        players={goalies}
        teamName="Select Goalie"
        onSelect={handleGoalieSelect}
        onClose={onCancel}
        goaliesOnly
        title="Which goalie made the save?"
      />
    );
  }

  // Shooter selection (optional)
  const skaters = shootingRoster.filter(p => p.position !== 'Goalie');

  return (
    <>
      <PlayerPicker
        players={skaters}
        teamName={shootingTeamName}
        teamColor={shootingTeamColor}
        onSelect={handleShooterSelect}
        onClose={handleQuickSave}
        title="Shot by (optional)"
      />
      {/* Quick save button */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-safe">
        <button
          onClick={handleQuickSave}
          disabled={isPending}
          className="w-full py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium mb-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save without shooter'}
        </button>
      </div>
    </>
  );
}
