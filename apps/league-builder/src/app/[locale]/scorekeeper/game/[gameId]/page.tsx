'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getScorekeeperSession,
  getScorekeeperGameData,
  getGameEvents,
  addGoalEvent,
  addPenaltyEvent,
  addSaveEvent,
  undoEvent,
  type GameData,
  type GameEventData,
} from '@/lib/actions/scorekeeper';
import { GoalEntryModal } from '@/components/scorekeeper/GoalEntryModal';
import { PenaltyEntryModal } from '@/components/scorekeeper/PenaltyEntryModal';
import { SaveEntryModal } from '@/components/scorekeeper/SaveEntryModal';
import { ShotEntryModal } from '@/components/scorekeeper/ShotEntryModal';
import { GameSummaryModal } from '@/components/scorekeeper/GameSummaryModal';
import { usePeriodTimer } from '@/components/scorekeeper/usePeriodTimer';

type EntryMode = 'idle' | 'goal' | 'penalty' | 'save' | 'shot' | 'summary';
type TeamSelection = 'home' | 'away' | null;

/**
 * Main Scorekeeper Game Entry Page
 * Tablet-optimized interface for entering game statistics
 */
export default function ScorekeeperGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const locale = (params.locale as string) || 'en';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<GameData | null>(null);
  const [events, setEvents] = useState<GameEventData[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [entryMode, setEntryMode] = useState<EntryMode>('idle');
  const [selectedTeam, setSelectedTeam] = useState<TeamSelection>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerPeriodEnded, setTimerPeriodEnded] = useState(false);

  // Period timer
  const periodLengthMinutes = game?.periodLengthMinutes ?? 20;
  const timer = usePeriodTimer({
    periodLengthMinutes,
    onPeriodEnd: () => {
      setTimerPeriodEnded(true);
    },
  });

  // Reset timer when game data loads and period length is determined
  const [timerInitialized, setTimerInitialized] = useState(false);
  useEffect(() => {
    if (game && !timerInitialized) {
      timer.reset();
      setTimerInitialized(true);
    }
  }, [game, timerInitialized, timer]);

  // Load game data
  const loadGameData = useCallback(async () => {
    try {
      const [gameResult, eventsResult] = await Promise.all([
        getScorekeeperGameData(gameId),
        getGameEvents(gameId),
      ]);

      if (gameResult.success && gameResult.game) {
        setGame(gameResult.game);
      } else {
        setError(gameResult.error || 'Failed to load game');
      }

      if (eventsResult.success && eventsResult.events) {
        setEvents(eventsResult.events.filter(e => !e.deletedAt));
      }
    } catch {
      setError('Failed to load game data');
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  // Check session and load data
  useEffect(() => {
    async function checkSession() {
      const session = await getScorekeeperSession();
      if (!session.success || session.session?.gameId !== gameId) {
        router.push(`/${locale}/scorekeeper`);
        return;
      }
      loadGameData();
    }
    checkSession();
  }, [gameId, locale, router, loadGameData]);

  // Refresh events periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getGameEvents(gameId);
      if (result.success && result.events) {
        setEvents(result.events.filter(e => !e.deletedAt));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [gameId]);

  // Calculate scores from events
  const homeGoals = events.filter(e => e.eventType === 'goal' && e.teamType === 'home').length;
  const awayGoals = events.filter(e => e.eventType === 'goal' && e.teamType === 'away').length;

  // Handle adding a goal
  const handleAddGoal = async (data: {
    scorerId: string;
    assist1Id?: string;
    assist2Id?: string;
    isPowerPlay?: boolean;
    isShortHanded?: boolean;
    isEmptyNet?: boolean;
    gameTimeSeconds?: number;
    goalieInNetId?: string;
  }) => {
    if (!game || !selectedTeam) return;

    setIsSubmitting(true);
    const teamId = selectedTeam === 'home' ? game.homeTeam.id : game.awayTeam.id;

    const result = await addGoalEvent({
      gameId,
      teamId,
      teamType: selectedTeam,
      scorerId: data.scorerId,
      assist1Id: data.assist1Id,
      assist2Id: data.assist2Id,
      period: currentPeriod,
      gameTimeSeconds: data.gameTimeSeconds,
      isPowerPlay: data.isPowerPlay,
      isShortHanded: data.isShortHanded,
      isEmptyNet: data.isEmptyNet,
      goalieInNetId: data.goalieInNetId, // Track which goalie allowed the goal
    });

    if (result.success) {
      await loadGameData();
    }

    setIsSubmitting(false);
    setEntryMode('idle');
    setSelectedTeam(null);
  };

  // Handle adding a penalty
  const handleAddPenalty = async (data: {
    playerId: string;
    penaltyType: string;
    penaltyMinutes: number;
    gameTimeSeconds?: number;
  }) => {
    if (!game || !selectedTeam) return;

    setIsSubmitting(true);
    const teamId = selectedTeam === 'home' ? game.homeTeam.id : game.awayTeam.id;

    const result = await addPenaltyEvent({
      gameId,
      teamId,
      teamType: selectedTeam,
      playerId: data.playerId,
      period: currentPeriod,
      gameTimeSeconds: data.gameTimeSeconds,
      penaltyType: data.penaltyType,
      penaltyMinutes: data.penaltyMinutes,
    });

    if (result.success) {
      await loadGameData();
    }

    setIsSubmitting(false);
    setEntryMode('idle');
    setSelectedTeam(null);
  };

  // Handle adding a save
  const handleAddSave = async (data: {
    goalieId: string;
    shotByPlayerId?: string;
    gameTimeSeconds?: number;
  }) => {
    if (!game || !selectedTeam) return;

    setIsSubmitting(true);
    const teamId = selectedTeam === 'home' ? game.homeTeam.id : game.awayTeam.id;

    const result = await addSaveEvent({
      gameId,
      teamId,
      teamType: selectedTeam,
      goalieId: data.goalieId,
      shotByPlayerId: data.shotByPlayerId,
      period: currentPeriod,
      gameTimeSeconds: data.gameTimeSeconds,
    });

    if (result.success) {
      await loadGameData();
    }

    setIsSubmitting(false);
    setEntryMode('idle');
    setSelectedTeam(null);
  };

  const handleAddShot = async (data: {
    goalieId: string;
    shotByPlayerId?: string;
    gameTimeSeconds?: number;
  }) => {
    if (!game || !selectedTeam) return;

    setIsSubmitting(true);

    // selectedTeam = team taking the shot, save is recorded against defending goalie/team
    const defendingTeamType: 'home' | 'away' = selectedTeam === 'home' ? 'away' : 'home';
    const defendingTeamId = defendingTeamType === 'home' ? game.homeTeam.id : game.awayTeam.id;

    const result = await addSaveEvent({
      gameId,
      teamId: defendingTeamId,
      teamType: defendingTeamType,
      goalieId: data.goalieId,
      shotByPlayerId: data.shotByPlayerId,
      period: currentPeriod,
      gameTimeSeconds: data.gameTimeSeconds,
    });

    if (result.success) {
      await loadGameData();
    }

    setIsSubmitting(false);
    setEntryMode('idle');
    setSelectedTeam(null);
  };

  // Handle undo
  const handleUndo = async (eventId: string) => {
    const result = await undoEvent(eventId);
    if (result.success) {
      await loadGameData();
    }
  };

  // Start entry mode
  const startEntry = (mode: EntryMode, team: TeamSelection) => {
    setEntryMode(mode);
    setSelectedTeam(team);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !game) {
    return <ErrorState error={error || 'Game not found'} onRetry={loadGameData} />;
  }

  const periodEvents = events.filter(e => e.period === currentPeriod);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Header */}
      <header className="bg-neutral-900 border-b border-white/10 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/${locale}/scorekeeper`)}
            className="p-2 -ml-2 text-neutral-400 hover:text-white transition-colors touch-manipulation"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <span className="text-xs text-neutral-500 uppercase tracking-wider">
              {game.status === 'in_progress' ? 'Live' : game.status}
            </span>
          </div>
          <button
            onClick={() => setEntryMode('summary')}
            className="p-2 -mr-2 text-rink-400 hover:text-rink-300 transition-colors touch-manipulation"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Score Display */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-6">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Home Team */}
          <div className="flex-1 text-center">
            <div
              className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-2"
              style={{ backgroundColor: `${game.homeTeam.primaryColor || '#22D3EE'}20` }}
            >
              {game.homeTeam.logoUrl ? (
                <Image
                  src={game.homeTeam.logoUrl}
                  alt={`${game.homeTeam.name} logo`}
                  width={56}
                  height={56}
                  className="rounded-lg object-cover"
                />
              ) : (
                <span
                  className="text-2xl font-black"
                  style={{ color: game.homeTeam.primaryColor || '#22D3EE' }}
                >
                  {game.homeTeam.shortName?.[0] || game.homeTeam.name[0]}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400 truncate">{game.homeTeam.name}</p>
            <p
              className="text-4xl font-black mt-1"
              style={{ color: game.homeTeam.primaryColor || '#22D3EE' }}
            >
              {homeGoals}
            </p>
          </div>

          {/* VS */}
          <div className="px-4">
            <span className="text-rink-500 font-bold text-xl">VS</span>
          </div>

          {/* Away Team */}
          <div className="flex-1 text-center">
            <div
              className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-2"
              style={{ backgroundColor: `${game.awayTeam.primaryColor || '#A3A3A3'}20` }}
            >
              {game.awayTeam.logoUrl ? (
                <Image
                  src={game.awayTeam.logoUrl}
                  alt={`${game.awayTeam.name} logo`}
                  width={56}
                  height={56}
                  className="rounded-lg object-cover"
                />
              ) : (
                <span
                  className="text-2xl font-black"
                  style={{ color: game.awayTeam.primaryColor || '#A3A3A3' }}
                >
                  {game.awayTeam.shortName?.[0] || game.awayTeam.name[0]}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400 truncate">{game.awayTeam.name}</p>
            <p
              className="text-4xl font-black mt-1"
              style={{ color: game.awayTeam.primaryColor || '#A3A3A3' }}
            >
              {awayGoals}
            </p>
          </div>
        </div>
      </div>

      {/* Period Timer */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-4">
        <div className="max-w-lg mx-auto">
          {/* Timer Display */}
          <div className="text-center mb-3">
            <div
              className={`text-5xl font-mono font-bold tracking-wider transition-colors duration-300
                ${timer.isRunning ? 'animate-pulse' : ''}
                ${timer.timerColorClass}
              `}
            >
              {timer.displayTime}
            </div>
            <div className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">
              Period {currentPeriod}{timer.isRunning ? ' — Running' : ''}
              {timerPeriodEnded ? ' — Ended' : ''}
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                timer.toggle();
                setTimerPeriodEnded(false);
              }}
              disabled={timerPeriodEnded}
              className={`flex-1 max-w-[140px] py-3 px-5 rounded-xl text-sm font-bold uppercase tracking-wider
                touch-manipulation min-h-[48px] transition-all duration-200
                ${timerPeriodEnded
                  ? 'bg-neutral-800/60 text-neutral-500 cursor-not-allowed opacity-40'
                  : timer.isRunning
                    ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/25'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                }
              `}
            >
              {timer.isRunning ? 'Stop' : 'Start'}
            </button>

            <button
              onClick={() => {
                timer.reset();
                setTimerPeriodEnded(false);
              }}
              disabled={timer.isRunning}
              className={`flex-1 max-w-[140px] py-3 px-5 rounded-xl text-sm font-bold uppercase tracking-wider
                touch-manipulation min-h-[48px] transition-all duration-200
                bg-neutral-800/60 text-neutral-300 border border-neutral-700/50
                ${timer.isRunning
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-neutral-800 hover:text-white'
                }
              `}
            >
              Reset
            </button>

            <button
              onClick={() => {
                timer.stop();
                if (currentPeriod < game.periodCount) {
                  const nextPeriod = currentPeriod + 1;
                  setCurrentPeriod(nextPeriod);
                  timer.reset();
                  setTimerPeriodEnded(false);
                } else {
                  setTimerPeriodEnded(true);
                }
              }}
              className={`flex-1 max-w-[160px] py-3 px-5 rounded-xl text-sm font-bold uppercase tracking-wider
                touch-manipulation min-h-[48px] transition-all duration-200
                bg-rink-500/15 text-rink-400 border border-rink-500/30 hover:bg-rink-500/25
              `}
            >
              {currentPeriod >= game.periodCount ? 'End Game' : 'End Period'}
            </button>
          </div>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex border-b border-neutral-800 sticky top-[57px] z-30 bg-neutral-950">
        {Array.from({ length: game.periodCount }, (_, i) => i + 1).map((period) => (
          <button
            key={period}
            onClick={() => {
              setCurrentPeriod(period);
              timer.reset();
              setTimerPeriodEnded(false);
            }}
            className={`flex-1 py-4 text-base font-semibold transition-all duration-200 touch-manipulation min-h-[56px]
              ${currentPeriod === period
                ? 'bg-rink-500/10 text-rink-400 border-b-2 border-rink-500'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
          >
            {period <= 3 ? `P${period}` : period === 4 ? 'OT' : `OT${period - 3}`}
          </button>
        ))}
      </div>

      {/* Event Timeline */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-lg mx-auto space-y-3">
          {periodEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-neutral-900 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-neutral-500">No events in Period {currentPeriod}</p>
              <p className="text-neutral-600 text-sm mt-1">Use the buttons below to add events</p>
            </div>
          ) : (
            periodEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                homeTeamId={game.homeTeam.id}
                homeColor={game.homeTeam.primaryColor}
                awayColor={game.awayTeam.primaryColor}
                onUndo={() => handleUndo(event.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-neutral-900 border-t border-neutral-800 p-4 sticky bottom-0 z-40">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-2">
          {/* Goal Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => startEntry('goal', 'home')}
              className="w-full py-4 px-3 rounded-xl font-semibold text-sm
                bg-emerald-500/10 text-emerald-400 border border-emerald-500/30
                hover:bg-emerald-500/20 active:scale-95
                transition-all duration-200 touch-manipulation min-h-[56px]"
            >
              <span className="block">Goal</span>
              <span className="text-xs text-emerald-400/70">{game.homeTeam.shortName || 'Home'}</span>
            </button>
            <button
              onClick={() => startEntry('goal', 'away')}
              className="w-full py-4 px-3 rounded-xl font-semibold text-sm
                bg-emerald-500/10 text-emerald-400 border border-emerald-500/30
                hover:bg-emerald-500/20 active:scale-95
                transition-all duration-200 touch-manipulation min-h-[56px]"
            >
              <span className="block">Goal</span>
              <span className="text-xs text-emerald-400/70">{game.awayTeam.shortName || 'Away'}</span>
            </button>
          </div>

          {/* Shot Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => startEntry('shot', 'home')}
              className="w-full py-4 px-3 rounded-xl font-semibold text-sm
                bg-cyan-500/10 text-cyan-300 border border-cyan-500/30
                hover:bg-cyan-500/20 active:scale-95
                transition-all duration-200 touch-manipulation min-h-[56px]"
            >
              <span className="block">Shot</span>
              <span className="text-xs text-cyan-300/70">{game.homeTeam.shortName || 'Home'}</span>
            </button>
            <button
              onClick={() => startEntry('shot', 'away')}
              className="w-full py-4 px-3 rounded-xl font-semibold text-sm
                bg-cyan-500/10 text-cyan-300 border border-cyan-500/30
                hover:bg-cyan-500/20 active:scale-95
                transition-all duration-200 touch-manipulation min-h-[56px]"
            >
              <span className="block">Shot</span>
              <span className="text-xs text-cyan-300/70">{game.awayTeam.shortName || 'Away'}</span>
            </button>
          </div>

          {/* Penalty Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => startEntry('penalty', 'home')}
              className="w-full py-4 px-3 rounded-xl font-semibold text-sm
                bg-red-500/10 text-red-400 border border-red-500/30
                hover:bg-red-500/20 active:scale-95
                transition-all duration-200 touch-manipulation min-h-[56px]"
            >
              <span className="block">Penalty</span>
              <span className="text-xs text-red-400/70">{game.homeTeam.shortName || 'Home'}</span>
            </button>
            <button
              onClick={() => startEntry('penalty', 'away')}
              className="w-full py-4 px-3 rounded-xl font-semibold text-sm
                bg-red-500/10 text-red-400 border border-red-500/30
                hover:bg-red-500/20 active:scale-95
                transition-all duration-200 touch-manipulation min-h-[56px]"
            >
              <span className="block">Penalty</span>
              <span className="text-xs text-red-400/70">{game.awayTeam.shortName || 'Away'}</span>
            </button>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => startEntry('save', 'home')}
              className="w-full py-4 px-3 rounded-xl font-semibold text-sm
                bg-blue-500/10 text-blue-400 border border-blue-500/30
                hover:bg-blue-500/20 active:scale-95
                transition-all duration-200 touch-manipulation min-h-[56px]"
            >
              <span className="block">Save</span>
              <span className="text-xs text-blue-400/70">{game.homeTeam.shortName || 'Home'}</span>
            </button>
            <button
              onClick={() => startEntry('save', 'away')}
              className="w-full py-4 px-3 rounded-xl font-semibold text-sm
                bg-blue-500/10 text-blue-400 border border-blue-500/30
                hover:bg-blue-500/20 active:scale-95
                transition-all duration-200 touch-manipulation min-h-[56px]"
            >
              <span className="block">Save</span>
              <span className="text-xs text-blue-400/70">{game.awayTeam.shortName || 'Away'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Entry Modals */}
      {entryMode === 'goal' && selectedTeam && (
        <GoalEntryModal
          team={selectedTeam === 'home' ? game.homeTeam : game.awayTeam}
          opposingTeam={selectedTeam === 'home' ? game.awayTeam : game.homeTeam}
          teamType={selectedTeam}
          period={currentPeriod}
          onSubmit={handleAddGoal}
          onCancel={() => { setEntryMode('idle'); setSelectedTeam(null); }}
          isSubmitting={isSubmitting}
        />
      )}

      {entryMode === 'penalty' && selectedTeam && (
        <PenaltyEntryModal
          team={selectedTeam === 'home' ? game.homeTeam : game.awayTeam}
          teamType={selectedTeam}
          period={currentPeriod}
          onSubmit={handleAddPenalty}
          onCancel={() => { setEntryMode('idle'); setSelectedTeam(null); }}
          isSubmitting={isSubmitting}
        />
      )}

      {entryMode === 'save' && selectedTeam && (
        <SaveEntryModal
          team={selectedTeam === 'home' ? game.homeTeam : game.awayTeam}
          opposingTeam={selectedTeam === 'home' ? game.awayTeam : game.homeTeam}
          teamType={selectedTeam}
          period={currentPeriod}
          onSubmit={handleAddSave}
          onCancel={() => { setEntryMode('idle'); setSelectedTeam(null); }}
          isSubmitting={isSubmitting}
        />
      )}

      {entryMode === 'shot' && selectedTeam && (
        <ShotEntryModal
          shootingTeam={selectedTeam === 'home' ? game.homeTeam : game.awayTeam}
          defendingTeam={selectedTeam === 'home' ? game.awayTeam : game.homeTeam}
          period={currentPeriod}
          onSubmit={handleAddShot}
          onCancel={() => { setEntryMode('idle'); setSelectedTeam(null); }}
          isSubmitting={isSubmitting}
        />
      )}

      {entryMode === 'summary' && (
        <GameSummaryModal
          gameId={gameId}
          game={game}
          events={events}
          onClose={() => setEntryMode('idle')}
        />
      )}
    </div>
  );
}

// Event Card Component
function EventCard({
  event,
  homeTeamId,
  homeColor,
  awayColor,
  onUndo,
}: {
  event: GameEventData;
  homeTeamId: string;
  homeColor: string | null;
  awayColor: string | null;
  onUndo: () => void;
}) {
  const isHome = event.teamId === homeTeamId;
  const color = isHome ? (homeColor || '#22D3EE') : (awayColor || '#A3A3A3');

  const getEventIcon = () => {
    switch (event.eventType) {
      case 'goal':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'penalty':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'save':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getEventColor = () => {
    switch (event.eventType) {
      case 'goal': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'penalty': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'save': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-neutral-400 bg-neutral-800 border-neutral-700';
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border ${getEventColor()} transition-all duration-200`}
    >
      {/* Event Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getEventColor()}`}>
        {getEventIcon()}
      </div>

      {/* Event Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold px-2 py-0.5 rounded"
            style={{ backgroundColor: `${color}20`, color }}
          >
            #{event.playerNumber}
          </span>
          <span className="font-medium text-white truncate">{event.playerName}</span>
        </div>

        {/* Goal assists */}
        {event.eventType === 'goal' && (event.assist1Name || event.assist2Name) && (
          <p className="text-sm text-neutral-400 mt-1">
            Assists: {[
              event.assist1Name && `#${event.assist1Number} ${event.assist1Name}`,
              event.assist2Name && `#${event.assist2Number} ${event.assist2Name}`,
            ].filter(Boolean).join(', ')}
          </p>
        )}

        {/* Penalty info */}
        {event.eventType === 'penalty' && (
          <p className="text-sm text-neutral-400 mt-1">
            {event.penaltyMinutes} min {event.penaltyType?.split(':').pop()?.replace(/_/g, ' ') || 'penalty'}
          </p>
        )}

        {event.eventType === 'save' && (
          <p className="text-sm text-neutral-400 mt-1">
            Shot by{' '}
            {event.shotByName
              ? `#${event.shotByNumber ?? '-'} ${event.shotByName}`
              : 'team'}
          </p>
        )}

        {/* Time */}
        {event.gameTimeSeconds !== null && (
          <p className="text-xs text-neutral-500 mt-1">
            {formatTime(event.gameTimeSeconds)}
          </p>
        )}
      </div>

      {/* Undo Button */}
      <button
        onClick={onUndo}
        className="flex-shrink-0 p-2 text-neutral-500 hover:text-red-400 transition-colors touch-manipulation"
        title="Undo"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>
    </div>
  );
}

// Loading State
function LoadingState() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white/10 border-t-rink-500 rounded-full animate-spin mx-auto" />
        <p className="text-neutral-400 mt-4">Loading game...</p>
      </div>
    </div>
  );
}

// Error State
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Error Loading Game</h2>
        <p className="text-neutral-400 mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-rink-500 text-black font-semibold rounded-xl hover:bg-rink-400 transition-colors touch-manipulation min-h-[48px]"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
