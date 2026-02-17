'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { GameData, GameEventData, CheckinPlayer } from '@/lib/actions/scorekeeper';
import { undoEvent, toggleGoaliePull, updateGameStatus } from '@/lib/actions/scorekeeper';
import { PreGameCheckin } from './PreGameCheckin';
import { PenaltyTracker } from '@/lib/scorekeeper/penalty-tracker';
import { EmptyNetTracker } from '@/lib/scorekeeper/empty-net-tracker';
import { GameTimer } from './GameTimer';
import { QuickActionBar } from './QuickActionBar';
import { GoalEntry } from './GoalEntry';
import { PenaltyEntry } from './PenaltyEntry';
import { ShotEntry } from './ShotEntry';
import { ScoreSheetUpload } from './ScoreSheetUpload';
import { GameSummaryModal } from './GameSummaryModal';
import { SyncStatusBanner } from './SyncStatusBanner';

interface ScoringInterfaceProps {
  game: GameData;
  events: GameEventData[];
  leagueSlug: string;
  sessionType: 'single' | 'multi';
  checkins?: { homeTeam: CheckinPlayer[]; awayTeam: CheckinPlayer[] };
}

type ActiveEntry = null | {
  type: 'goal' | 'penalty' | 'shot';
  teamType: 'home' | 'away';
};

