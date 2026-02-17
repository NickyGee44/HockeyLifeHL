'use client';

import { useState, useTransition } from 'react';
import type { PlayerData } from '@/lib/actions/scorekeeper';
import { addGoalEvent } from '@/lib/actions/scorekeeper';
import { PlayerPicker } from './PlayerPicker';

interface GoalEntryProps {
  gameId: string;
  teamId: string;
  teamType: 'home' | 'away';
  teamName: string;
  teamColor?: string | null;
  roster: PlayerData[];
  period: number;
  gameTimeSeconds: number;
  isPowerPlay: boolean;
  isShortHanded: boolean;
  isEmptyNet: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

type Step = 'scorer' | 'assist1' | 'assist2';

export function GoalEntry({
  gameId,
  teamId,
  teamType,
  teamName,
  teamColor,
  roster,
  period,
  gameTimeSeconds,
  isPowerPlay,
  isShortHanded,
  isEmptyNet,
  onComplete,
  onCancel,
}: GoalEntryProps) {
  const [step, setStep] = useState<Step>('scorer');
  const [scorer, setScorer] = useState<PlayerData | null>(null);
  const [assist1, setAssist1] = useState<PlayerData | null>(null);
  const [isPending, startTransition] = useTransition();

  const skaters = roster.filter(p => p.position !== 'Goalie');

  function submitGoal(scorerPlayer: PlayerData, a1?: PlayerData | null, a2?: PlayerData | null) {
    startTransition(async () => {
      const result = await addGoalEvent({
        gameId,
        teamId,
        teamType,
        scorerId: scorerPlayer.id,
        assist1Id: a1?.id,
        assist2Id: a2?.id,
        period,
        gameTimeSeconds,
        isPowerPlay,
        isShortHanded,
        isEmptyNet,
      });

      if (!result.success) {
        console.error('Failed to save goal:', result.error);
      }
      onComplete();
    });
  }

  function handleScorerSelect(player: PlayerData) {
    setScorer(player);
    setStep('assist1');
  }

  function handleAssist1Select(player: PlayerData) {
    setAssist1(player);
    setStep('assist2');
  }

  function handleAssist2Select(player: PlayerData) {
    // Auto-save immediately
    if (scorer) {
      submitGoal(scorer, assist1, player);
    }
  }

  function skipAssist1() {
    // Unassisted goal — auto-save
    if (scorer) {
      submitGoal(scorer);
    }
  }

  function skipAssist2() {
    // No second assist — auto-save
    if (scorer) {
      submitGoal(scorer, assist1);
    }
  }

  if (isPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-[var(--color-background)] rounded-2xl p-6 text-center animate-in zoom-in-95 duration-150">
          <div className="text-2xl mb-2">&#127946;</div>
          <p className="font-semibold text-[var(--color-text-primary)]">Saving goal...</p>
        </div>
      </div>
    );
  }

  // Player selection steps
  const availablePlayers = step === 'assist1'
    ? skaters.filter(p => p.id !== scorer?.id)
    : step === 'assist2'
      ? skaters.filter(p => p.id !== scorer?.id && p.id !== assist1?.id)
      : skaters;

  const title = step === 'scorer'
    ? `Goal Scorer - ${teamName}`
    : step === 'assist1'
      ? `Primary Assist (optional)`
      : `Secondary Assist (optional)`;

  return (
    <PlayerPicker
      players={availablePlayers}
      teamName={teamName}
      teamColor={teamColor}
      onSelect={
        step === 'scorer'
          ? handleScorerSelect
          : step === 'assist1'
            ? handleAssist1Select
            : handleAssist2Select
      }
      onClose={step === 'scorer' ? onCancel : step === 'assist1' ? skipAssist1 : skipAssist2}
      title={title}
      allowSkip={step === 'assist1' || step === 'assist2'}
      skipLabel={step === 'assist1' ? 'Unassisted Goal' : 'No Second Assist'}
      onSkip={step === 'assist1' ? skipAssist1 : skipAssist2}
    />
  );
}
