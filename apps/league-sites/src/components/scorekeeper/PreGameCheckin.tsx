'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import type { GameData, CheckinPlayer } from '@/lib/actions/scorekeeper';
import { updateScorekeeperCheckin, updateGameStatus } from '@/lib/actions/scorekeeper';

interface PreGameCheckinProps {
  game: GameData;
  checkins: { homeTeam: CheckinPlayer[]; awayTeam: CheckinPlayer[] };
  onGameStarted: () => void;
}

export function PreGameCheckin({ game, checkins: initialCheckins, onGameStarted }: PreGameCheckinProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');
  const [checkins, setCheckins] = useState(initialCheckins);
  const [loading, setLoading] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  // Track whether each team has been reviewed (user visited the tab)
  const [reviewed, setReviewed] = useState<{ home: boolean; away: boolean }>({ home: true, away: false });

  const homeTeam = game.homeTeam;
  const awayTeam = game.awayTeam;

  const homeColor = homeTeam.primaryColor || 'var(--league-primary, #d4af37)';
  const awayColor = awayTeam.primaryColor || 'var(--league-primary, #d4af37)';

  const currentRoster = activeTab === 'home' ? checkins.homeTeam : checkins.awayTeam;
  const currentTeam = activeTab === 'home' ? homeTeam : awayTeam;
  const currentColor = activeTab === 'home' ? homeColor : awayColor;

  // Counts per team
  const homeConfirmed = checkins.homeTeam.filter(p => p.checkinStatus === 'confirmed').length;
  const awayConfirmed = checkins.awayTeam.filter(p => p.checkinStatus === 'confirmed').length;
  const confirmedCount = activeTab === 'home' ? homeConfirmed : awayConfirmed;

  // Both teams reviewed = can start
  const bothReviewed = reviewed.home && reviewed.away;

  // Whether every player on each team has been marked IN or OUT (no nulls/tentative)
  const homeAllDecided = checkins.homeTeam.every(p => p.checkinStatus === 'confirmed' || p.checkinStatus === 'out');
  const awayAllDecided = checkins.awayTeam.every(p => p.checkinStatus === 'confirmed' || p.checkinStatus === 'out');

  const handleTabSwitch = useCallback((tab: 'home' | 'away') => {
    setActiveTab(tab);
    setReviewed(prev => ({ ...prev, [tab]: true }));
  }, []);

  const handleSetStatus = useCallback(async (player: CheckinPlayer, newStatus: 'confirmed' | 'out') => {
    if (player.checkinStatus === newStatus) return; // Already set
    const teamId = activeTab === 'home' ? homeTeam.id : awayTeam.id;

    setLoading(player.id);

    // Optimistic update
    setCheckins(prev => {
      const key = activeTab === 'home' ? 'homeTeam' : 'awayTeam';
      return {
        ...prev,
        [key]: prev[key].map(p =>
          p.id === player.id ? { ...p, checkinStatus: newStatus } : p
        ),
      };
    });

    const result = await updateScorekeeperCheckin(game.id, player.id, teamId, newStatus);

    if (!result.success) {
      // Revert on failure
      setCheckins(prev => {
        const key = activeTab === 'home' ? 'homeTeam' : 'awayTeam';
        return {
          ...prev,
          [key]: prev[key].map(p =>
            p.id === player.id ? { ...p, checkinStatus: player.checkinStatus } : p
          ),
        };
      });
    }

    setLoading(null);
  }, [activeTab, homeTeam.id, awayTeam.id, game.id]);

  const handleCheckAllIn = useCallback(async () => {
    const key = activeTab === 'home' ? 'homeTeam' : 'awayTeam';
    const teamId = activeTab === 'home' ? homeTeam.id : awayTeam.id;
    const pending = checkins[key].filter(p => p.checkinStatus !== 'confirmed');

    if (pending.length === 0) return;

    // Optimistic: mark all as confirmed
    setCheckins(prev => ({
      ...prev,
      [key]: prev[key].map(p => ({ ...p, checkinStatus: 'confirmed' as const })),
    }));

    // Fire updates in parallel
    await Promise.all(
      pending.map(p => updateScorekeeperCheckin(game.id, p.id, teamId, 'confirmed'))
    );
  }, [activeTab, homeTeam.id, awayTeam.id, game.id, checkins]);

  const handleStartGame = useCallback(async () => {
    setStarting(true);
    const result = await updateGameStatus(game.id, 'in_progress');
    if (result.success) {
      onGameStarted();
    }
    setStarting(false);
  }, [game.id, onGameStarted]);

  // Sorted roster: goalies first, then by jersey number
  const sortedRoster = useMemo(() => {
    return [...currentRoster].sort((a, b) => {
      if (a.isSub !== b.isSub) return Number(a.isSub) - Number(b.isSub);
      if (a.position === 'Goalie' && b.position !== 'Goalie') return -1;
      if (a.position !== 'Goalie' && b.position === 'Goalie') return 1;
      if (a.jerseyNumber !== null && b.jerseyNumber !== null) return a.jerseyNumber - b.jerseyNumber;
      if (a.jerseyNumber !== null) return -1;
      if (b.jerseyNumber !== null) return 1;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [currentRoster]);

  const positionAbbrev = (pos: string) => {
    switch (pos) {
      case 'Forward': return 'F';
      case 'Defense': return 'D';
      case 'Goalie': return 'G';
      default: return pos.charAt(0);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <div className="text-center">
          <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
            Pre-Game Check-In
          </div>
          <div className="text-sm font-bold text-[var(--color-text-primary)]">
            {homeTeam.shortName || homeTeam.name} vs {awayTeam.shortName || awayTeam.name}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <StepPill
            label={homeTeam.shortName || homeTeam.name}
            active={activeTab === 'home'}
            done={reviewed.home && homeAllDecided}
            color={homeColor}
            count={`${homeConfirmed}/${checkins.homeTeam.length}`}
            onClick={() => handleTabSwitch('home')}
          />
          <svg className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <StepPill
            label={awayTeam.shortName || awayTeam.name}
            active={activeTab === 'away'}
            done={reviewed.away && awayAllDecided}
            color={awayColor}
            count={`${awayConfirmed}/${checkins.awayTeam.length}`}
            onClick={() => handleTabSwitch('away')}
          />
        </div>
      </div>

      {/* Section Header with bulk actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface)]">
        <div className="text-xs font-medium text-[var(--color-text-secondary)]">
          {confirmedCount}/{currentRoster.length} checked in
        </div>
        <button
          onClick={handleCheckAllIn}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors bg-green-500/10 text-green-400 hover:bg-green-500/20 active:scale-95"
        >
          All IN
        </button>
      </div>

      {/* Player List */}
      <div className="flex-1 overflow-y-auto">
        {sortedRoster.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-text-secondary)]">
            No active players on roster
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {sortedRoster.map(player => {
              const isConfirmed = player.checkinStatus === 'confirmed';
              const isOut = player.checkinStatus === 'out';
              const isLoading = loading === player.id;
              const isUndecided = !isConfirmed && !isOut;

              return (
                <div
                  key={player.id}
                  className={`flex items-center px-4 py-2.5 min-h-[56px] transition-colors ${
                    isUndecided ? 'bg-yellow-500/5' : ''
                  }`}
                >
                  {/* Avatar + Jersey */}
                  <div className="relative flex-shrink-0">
                    {player.avatarUrl ? (
                      <>
                        <Image
                          src={player.avatarUrl}
                          alt={player.fullName}
                          width={40}
                          height={40}
                          className={`w-10 h-10 rounded-full object-cover border-2 transition-opacity ${
                            isOut ? 'opacity-40' : ''
                          }`}
                          style={{ borderColor: currentTeam.primaryColor || 'var(--color-border)' }}
                        />
                        <div
                          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold border border-[var(--color-background)]"
                          style={{
                            backgroundColor: currentColor,
                            color: '#fff',
                          }}
                        >
                          {player.jerseyNumber ?? 'S'}
                        </div>
                      </>
                    ) : (
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border-2 transition-opacity ${
                          isOut ? 'opacity-40' : ''
                        }`}
                        style={{
                          backgroundColor: currentTeam.primaryColor
                            ? `${currentTeam.primaryColor}20`
                            : 'var(--color-surface)',
                          color: currentTeam.primaryColor || 'var(--color-text-primary)',
                          borderColor: currentTeam.primaryColor || 'var(--color-border)',
                        }}
                      >
                        {player.jerseyNumber ?? 'S'}
                      </div>
                    )}
                  </div>

                  {/* Name + Position */}
                  <div className={`flex-1 min-w-0 ml-3 transition-opacity ${isOut ? 'opacity-40' : ''}`}>
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}
                      {player.fullName}
                    </div>
                    {player.isSub ? (
                      <span className="mr-1 inline-block rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                        Spare
                      </span>
                    ) : null}
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      player.position === 'Goalie'
                        ? 'bg-purple-500/10 text-purple-400'
                        : player.position === 'Defense'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-green-500/10 text-green-400'
                    }`}>
                      {positionAbbrev(player.position)}
                    </span>
                  </div>

                  {/* IN / OUT Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {isLoading ? (
                      <div className="w-[104px] flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin text-[var(--color-text-secondary)]" />
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSetStatus(player, 'confirmed')}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                            isConfirmed
                              ? 'bg-green-500 text-white shadow-sm shadow-green-500/30'
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          }`}
                        >
                          IN
                        </button>
                        <button
                          onClick={() => handleSetStatus(player, 'out')}
                          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                            isOut
                              ? 'bg-red-500 text-white shadow-sm shadow-red-500/30'
                              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}
                        >
                          OUT
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom: Next Team / Start Game */}
      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
        {/* Warning if not both teams reviewed */}
        {!bothReviewed && (
          <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-xs font-medium text-yellow-400">
              Check in both teams before starting the game
            </span>
          </div>
        )}

        {/* Show "Next: Away Team" button when on home tab and away not yet reviewed */}
        {activeTab === 'home' && !reviewed.away ? (
          <button
            onClick={() => handleTabSwitch('away')}
            className="w-full py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              backgroundColor: awayColor,
              color: '#fff',
            }}
          >
            Next: {awayTeam.shortName || awayTeam.name}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleStartGame}
            disabled={starting || !bothReviewed}
            className="w-full py-4 rounded-xl bg-[var(--league-primary,#d4af37)] text-[var(--color-accent-text,#000)] font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {starting ? 'Starting...' : !bothReviewed ? 'Check in both teams first' : 'Start Game'}
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// StepPill sub-component — progress indicator for each team
// =============================================================================

function StepPill({
  label,
  active,
  done,
  color,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  done: boolean;
  color: string;
  count: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
        active
          ? 'ring-2 ring-offset-1 ring-offset-[var(--color-background)]'
          : 'opacity-70 hover:opacity-100'
      }`}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        ...(active ? { '--tw-ring-color': color } as any : {}),
      }}
    >
      {done ? (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      ) : (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current flex-shrink-0" />
      )}
      <span className="truncate max-w-[80px]">{label}</span>
      <span className="opacity-60">{count}</span>
    </button>
  );
}
