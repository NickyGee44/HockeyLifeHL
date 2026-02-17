'use client';

import { useState } from 'react';
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
  const [isPending, setIsPending] = useState(false);

  // If only one goalie, skip to shooter selection
  if (step === 'goalie' && goalies.length === 1 && !goalie) {
    setGoalie(goalies[0]);
    setStep('shooter');
  }

  function handleGoalieSelect(g: PlayerData) {
    setGoalie(g);
    setStep('shooter');
  }

  async function handleShooterSelect(shooter: PlayerData) {
    if (!goalie || isPending) return;
    setIsPending(true);
    try {
      await addShotEvent({
        gameId,
        teamId: defendingTeamId,
        teamType: defendingTeamType,
        goalieId: goalie.id,
        shotByPlayerId: shooter.id,
        period,
        gameTimeSeconds,
      });
    } catch (err) {
      console.error('Failed to save shot:', err);
    }
    onComplete();
  }

  async function handleQuickSave() {
    // Record save without specifying shooter
    if (!goalie || isPending) return;
    setIsPending(true);
    try {
      await addShotEvent({
        gameId,
        teamId: defendingTeamId,
        teamType: defendingTeamType,
        goalieId: goalie.id,
        period,
        gameTimeSeconds,
      });
    } catch (err) {
      console.error('Failed to save shot:', err);
    }
    onComplete();
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

  // Shooter selection (optional) — uses skip button inside PlayerPicker
  const skaters = shootingRoster.filter(p => p.position !== 'Goalie');

  return (
    <PlayerPicker
      players={skaters}
      teamName={shootingTeamName}
      teamColor={shootingTeamColor}
      onSelect={handleShooterSelect}
      onClose={handleQuickSave}
      title="Shot by (optional)"
      allowSkip
      skipLabel={isPending ? 'Saving...' : 'Save Without Shooter'}
      onSkip={handleQuickSave}
    />
  );
}
