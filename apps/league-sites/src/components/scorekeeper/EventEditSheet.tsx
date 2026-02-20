'use client';

import { useState } from 'react';
import type { GameData, PlayerData } from '@/lib/actions/scorekeeper';
import type { ExtractedEvent, ExtractedGoal, ExtractedPenalty } from './ScoreSheetUpload';
import { PlayerPicker } from './PlayerPicker';
import { DEFAULT_PENALTIES } from './PenaltyEntry';

interface EventEditSheetProps {
  event: ExtractedEvent;
  game: GameData;
  onSave: (updated: ExtractedEvent) => void;
  onClose: () => void;
}

type PickingField = 'scorer' | 'assist1' | 'assist2' | 'player' | null;

const PERIOD_OPTIONS = [1, 2, 3] as const;
const PENALTY_MINUTES = [2, 4, 5, 10] as const;

export function EventEditSheet({ event, game, onSave, onClose }: EventEditSheetProps) {
  const isGoal = event.kind === 'goal';

  // Local edit state — only committed on "Done"
  const [teamType, setTeamType] = useState<'home' | 'away'>(event.data.teamType);
  const [period, setPeriod] = useState(event.data.period);
  const [timeMinutes, setTimeMinutes] = useState(event.data.timeMinutes.toString());
  const [timeSeconds, setTimeSeconds] = useState(event.data.timeSeconds.toString().padStart(2, '0'));

  // Goal-specific state
  const [scorerJersey, setScorerJersey] = useState(
    isGoal ? (event.data as ExtractedGoal).scorerJersey : 0
  );
  const [assist1Jersey, setAssist1Jersey] = useState<number | null>(
    isGoal ? (event.data as ExtractedGoal).assist1Jersey : null
  );
  const [assist2Jersey, setAssist2Jersey] = useState<number | null>(
    isGoal ? (event.data as ExtractedGoal).assist2Jersey : null
  );

  // Penalty-specific state
  const [playerJersey, setPlayerJersey] = useState(
    !isGoal ? (event.data as ExtractedPenalty).playerJersey : 0
  );
  const [penaltyType, setPenaltyType] = useState(
    !isGoal ? (event.data as ExtractedPenalty).type : ''
  );
  const [penaltyMinutes, setPenaltyMinutes] = useState(
    !isGoal ? (event.data as ExtractedPenalty).minutes : 2
  );

  const [pickingField, setPickingField] = useState<PickingField>(null);
  const [showPenaltyPicker, setShowPenaltyPicker] = useState(false);

  const currentRoster = teamType === 'home' ? game.homeTeam.roster : game.awayTeam.roster;
  const currentTeamName = teamType === 'home'
    ? (game.homeTeam.shortName || game.homeTeam.name)
    : (game.awayTeam.shortName || game.awayTeam.name);

  function findName(jersey: number | null): string | null {
    if (jersey == null) return null;
    const player = currentRoster.find((p: PlayerData) => p.jerseyNumber === jersey);
    return player?.fullName || null;
  }

  function jerseyWarning(jersey: number | null): boolean {
    if (jersey == null) return false;
    return !currentRoster.some((p: PlayerData) => p.jerseyNumber === jersey);
  }

  function handlePlayerPick(player: PlayerData) {
    switch (pickingField) {
      case 'scorer':
        setScorerJersey(player.jerseyNumber);
        break;
      case 'assist1':
        setAssist1Jersey(player.jerseyNumber);
        break;
      case 'assist2':
        setAssist2Jersey(player.jerseyNumber);
        break;
      case 'player':
        setPlayerJersey(player.jerseyNumber);
        break;
    }
    setPickingField(null);
  }

  function handleDone() {
    const mins = parseInt(timeMinutes) || 0;
    const secs = Math.min(59, parseInt(timeSeconds) || 0);

    if (isGoal) {
      const updated: ExtractedEvent = {
        kind: 'goal',
        id: event.id,
        data: {
          period,
          timeMinutes: mins,
          timeSeconds: secs,
          teamType,
          scorerJersey,
          assist1Jersey,
          assist2Jersey,
          confidence: 1.0, // User-edited = full confidence
        },
      };
      onSave(updated);
    } else {
      const updated: ExtractedEvent = {
        kind: 'penalty',
        id: event.id,
        data: {
          period,
          timeMinutes: mins,
          timeSeconds: secs,
          teamType,
          playerJersey,
          type: penaltyType,
          minutes: penaltyMinutes,
          confidence: 1.0,
        },
      };
      onSave(updated);
    }
  }

  // PlayerPicker overlay
  if (pickingField) {
    const titles: Record<string, string> = {
      scorer: 'Select Scorer',
      assist1: 'Select Assist 1',
      assist2: 'Select Assist 2',
      player: 'Select Player',
    };

    const isAssist = pickingField === 'assist1' || pickingField === 'assist2';

    return (
      <PlayerPicker
        players={currentRoster}
        teamName={currentTeamName}
        teamColor={teamType === 'home' ? game.homeTeam.primaryColor : game.awayTeam.primaryColor}
        onSelect={handlePlayerPick}
        onClose={() => setPickingField(null)}
        title={titles[pickingField]}
        allowSkip={isAssist}
        skipLabel="No Assist"
        onSkip={() => {
          if (pickingField === 'assist1') setAssist1Jersey(null);
          if (pickingField === 'assist2') setAssist2Jersey(null);
          setPickingField(null);
        }}
      />
    );
  }

  // Penalty type picker overlay
  if (showPenaltyPicker) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPenaltyPicker(false)} />
        <div className="relative mt-auto max-h-[70vh] flex flex-col bg-[var(--color-background)] rounded-t-2xl border-t border-[var(--color-border)] animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text-primary)]">Select Penalty</h3>
            <button
              onClick={() => setShowPenaltyPicker(false)}
              className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {DEFAULT_PENALTIES.map((p) => (
              <button
                key={p.type}
                onClick={() => {
                  setPenaltyType(p.type);
                  setPenaltyMinutes(p.minutes);
                  setShowPenaltyPicker(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-left active:scale-[0.98] mb-1 ${
                  penaltyType === p.type
                    ? 'bg-[var(--league-primary,#d4af37)]/10 border border-[var(--league-primary,#d4af37)]/30'
                    : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover,var(--color-surface))]'
                }`}
              >
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{p.type}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{p.minutes} min</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="relative mt-auto flex flex-col bg-[var(--color-background)] rounded-t-2xl border-t border-[var(--color-border)] animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)]">
            Edit {isGoal ? 'Goal' : 'Penalty'}
          </h3>
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

        {/* Body */}
        <div className="px-4 py-4 space-y-4">
          {/* Team + Period row */}
          <div className="flex gap-3">
            {/* Team toggle */}
            <div className="flex-1">
              <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Team</label>
              <div className="flex rounded-xl overflow-hidden border border-[var(--color-border)]">
                <button
                  onClick={() => setTeamType('home')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    teamType === 'home'
                      ? 'bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  HOME
                </button>
                <button
                  onClick={() => setTeamType('away')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    teamType === 'away'
                      ? 'bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  AWAY
                </button>
              </div>
            </div>

            {/* Period selector */}
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Period</label>
              <div className="flex rounded-xl overflow-hidden border border-[var(--color-border)]">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`w-10 py-2 text-sm font-medium transition-colors ${
                      period === p
                        ? 'bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)]'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPeriod(4)}
                  className={`w-10 py-2 text-sm font-medium transition-colors ${
                    period === 4
                      ? 'bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  OT
                </button>
              </div>
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Time</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="w-16 py-2 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center text-sm text-[var(--color-text-primary)] font-medium"
                placeholder="MM"
              />
              <span className="text-[var(--color-text-secondary)] font-bold">:</span>
              <input
                type="text"
                inputMode="numeric"
                value={timeSeconds}
                onChange={(e) => setTimeSeconds(e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="w-16 py-2 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center text-sm text-[var(--color-text-primary)] font-medium"
                placeholder="SS"
              />
            </div>
          </div>

          {/* Goal-specific fields */}
          {isGoal && (
            <>
              <PlayerField
                label="Scorer"
                jersey={scorerJersey}
                name={findName(scorerJersey)}
                warning={jerseyWarning(scorerJersey)}
                onPick={() => setPickingField('scorer')}
              />
              <PlayerField
                label="Assist 1"
                jersey={assist1Jersey}
                name={assist1Jersey != null ? findName(assist1Jersey) : null}
                warning={jerseyWarning(assist1Jersey)}
                onPick={() => setPickingField('assist1')}
                optional
              />
              <PlayerField
                label="Assist 2"
                jersey={assist2Jersey}
                name={assist2Jersey != null ? findName(assist2Jersey) : null}
                warning={jerseyWarning(assist2Jersey)}
                onPick={() => setPickingField('assist2')}
                optional
              />
            </>
          )}

          {/* Penalty-specific fields */}
          {!isGoal && (
            <>
              <PlayerField
                label="Player"
                jersey={playerJersey}
                name={findName(playerJersey)}
                warning={jerseyWarning(playerJersey)}
                onPick={() => setPickingField('player')}
              />

              {/* Penalty type */}
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Penalty</label>
                <button
                  onClick={() => setShowPenaltyPicker(true)}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] transition-colors"
                >
                  <span>{penaltyType || 'Select penalty...'}</span>
                  <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {/* Minutes segmented control */}
              <div>
                <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Minutes</label>
                <div className="flex rounded-xl overflow-hidden border border-[var(--color-border)]">
                  {PENALTY_MINUTES.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPenaltyMinutes(m)}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        penaltyMinutes === m
                          ? 'bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)]'
                          : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-4 pb-4 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-primary)] font-medium border border-[var(--color-border)] transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="flex-1 py-3 rounded-xl bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] font-semibold transition-all hover:opacity-90 active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PlayerField sub-component — tappable row that opens PlayerPicker
// =============================================================================

function PlayerField({
  label,
  jersey,
  name,
  warning,
  onPick,
  optional,
}: {
  label: string;
  jersey: number | null;
  name: string | null;
  warning: boolean;
  onPick: () => void;
  optional?: boolean;
}) {
  const isEmpty = jersey == null;

  return (
    <div>
      <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">{label}</label>
      <button
        onClick={onPick}
        className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl border text-sm transition-colors ${
          warning
            ? 'bg-orange-500/5 border-orange-400/30'
            : 'bg-[var(--color-surface)] border-[var(--color-border)]'
        }`}
      >
        <span className={isEmpty ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}>
          {isEmpty
            ? (optional ? 'None' : 'Select player...')
            : `#${jersey} ${name || '(not on roster)'}`}
        </span>
        <div className="flex items-center gap-1.5">
          {warning && (
            <span className="text-[10px] font-bold text-orange-400">!</span>
          )}
          <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>
    </div>
  );
}
