'use client';

import { startTransition, useEffect, useState } from 'react';
import type { GamePreview, TeamWithStats } from '@/lib/types';
import type { PublicLiveGameState, LiveGameEvent, LivePenaltyState } from '@/lib/game/live-state';
import { GamePreviewHeader } from './GamePreviewHeader';

interface LiveGameExperienceProps {
  initialGame: GamePreview;
  homeTeam: TeamWithStats;
  awayTeam: TeamWithStats;
  leagueSlug: string;
  timezone?: string;
  initialLiveState?: PublicLiveGameState | null;
}

function formatEventClock(gameTimeSeconds: number | null): string {
  if (gameTimeSeconds == null || !Number.isFinite(gameTimeSeconds)) {
    return '--:--';
  }

  const minutes = Math.floor(gameTimeSeconds / 60);
  const seconds = Math.floor(gameTimeSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function eventAccent(event: LiveGameEvent): string {
  if (event.eventType === 'goal') return 'border-green-500/30 bg-green-500/5';
  if (event.eventType === 'penalty') return 'border-yellow-500/30 bg-yellow-500/5';
  if (event.eventType === 'save') return 'border-blue-500/30 bg-blue-500/5';
  return 'border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-background-elevated)_94%,transparent)]';
}

function eventLabel(event: LiveGameEvent): string {
  if (event.eventType === 'goal') return 'Goal';
  if (event.eventType === 'penalty') return event.penaltyType ? `Penalty • ${event.penaltyType}` : 'Penalty';
  if (event.eventType === 'save') return 'Save';
  return event.eventType;
}

export function LiveGameExperience({
  initialGame,
  homeTeam,
  awayTeam,
  leagueSlug,
  timezone = 'America/Toronto',
  initialLiveState = null,
}: LiveGameExperienceProps) {
  const [game, setGame] = useState(initialGame);
  const [liveState, setLiveState] = useState<PublicLiveGameState | null>(initialLiveState);
  const shouldPoll = game.status === 'scheduled' || game.status === 'in_progress';

  useEffect(() => {
    if (!shouldPoll) {
      return undefined;
    }

    let cancelled = false;

    const loadLiveState = async () => {
      try {
        const response = await fetch(`/api/public/live-game?gameId=${game.id}`, {
          cache: 'no-store',
        });
        if (!response.ok || cancelled) return;

        const nextState = await response.json() as PublicLiveGameState;
        if (cancelled) return;

        startTransition(() => {
          setLiveState(nextState);
          setGame((previous) => ({
            ...previous,
            status: nextState.game.status as GamePreview['status'],
            home_score: nextState.game.homeScore,
            away_score: nextState.game.awayScore,
            period: nextState.game.period,
            period_time: nextState.game.periodTime,
          }));
        });
      } catch (error) {
        console.error('[live-game] Failed to refresh live game state', error);
      }
    };

    void loadLiveState();
    const intervalId = window.setInterval(loadLiveState, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [game.id, shouldPoll]);

  const showLivePanel = game.status === 'in_progress' && liveState;

  return (
    <>
      <GamePreviewHeader
        game={game}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        leagueSlug={leagueSlug}
        timezone={timezone}
      /> 

      {showLivePanel ? (
        <div className="glass-card-strong mx-4 mt-4 overflow-hidden rounded-[28px]">
          <div className="container mx-auto px-4 py-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-400">
                      <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                      Live Game
                    </span>
                    {liveState.activePenalties.strengthLabel ? (
                      <span className="glass-control rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                        Strength {liveState.activePenalties.strengthLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                    Period {liveState.game.period ?? '-'} • {liveState.game.periodTime ?? '--:--'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <StatCard label={`${awayTeam.name} Shots`} value={liveState.game.awayShots} />
                  <StatCard label={`${homeTeam.name} Shots`} value={liveState.game.homeShots} />
                  <StatCard label={`${awayTeam.name} Goals`} value={liveState.game.awayScore} />
                  <StatCard label={`${homeTeam.name} Goals`} value={liveState.game.homeScore} />
                </div>
              </div>

              {(liveState.activePenalties.home.length > 0 || liveState.activePenalties.away.length > 0) ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <PenaltyColumn title={`${awayTeam.name} penalties`} penalties={liveState.activePenalties.away} />
                  <PenaltyColumn title={`${homeTeam.name} penalties`} penalties={liveState.activePenalties.home} />
                </div>
              ) : null}

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Latest Events
                </h3>
                {liveState.events.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-6 text-sm text-[var(--color-text-secondary)]">
                    No live events recorded yet.
                  </div>
                ) : (
                  <div className="mt-3 grid gap-2">
                    {liveState.events.map((event) => (
                      <div
                        key={event.id}
                        className={`rounded-2xl border px-3 py-3 ${eventAccent(event)}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="glass-control min-w-12 rounded-xl px-2 py-1 text-center text-xl font-black tabular-nums text-[var(--league-primary,#d4af37)]">
                            {event.playerNumber || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                              {eventLabel(event)}
                            </div>
                            <div className="truncate text-xs text-[var(--color-text-secondary)]">
                              {event.playerName}
                              {event.eventType === 'goal' && event.assist1Name ? ` • A: #${event.assist1Number ?? '?'} ${event.assist1Name}` : ''}
                              {event.eventType === 'goal' && event.assist2Name ? `, #${event.assist2Number ?? '?'} ${event.assist2Name}` : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                              P{event.period}
                            </div>
                            <div className="text-xs text-[var(--color-text-secondary)]">
                              {formatEventClock(event.gameTimeSeconds)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card rounded-2xl px-3 py-2">
      <div className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</div>
    </div>
  );
}

function PenaltyColumn({ title, penalties }: { title: string; penalties: LivePenaltyState[] }) {
  return (
    <div className="glass-card rounded-2xl p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">{title}</h3>
      <div className="mt-3 grid gap-2">
        {penalties.map((penalty) => (
          <div key={penalty.eventId} className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
            <div className="glass-control min-w-10 rounded-lg px-2 py-1 text-center text-lg font-black tabular-nums text-yellow-400">
              {penalty.playerNumber || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{penalty.playerName}</div>
              <div className="truncate text-xs text-[var(--color-text-secondary)]">
                {penalty.penaltyType || 'Penalty'} • {penalty.penaltyMinutes} min
              </div>
            </div>
            <div className="text-sm font-bold tabular-nums text-yellow-400">
              {formatEventClock(penalty.remainingSeconds)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
