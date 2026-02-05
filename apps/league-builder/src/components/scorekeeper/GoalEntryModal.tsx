'use client';

import { useState, useMemo } from 'react';
import type { TeamData, PlayerData } from '@/lib/actions/scorekeeper';

interface GoalEntryModalProps {
  team: TeamData;
  opposingTeam: TeamData; // Need opposing team to select their goalie
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
    goalieInNetId?: string; // The opposing goalie who allowed the goal
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

type Step = 'scorer' | 'assists' | 'modifiers';

/**
 * Goal Entry Modal
 * Multi-step form for entering goal details with player selection
 */
export function GoalEntryModal({
  team,
  opposingTeam,
  teamType,
  period,
  onSubmit,
  onCancel,
  isSubmitting,
}: GoalEntryModalProps) {
  const [step, setStep] = useState<Step>('scorer');
  const [scorerId, setScorerId] = useState<string | null>(null);
  const [assist1Id, setAssist1Id] = useState<string | null>(null);
  const [assist2Id, setAssist2Id] = useState<string | null>(null);
  const [isPowerPlay, setIsPowerPlay] = useState(false);
  const [isShortHanded, setIsShortHanded] = useState(false);
  const [isEmptyNet, setIsEmptyNet] = useState(false);
  const [goalieInNetId, setGoalieInNetId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');

  // Get opposing team's goalies
  const opposingGoalies = useMemo(() => {
    return opposingTeam.roster.filter(p =>
      p.position === 'Goalie' ||
      p.position?.toLowerCase() === 'goalie' ||
      p.position?.toLowerCase() === 'g'
    );
  }, [opposingTeam.roster]);

  // Auto-select goalie if there's only one
  useMemo(() => {
    if (opposingGoalies.length === 1 && !goalieInNetId) {
      setGoalieInNetId(opposingGoalies[0].id);
    }
  }, [opposingGoalies, goalieInNetId]);

  // Filter players based on search (jersey number prioritized)
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

  const scorer = team.roster.find(p => p.id === scorerId);
  const assist1 = team.roster.find(p => p.id === assist1Id);
  const assist2 = team.roster.find(p => p.id === assist2Id);

  const handlePlayerSelect = (player: PlayerData) => {
    if (step === 'scorer') {
      setScorerId(player.id);
      setSearchTerm('');
      setStep('assists');
    } else if (step === 'assists') {
      if (!assist1Id) {
        setAssist1Id(player.id);
      } else if (!assist2Id && player.id !== assist1Id) {
        setAssist2Id(player.id);
      }
      setSearchTerm('');
    }
  };

  const handleSubmit = async () => {
    if (!scorerId) return;

    const gameTimeSeconds = timeMinutes || timeSeconds
      ? (parseInt(timeMinutes || '0') * 60) + parseInt(timeSeconds || '0')
      : undefined;

    await onSubmit({
      scorerId,
      assist1Id: assist1Id || undefined,
      assist2Id: assist2Id || undefined,
      isPowerPlay,
      isShortHanded,
      isEmptyNet,
      gameTimeSeconds,
      goalieInNetId: isEmptyNet ? undefined : (goalieInNetId || undefined), // No goalie if empty net
    });
  };

  const selectedGoalie = opposingGoalies.find(g => g.id === goalieInNetId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="bg-neutral-900 w-full md:max-w-lg md:rounded-2xl border-t md:border border-white/10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white">Add Goal</h2>
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

        {/* Progress */}
        <div className="flex gap-1 p-4 pb-0">
          {['scorer', 'assists', 'modifiers'].map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                step === s ? 'bg-emerald-500' : i < ['scorer', 'assists', 'modifiers'].indexOf(step) ? 'bg-emerald-500/50' : 'bg-neutral-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Step 1: Select Scorer */}
          {step === 'scorer' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Who Scored?
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Search by jersey # or name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-950 border border-rink-500/30 rounded-xl
                    text-white placeholder-neutral-500
                    focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20 focus:outline-none
                    transition-all duration-200"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-auto">
                {filteredPlayers.map((player) => (
                  <PlayerButton
                    key={player.id}
                    player={player}
                    isSelected={scorerId === player.id}
                    onClick={() => handlePlayerSelect(player)}
                    color={team.primaryColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Assists */}
          {step === 'assists' && (
            <div className="space-y-4">
              {/* Scorer Display */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Goal Scored By</p>
                <p className="text-white font-semibold">
                  #{scorer?.jerseyNumber} {scorer?.fullName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Assists (optional, select up to 2)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Search by jersey # or name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-950 border border-rink-500/30 rounded-xl
                    text-white placeholder-neutral-500
                    focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20 focus:outline-none
                    transition-all duration-200"
                  autoFocus
                />
              </div>

              {/* Selected Assists */}
              {(assist1 || assist2) && (
                <div className="flex gap-2">
                  {assist1 && (
                    <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                      <span className="text-blue-400 text-sm font-medium">
                        #{assist1.jerseyNumber} {assist1.fullName}
                      </span>
                      <button
                        onClick={() => setAssist1Id(null)}
                        className="text-blue-400 hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {assist2 && (
                    <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                      <span className="text-blue-400 text-sm font-medium">
                        #{assist2.jerseyNumber} {assist2.fullName}
                      </span>
                      <button
                        onClick={() => setAssist2Id(null)}
                        className="text-blue-400 hover:text-white"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-auto">
                {filteredPlayers
                  .filter(p => p.id !== scorerId)
                  .map((player) => (
                    <PlayerButton
                      key={player.id}
                      player={player}
                      isSelected={assist1Id === player.id || assist2Id === player.id}
                      onClick={() => handlePlayerSelect(player)}
                      color={team.primaryColor}
                      disabled={!!(assist1Id && assist2Id && assist1Id !== player.id && assist2Id !== player.id)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Step 3: Modifiers */}
          {step === 'modifiers' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                <div>
                  <p className="text-xs text-emerald-400 uppercase tracking-wider">Goal</p>
                  <p className="text-white font-semibold">
                    #{scorer?.jerseyNumber} {scorer?.fullName}
                  </p>
                </div>
                {(assist1 || assist2) && (
                  <div>
                    <p className="text-xs text-blue-400 uppercase tracking-wider">Assists</p>
                    <p className="text-neutral-300 text-sm">
                      {[
                        assist1 && `#${assist1.jerseyNumber} ${assist1.fullName}`,
                        assist2 && `#${assist2.jerseyNumber} ${assist2.fullName}`,
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Goalie in Net Selection */}
              {!isEmptyNet && opposingGoalies.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    {opposingTeam.name} Goalie in Net
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {opposingGoalies.map((goalie) => (
                      <button
                        key={goalie.id}
                        onClick={() => setGoalieInNetId(goalie.id)}
                        className={`px-4 py-3 rounded-xl border font-medium text-sm transition-all duration-200 touch-manipulation
                          ${goalieInNetId === goalie.id
                            ? 'bg-red-500/20 border-red-500 text-red-400'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                          }`}
                      >
                        #{goalie.jerseyNumber} {goalie.fullName}
                      </button>
                    ))}
                  </div>
                  {opposingGoalies.length === 1 && (
                    <p className="text-xs text-neutral-500 mt-1">Auto-selected (only goalie on roster)</p>
                  )}
                </div>
              )}

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
                    className="w-20 px-3 py-2 bg-neutral-950 border border-rink-500/30 rounded-lg
                      text-white text-center
                      focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20 focus:outline-none"
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
                    className="w-20 px-3 py-2 bg-neutral-950 border border-rink-500/30 rounded-lg
                      text-white text-center
                      focus:border-rink-500 focus:ring-2 focus:ring-rink-500/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modifiers */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Goal Type
                </label>
                <div className="flex flex-wrap gap-2">
                  <ModifierButton
                    label="Power Play"
                    isActive={isPowerPlay}
                    onClick={() => { setIsPowerPlay(!isPowerPlay); setIsShortHanded(false); }}
                    color="amber"
                  />
                  <ModifierButton
                    label="Short Handed"
                    isActive={isShortHanded}
                    onClick={() => { setIsShortHanded(!isShortHanded); setIsPowerPlay(false); }}
                    color="purple"
                  />
                  <ModifierButton
                    label="Empty Net"
                    isActive={isEmptyNet}
                    onClick={() => {
                      setIsEmptyNet(!isEmptyNet);
                      if (!isEmptyNet) setGoalieInNetId(null); // Clear goalie if empty net
                    }}
                    color="orange"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex gap-3">
          {step === 'scorer' && (
            <button
              onClick={onCancel}
              className="flex-1 py-4 px-6 bg-neutral-800 text-white font-semibold rounded-xl
                hover:bg-neutral-700 transition-colors touch-manipulation min-h-[56px]"
            >
              Cancel
            </button>
          )}

          {step === 'assists' && (
            <>
              <button
                onClick={() => setStep('scorer')}
                className="py-4 px-6 bg-neutral-800 text-white font-semibold rounded-xl
                  hover:bg-neutral-700 transition-colors touch-manipulation min-h-[56px]"
              >
                Back
              </button>
              <button
                onClick={() => setStep('modifiers')}
                className="flex-1 py-4 px-6 bg-emerald-600 text-white font-semibold rounded-xl
                  hover:bg-emerald-500 transition-colors touch-manipulation min-h-[56px]"
              >
                {assist1Id || assist2Id ? 'Continue' : 'No Assists'}
              </button>
            </>
          )}

          {step === 'modifiers' && (
            <>
              <button
                onClick={() => setStep('assists')}
                className="py-4 px-6 bg-neutral-800 text-white font-semibold rounded-xl
                  hover:bg-neutral-700 transition-colors touch-manipulation min-h-[56px]"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-4 px-6 bg-emerald-600 text-white font-semibold rounded-xl
                  hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors touch-manipulation min-h-[56px]"
              >
                {isSubmitting ? 'Saving...' : 'Add Goal'}
              </button>
            </>
          )}
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
  disabled,
}: {
  player: PlayerData;
  isSelected: boolean;
  onClick: () => void;
  color: string | null;
  disabled?: boolean;
}) {
  const teamColor = color || '#22D3EE';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-3 rounded-xl text-center transition-all duration-200 touch-manipulation min-h-[72px]
        ${isSelected
          ? 'border-2'
          : 'border border-neutral-700 hover:border-neutral-600'
        }
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
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

// Modifier Button Component
function ModifierButton({
  label,
  isActive,
  onClick,
  color,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  color: 'amber' | 'purple' | 'orange';
}) {
  const colorClasses = {
    amber: isActive
      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
      : 'bg-neutral-800 border-neutral-700 text-neutral-400',
    purple: isActive
      ? 'bg-purple-500/20 border-purple-500 text-purple-400'
      : 'bg-neutral-800 border-neutral-700 text-neutral-400',
    orange: isActive
      ? 'bg-orange-500/20 border-orange-500 text-orange-400'
      : 'bg-neutral-800 border-neutral-700 text-neutral-400',
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all duration-200 touch-manipulation
        ${colorClasses[color]}
      `}
    >
      {label}
    </button>
  );
}