export function ScoringInterface({
  game: initialGame,
  events: initialEvents,
  leagueSlug,
  sessionType,
  checkins,
}: ScoringInterfaceProps) {
  const router = useRouter();
  const [game, setGame] = useState(initialGame);
  const [events, setEvents] = useState(initialEvents);
  const [activeEntry, setActiveEntry] = useState<ActiveEntry>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
  const [activePeriodTab, setActivePeriodTab] = useState<number | 'all'>('all');
  const [showScoreSheetUpload, setShowScoreSheetUpload] = useState(false);
  const [showGameSummary, setShowGameSummary] = useState(false);

  // Initialize auto-detection trackers
  const penaltyTracker = useMemo(() => {
    const tracker = new PenaltyTracker(game.periodLengthMinutes);
    // Load existing penalties
    events
      .filter(e => e.eventType === 'penalty' && !e.deletedAt)
      .forEach(e => {
        tracker.addPenalty({
          eventId: e.id,
          teamType: e.teamType,
          playerId: e.playerId,
          penaltyMinutes: e.penaltyMinutes || 2,
          gameTimeSeconds: e.gameTimeSeconds || 0,
          period: e.period,
        });
      });
    return tracker;
  }, [events, game.periodLengthMinutes]);

  const emptyNetTracker = useMemo(() => {
    const tracker = new EmptyNetTracker();
    tracker.setState({
      home: game.homeGoaliePulled,
      away: game.awayGoaliePulled,
    });
    return tracker;
  }, [game.homeGoaliePulled, game.awayGoaliePulled]);

  // Compute scores from events (more reliable than server-cached values)
  const activeGoals = events.filter(e => e.eventType === 'goal' && !e.deletedAt);
  const homeScore = activeGoals.filter(e => e.teamType === 'home').length;
  const awayScore = activeGoals.filter(e => e.teamType === 'away').length;

  // Filtered events for timeline
  const filteredEvents = useMemo(() => {
    const active = events.filter(e => !e.deletedAt);
    if (activePeriodTab === 'all') return active;
    return active.filter(e => e.period === activePeriodTab);
  }, [events, activePeriodTab]);

  // Current timer values for auto-detection
  const currentPeriod = game.currentPeriod;
  const periodLengthSeconds = game.periodLengthMinutes * 60;

  function handleTeamSelect(teamType: 'home' | 'away') {
    setSelectedTeam(teamType);
  }

  function handleAction(type: 'goal' | 'penalty' | 'shot') {
    if (!selectedTeam) return;
    setActiveEntry({ type, teamType: selectedTeam });
  }

  const handleEntryComplete = useCallback(() => {
    setActiveEntry(null);
    setSelectedTeam(null);
    router.refresh();
  }, [router]);

  async function handleUndo(eventId: string) {
    const result = await undoEvent(eventId);
    if (result.success) {
      setEvents(prev => prev.map(e =>
        e.id === eventId ? { ...e, deletedAt: new Date().toISOString() } : e
      ));
    }
  }

  async function handleGoaliePull(teamType: 'home' | 'away') {
    const result = await toggleGoaliePull(game.id, teamType);
    if (result.success) {
      setGame(prev => ({
        ...prev,
        homeGoaliePulled: teamType === 'home' ? (result.pulled ?? false) : prev.homeGoaliePulled,
        awayGoaliePulled: teamType === 'away' ? (result.pulled ?? false) : prev.awayGoaliePulled,
      }));
    }
  }

  async function handleStartGame() {
    await updateGameStatus(game.id, 'in_progress');
    setGame(prev => ({ ...prev, status: 'in_progress' }));
  }

  // Determine auto-flags for current goal entry
  const isPP = selectedTeam
    ? penaltyTracker.isPowerPlay(selectedTeam, periodLengthSeconds - (game.timerElapsedSeconds % periodLengthSeconds), currentPeriod)
    : false;
  const isSH = selectedTeam
    ? penaltyTracker.isShortHanded(selectedTeam, periodLengthSeconds - (game.timerElapsedSeconds % periodLengthSeconds), currentPeriod)
    : false;
  const isEN = selectedTeam
    ? emptyNetTracker.isEmptyNetGoal(selectedTeam)
    : false;

  const homeTeam = game.homeTeam;
  const awayTeam = game.awayTeam;
  const activeTeam = selectedTeam === 'home' ? homeTeam : awayTeam;
  const opposingTeam = selectedTeam === 'home' ? awayTeam : homeTeam;

  // Show pre-game check-in when game hasn't started yet
  if (game.status === 'scheduled' && checkins) {
    return (
      <PreGameCheckin
        game={game}
        checkins={checkins}
        onGameStarted={() => setGame(prev => ({ ...prev, status: 'in_progress' }))}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      {/* Sync Status */}
      <div className="px-4 pt-2">
        <SyncStatusBanner />
      </div>

      {/* Top Bar: Back + Multi-game nav */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
        {sessionType === 'multi' ? (
          <button
            onClick={() => router.push(`/${leagueSlug}/scorekeeper`)}
            className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Games
          </button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-secondary)]">
            {game.status === 'in_progress' ? 'LIVE' : game.status.toUpperCase()}
          </span>
          <button
            onClick={() => setShowGameSummary(true)}
            className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Game summary"
            title="View game summary"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </button>
          <button
            onClick={() => setShowScoreSheetUpload(true)}
            className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            aria-label="Upload score sheet"
            title="Upload score sheet photo"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Home Team */}
          <button
            onClick={() => handleTeamSelect('home')}
            className={`
              flex-1 text-center p-3 rounded-xl transition-all duration-200
              ${selectedTeam === 'home'
                ? 'bg-[var(--color-surface)] ring-2 ring-[var(--league-primary,#d4af37)]'
                : 'hover:bg-[var(--color-surface)]/50'
              }
            `}
          >
            <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">
              Home
            </div>
            <div className="text-sm font-bold text-[var(--color-text-primary)] truncate">
              {homeTeam.shortName || homeTeam.name}
            </div>
            <div className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)] mt-1">
              {homeScore}
            </div>
            {game.homeGoaliePulled && (
              <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-500/10 text-purple-400">
                EN
              </span>
            )}
          </button>

          {/* VS Divider */}
          <div className="px-3 text-sm font-medium text-[var(--color-text-secondary)]">
            vs
          </div>

          {/* Away Team */}
          <button
            onClick={() => handleTeamSelect('away')}
            className={`
              flex-1 text-center p-3 rounded-xl transition-all duration-200
              ${selectedTeam === 'away'
                ? 'bg-[var(--color-surface)] ring-2 ring-[var(--league-primary,#d4af37)]'
                : 'hover:bg-[var(--color-surface)]/50'
              }
            `}
          >
            <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 uppercase tracking-wide">
              Away
            </div>
            <div className="text-sm font-bold text-[var(--color-text-primary)] truncate">
              {awayTeam.shortName || awayTeam.name}
            </div>
            <div className="text-3xl font-bold tabular-nums text-[var(--color-text-primary)] mt-1">
              {awayScore}
            </div>
            {game.awayGoaliePulled && (
              <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-500/10 text-purple-400">
                EN
              </span>
            )}
          </button>
        </div>

        {/* Goalie Pull Toggles */}
        <div className="flex justify-center gap-6 mt-2">
          <button
            onClick={() => handleGoaliePull('home')}
            className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
              game.homeGoaliePulled
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {game.homeGoaliePulled ? 'Return Goalie' : 'Pull Goalie'} (H)
          </button>
          <button
            onClick={() => handleGoaliePull('away')}
            className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
              game.awayGoaliePulled
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {game.awayGoaliePulled ? 'Return Goalie' : 'Pull Goalie'} (A)
          </button>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        {game.status === 'scheduled' ? (
          <div className="text-center">
            <button
              onClick={handleStartGame}
              className="px-6 py-2.5 rounded-xl bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] font-semibold transition-all hover:opacity-90 active:scale-95"
            >
              Start Game
            </button>
          </div>
        ) : (
          <GameTimer
            gameId={game.id}
            periodLengthMinutes={game.periodLengthMinutes}
            periodCount={game.periodCount}
            initialPeriod={game.currentPeriod}
            initialElapsedSeconds={game.timerElapsedSeconds}
            initialRunning={game.timerRunning}
          />
        )}
      </div>

      {/* Event Timeline */}
      <div className="flex-1 overflow-y-auto">
        {/* Period Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--color-border)] overflow-x-auto">
          <button
            onClick={() => setActivePeriodTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
              activePeriodTab === 'all'
                ? 'bg-[var(--league-primary,#d4af37)]/10 text-[var(--league-primary,#d4af37)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            All
          </button>
          {Array.from({ length: game.periodCount }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setActivePeriodTab(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                activePeriodTab === p
                  ? 'bg-[var(--league-primary,#d4af37)]/10 text-[var(--league-primary,#d4af37)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              P{p}
            </button>
          ))}
        </div>

        {/* Events List */}
        <div className="px-4 py-2">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--color-text-secondary)]">
              No events recorded yet. Select a team and tap an action below.
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredEvents.map(event => (
                <EventRow
                  key={event.id}
                  event={event}
                  homeTeamName={homeTeam.shortName || homeTeam.name}
                  awayTeamName={awayTeam.shortName || awayTeam.name}
                  onUndo={() => handleUndo(event.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Bar */}
      <QuickActionBar
        onGoal={() => handleAction('goal')}
        onPenalty={() => handleAction('penalty')}
        onShot={() => handleAction('shot')}
        disabled={!selectedTeam || game.status === 'completed'}
      />

      {/* Entry Modals */}
      {activeEntry?.type === 'goal' && activeTeam && selectedTeam && (
        <GoalEntry
          gameId={game.id}
          teamId={activeTeam.id}
          teamType={selectedTeam}
          teamName={activeTeam.name}
          teamColor={activeTeam.primaryColor}
          roster={activeTeam.roster}
          period={currentPeriod}
          gameTimeSeconds={periodLengthSeconds - (game.timerElapsedSeconds % periodLengthSeconds)}
          isPowerPlay={isPP}
          isShortHanded={isSH}
          isEmptyNet={isEN}
          onComplete={handleEntryComplete}
          onCancel={() => setActiveEntry(null)}
        />
      )}

      {activeEntry?.type === 'penalty' && activeTeam && selectedTeam && (
        <PenaltyEntry
          gameId={game.id}
          teamId={activeTeam.id}
          teamType={selectedTeam}
          teamName={activeTeam.name}
          teamColor={activeTeam.primaryColor}
          roster={activeTeam.roster}
          period={currentPeriod}
          gameTimeSeconds={periodLengthSeconds - (game.timerElapsedSeconds % periodLengthSeconds)}
          onComplete={handleEntryComplete}
          onCancel={() => setActiveEntry(null)}
        />
      )}

      {activeEntry?.type === 'shot' && selectedTeam && (
        <ShotEntry
          gameId={game.id}
          defendingTeamId={opposingTeam.id}
          defendingTeamType={selectedTeam === 'home' ? 'away' : 'home'}
          goalies={opposingTeam.roster.filter(p => p.position === 'Goalie')}
          shootingRoster={activeTeam!.roster}
          shootingTeamName={activeTeam!.name}
          shootingTeamColor={activeTeam!.primaryColor}
          period={currentPeriod}
          gameTimeSeconds={periodLengthSeconds - (game.timerElapsedSeconds % periodLengthSeconds)}
          onComplete={handleEntryComplete}
          onCancel={() => setActiveEntry(null)}
        />
      )}

      {/* Score Sheet Upload Modal */}
      {showScoreSheetUpload && (
        <ScoreSheetUpload
          gameId={game.id}
          game={game}
          onComplete={() => {
            setShowScoreSheetUpload(false);
            router.refresh();
          }}
          onClose={() => setShowScoreSheetUpload(false)}
        />
      )}

      {/* Game Summary Modal */}
      {showGameSummary && (
        <GameSummaryModal
          gameId={game.id}
          game={game}
          onClose={() => setShowGameSummary(false)}
        />
      )}
    </div>
  );
}

// =============================================================================
// EventRow sub-component
// =============================================================================

function EventRow({
  event,
  homeTeamName,
  awayTeamName,
  onUndo,
}: {
  event: GameEventData;
  homeTeamName: string;
  awayTeamName: string;
  onUndo: () => void;
}) {
  const teamName = event.teamType === 'home' ? homeTeamName : awayTeamName;

  const timeDisplay = event.gameTimeSeconds != null
    ? `${Math.floor(event.gameTimeSeconds / 60)}:${(event.gameTimeSeconds % 60).toString().padStart(2, '0')}`
    : '';

  let icon: React.ReactNode;
  let bgColor: string;
  let label: string;

  switch (event.eventType) {
    case 'goal':
      icon = (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
      bgColor = 'bg-green-500/10 text-green-400';
      label = `GOAL - #${event.playerNumber} ${event.playerName}`;
      if (event.assist1Name) {
        label += ` (${event.assist1Name}`;
        if (event.assist2Name) label += `, ${event.assist2Name}`;
        label += ')';
      }
      break;
    case 'penalty':
      icon = (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 22h20L12 2z" />
        </svg>
      );
      bgColor = 'bg-yellow-500/10 text-yellow-400';
      label = `PENALTY - #${event.playerNumber} ${event.playerName} - ${event.penaltyType} (${event.penaltyMinutes}min)`;
      break;
    case 'save':
      icon = (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      bgColor = 'bg-blue-500/10 text-blue-400';
      label = `SAVE - #${event.playerNumber} ${event.playerName}`;
      break;
    default:
      icon = null;
      bgColor = 'bg-gray-500/10 text-gray-400';
      label = event.eventType;
  }

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--color-surface)] group transition-colors">
      {/* Icon */}
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${bgColor}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[var(--color-text-primary)] truncate">
          {label}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--color-text-secondary)]">
            P{event.period} {timeDisplay}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {teamName}
          </span>
          {/* Flags */}
          {event.isPowerPlay && (
            <span className="text-[10px] font-bold text-yellow-400">PP</span>
          )}
          {event.isShortHanded && (
            <span className="text-[10px] font-bold text-blue-400">SH</span>
          )}
          {event.isEmptyNet && (
            <span className="text-[10px] font-bold text-purple-400">EN</span>
          )}
          {event.isGWG && (
            <span className="text-[10px] font-bold text-green-400">GWG</span>
          )}
        </div>
      </div>

      {/* Undo */}
      <button
        onClick={onUndo}
        className="flex-shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--color-text-secondary)] hover:text-red-400 transition-all"
        aria-label="Undo event"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </button>
    </div>
  );
}
