'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { TeamData, PlayerData } from '@/lib/actions/scorekeeper';

interface GoalEntryModalProps {
  team: TeamData;
  opposingTeam: TeamData;
  teamType: 'home' | 'away';
  period: number;
  onSubmit: (data: {
    scorerId: string;
    assist1Id?: string;
    assist2Id?: string;
    isPowerPlay?: boolean;
    isShortHanded?: boolean;
    isEmptyNet?: boolean;
    gameTimeSeconds?: number;
    goalieInNetId?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

type Step = 'scorer' | 'assists' | 'details';

export function GoalEntryModal({
  team,
  opposingTeam,
  period,
  onSubmit,
  onCancel,
  isSubmitting,
}: GoalEntryModalProps) {
  const [step, setStep] = useState<Step>('scorer');
  const [searchTerm, setSearchTerm] = useState('');
  const [scorerId, setScorerId] = useState<string | null>(null);
  const [assist1Id, setAssist1Id] = useState<string | null>(null);
  const [assist2Id, setAssist2Id] = useState<string | null>(null);
  const [isPowerPlay, setIsPowerPlay] = useState(false);
  const [isShortHanded, setIsShortHanded] = useState(false);
  const [isEmptyNet, setIsEmptyNet] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');

  const roster = useMemo(
    () => [...team.roster].sort((a, b) => a.jerseyNumber - b.jerseyNumber),
    [team.roster]
  );

  const opposingGoalies = useMemo(
    () => opposingTeam.roster.filter((p) => p.position === 'Goalie'),
    [opposingTeam.roster]
  );
  const [goalieInNetId, setGoalieInNetId] = useState<string | null>(
    opposingGoalies.length === 1 ? opposingGoalies[0].id : null
  );

  const filteredRoster = useMemo(() => {
    if (!searchTerm.trim()) return roster;
    const term = searchTerm.toLowerCase().trim();
    return roster.filter((player) =>
      player.jerseyNumber.toString().includes(term) ||
      player.fullName.toLowerCase().includes(term) ||
      player.position.toLowerCase().includes(term)
    );
  }, [roster, searchTerm]);

  const scorer = roster.find((p) => p.id === scorerId) || null;
  const assist1 = roster.find((p) => p.id === assist1Id) || null;
  const assist2 = roster.find((p) => p.id === assist2Id) || null;

  const handleScorerSelect = (playerId: string) => {
    setScorerId(playerId);
    if (assist1Id === playerId) setAssist1Id(null);
    if (assist2Id === playerId) setAssist2Id(null);
    setSearchTerm('');
    setStep('assists');
  };

  const handleAssistSelect = (slot: 1 | 2, playerId: string | null) => {
    if (slot === 1) {
      if (playerId && playerId === assist2Id) setAssist2Id(null);
      setAssist1Id(playerId);
      return;
    }

    if (playerId && playerId === assist1Id) setAssist1Id(null);
    setAssist2Id(playerId);
  };

  const handleSubmit = async () => {
    if (!scorerId) return;

    const mm = Number.parseInt(timeMinutes || '0', 10);
    const ss = Number.parseInt(timeSeconds || '0', 10);
    const gameTimeSeconds =
      timeMinutes.trim() || timeSeconds.trim()
        ? Math.max(0, mm * 60 + Math.min(59, Math.max(0, ss)))
        : undefined;

    await onSubmit({
      scorerId,
      assist1Id: assist1Id || undefined,
      assist2Id: assist2Id || undefined,
      isPowerPlay,
      isShortHanded,
      isEmptyNet,
      gameTimeSeconds,
      goalieInNetId: isEmptyNet ? undefined : goalieInNetId || undefined,
    });
  };

  const canContinueToDetails = !!scorerId;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="bg-neutral-900 w-full md:max-w-3xl md:rounded-2xl border-t md:border border-white/10 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">Record Goal</h2>
            <p className="text-sm text-neutral-400">
              {team.name} - Period {period}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            aria-label="Close goal modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              ['scorer', 'Scorer'],
              ['assists', 'Assists'],
              ['details', 'Details'],
            ].map(([id, label]) => (
              <div
                key={id}
                className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center ${
                  step === id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {step !== 'details' && (
            <div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by jersey, name, position"
                className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/30"
              />
            </div>
          )}

          {step === 'scorer' && (
            <div className="space-y-2">
              <p className="text-xs text-neutral-400 uppercase tracking-wider">Select Goal Scorer</p>
              <div className="space-y-2">
                {filteredRoster.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    selected={player.id === scorerId}
                    onClick={() => handleScorerSelect(player.id)}
                    accentColor={team.primaryColor}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 'assists' && (
            <div className="space-y-4">
              {scorer && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                  <p className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Scorer</p>
                  <p className="text-white font-medium">#{scorer.jerseyNumber} {scorer.fullName}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Assist 1</p>
                  <button
                    type="button"
                    onClick={() => handleAssistSelect(1, null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border ${
                      assist1Id === null
                        ? 'bg-rink-500/15 border-rink-500/40 text-rink-200'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                    }`}
                  >
                    No Assist
                  </button>
                  {assist1 && (
                    <p className="mt-2 text-sm text-white">#{assist1.jerseyNumber} {assist1.fullName}</p>
                  )}
                </div>

                <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3">
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Assist 2</p>
                  <button
                    type="button"
                    onClick={() => handleAssistSelect(2, null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border ${
                      assist2Id === null
                        ? 'bg-rink-500/15 border-rink-500/40 text-rink-200'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                    }`}
                  >
                    No Assist
                  </button>
                  {assist2 && (
                    <p className="mt-2 text-sm text-white">#{assist2.jerseyNumber} {assist2.fullName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-neutral-400 uppercase tracking-wider">Select Assists</p>
                {filteredRoster
                  .filter((player) => player.id !== scorerId)
                  .map((player) => (
                    <div key={player.id} className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAssistSelect(1, player.id)}
                        className={`px-3 rounded-lg text-xs font-semibold border ${
                          assist1Id === player.id
                            ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                        }`}
                      >
                        A1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssistSelect(2, player.id)}
                        className={`px-3 rounded-lg text-xs font-semibold border ${
                          assist2Id === player.id
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                        }`}
                      >
                        A2
                      </button>
                      <div className="flex-1">
                        <PlayerRow
                          player={player}
                          selected={assist1Id === player.id || assist2Id === player.id}
                          onClick={() => {
                            if (!assist1Id) handleAssistSelect(1, player.id);
                            else handleAssistSelect(2, player.id);
                          }}
                          accentColor={team.primaryColor}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 space-y-2">
                <p className="text-xs text-neutral-400 uppercase tracking-wider">Goal Summary</p>
                <p className="text-white text-sm">{scorer ? `#${scorer.jerseyNumber} ${scorer.fullName}` : 'No scorer selected'}</p>
                <p className="text-neutral-300 text-sm">
                  Assists:{' '}
                  {[
                    assist1 ? `#${assist1.jerseyNumber} ${assist1.fullName}` : 'None',
                    assist2 ? `#${assist2.jerseyNumber} ${assist2.fullName}` : 'None',
                  ].join(', ')}
                </p>
              </div>

              <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">Goalie In Net ({opposingTeam.name})</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsEmptyNet(true);
                    setGoalieInNetId(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border mb-2 ${
                    isEmptyNet
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-200'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-300'
                  }`}
                >
                  Empty Net
                </button>
                <div className="space-y-2">
                  {opposingGoalies.map((goalie) => (
                    <PlayerRow
                      key={goalie.id}
                      player={goalie}
                      selected={!isEmptyNet && goalie.id === goalieInNetId}
                      onClick={() => {
                        setIsEmptyNet(false);
                        setGoalieInNetId(goalie.id);
                      }}
                      accentColor={opposingTeam.primaryColor}
                    />
                  ))}
                </div>
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

              <div className="grid grid-cols-3 gap-2">
                <ToggleBadge label="Power Play" active={isPowerPlay} onClick={() => {
                  setIsPowerPlay((v) => !v);
                  setIsShortHanded(false);
                }} />
                <ToggleBadge label="Short-Handed" active={isShortHanded} onClick={() => {
                  setIsShortHanded((v) => !v);
                  setIsPowerPlay(false);
                }} />
                <ToggleBadge label="Empty Net" active={isEmptyNet} onClick={() => {
                  const next = !isEmptyNet;
                  setIsEmptyNet(next);
                  if (next) setGoalieInNetId(null);
                }} />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-800 flex gap-3">
          {step !== 'scorer' && (
            <button
              onClick={() => setStep(step === 'details' ? 'assists' : 'scorer')}
              className="px-5 py-3 rounded-xl bg-neutral-800 text-white font-semibold"
            >
              Back
            </button>
          )}
          {step === 'scorer' && (
            <button
              onClick={onCancel}
              className="px-5 py-3 rounded-xl bg-neutral-800 text-white font-semibold"
            >
              Cancel
            </button>
          )}
          {step === 'assists' && (
            <button
              onClick={() => setStep('details')}
              disabled={!canContinueToDetails}
              className="flex-1 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
            >
              Continue
            </button>
          )}
          {step === 'details' && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !scorerId}
              className="flex-1 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Add Goal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleBadge({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
        active
          ? 'bg-rink-500/20 border-rink-500/40 text-rink-200'
          : 'bg-neutral-800 border-neutral-700 text-neutral-300'
      }`}
    >
      {label}
    </button>
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
          ? 'bg-rink-500/10 border-rink-500/40'
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
