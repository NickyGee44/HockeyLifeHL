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

type Step = 'scorer' | 'assist1' | 'assist2' | 'confirm';

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
  const [assist2, setAssist2] = useState<PlayerData | null>(null);
  const [isPending, startTransition] = useTransition();

  const skaters = roster.filter(p => p.position !== 'Goalie');

  function handleScorerSelect(player: PlayerData) {
    setScorer(player);
    setStep('assist1');
  }

  function handleAssist1Select(player: PlayerData) {
    setAssist1(player);
    setStep('assist2');
  }

  function handleAssist2Select(player: PlayerData) {
    setAssist2(player);
    setStep('confirm');
  }

  function skipAssists() {
    if (step === 'assist1') {
      setStep('confirm');
    } else if (step === 'assist2') {
      setStep('confirm');
    }
  }

  function submitGoal() {
    if (!scorer) return;

    startTransition(async () => {
      const result = await addGoalEvent({
        gameId,
        teamId,
        teamType,
        scorerId: scorer.id,
        assist1Id: assist1?.id,
        assist2Id: assist2?.id,
        period,
        gameTimeSeconds,
        isPowerPlay,
        isShortHanded,
        isEmptyNet,
      });

      if (result.success) {
        onComplete();
      }
    });
  }

  // Auto-submit after selecting scorer (fast path) or after confirm step
  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-[var(--color-background)] rounded-2xl border border-[var(--color-border)] p-6 animate-in slide-in-from-bottom duration-200">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
            Confirm Goal
          </h3>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--color-text-secondary)] w-16">GOAL</span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                #{scorer?.jerseyNumber} {scorer?.fullName}
              </span>
            </div>
            {assist1 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[var(--color-text-secondary)] w-16">AST 1</span>
                <span className="text-[var(--color-text-primary)]">
                  #{assist1.jerseyNumber} {assist1.fullName}
                </span>
              </div>
            )}
            {assist2 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[var(--color-text-secondary)] w-16">AST 2</span>
                <span className="text-[var(--color-text-primary)]">
                  #{assist2.jerseyNumber} {assist2.fullName}
                </span>
              </div>
            )}

            {/* Flags */}
            <div className="flex flex-wrap gap-2 mt-2">
              {isPowerPlay && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-400">PP</span>
              )}
              {isShortHanded && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400">SH</span>
              )}
              {isEmptyNet && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400">EN</span>
              )}
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
              onClick={submitGoal}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-500 transition-colors active:scale-95 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Confirm Goal'}
            </button>
          </div>
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
    <>
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
        onClose={step === 'scorer' ? onCancel : skipAssists}
        title={title}
      />
      {/* Skip button for assists */}
      {(step === 'assist1' || step === 'assist2') && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] px-4 pb-safe">
          <button
            onClick={skipAssists}
            className="w-full py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium mb-2 active:scale-95 transition-all"
          >
            {step === 'assist1' ? 'Unassisted Goal' : 'No Second Assist'}
          </button>
        </div>
      )}
    </>
  );
}
