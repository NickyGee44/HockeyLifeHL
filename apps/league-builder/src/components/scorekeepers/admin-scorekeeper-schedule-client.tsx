'use client';

import { useState, useTransition, useMemo } from 'react';
import { bulkAssignScorekepers } from '@/lib/actions/scorekeeper-management';
import type { LeagueScorekeeper } from '@/lib/actions/scorekeeper-management';
import { cn } from '@hockey-life/ui';

// =============================================================================
// Types
// =============================================================================

interface ScheduleGame {
  id: string;
  scheduledAt: string;
  status: string;
  homeScore: number;
  awayScore: number;
  homeTeamName: string;
  awayTeamName: string;
  venueName: string | null;
  assignment: {
    id: string;
    scorekeeperId: string;
    scorekeeperName: string;
    assignedAt: string;
  } | null;
}

interface SwapRequestInfo {
  id: string;
  gameId: string;
  reason: string | null;
  status: string;
  createdAt: string;
  requestingName: string;
  acceptingName: string | null;
}

interface ScheduleTranslations {
  title: string;
  backToScorekeepers: string;
  upcomingGames: string;
  assigned: string;
  unassigned: string;
  pendingSwaps: string;
  pendingSwapRequests: string;
  wantsToSwap: string;
  filterAll: string;
  filterUnassigned: string;
  filterAssigned: string;
  noGamesMatch: string;
  live: string;
  needsSk: string;
  swap: string;
  quickAssign: string;
  assigning: string;
  assignedLabel: string;
}

interface AdminScorekeeperScheduleClientProps {
  leagueId: string;
  games: ScheduleGame[];
  scorekeepers: LeagueScorekeeper[];
  swapRequests: SwapRequestInfo[];
  locale: string;
  translations: ScheduleTranslations;
}

// =============================================================================
// Component
// =============================================================================

export function AdminScorekeeperScheduleClient({
  leagueId,
  games: initialGames,
  scorekeepers,
  swapRequests,
  locale,
  translations: t,
}: AdminScorekeeperScheduleClientProps) {
  const [games, setGames] = useState(initialGames);
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [isPending, startTransition] = useTransition();
  const [assigningGameId, setAssigningGameId] = useState<string | null>(null);

  const filteredGames = useMemo(() => {
    switch (filter) {
      case 'unassigned':
        return games.filter(g => !g.assignment);
      case 'assigned':
        return games.filter(g => !!g.assignment);
      default:
        return games;
    }
  }, [games, filter]);

  // Group by date
  const gamesByDate = useMemo(() => {
    const groups = new Map<string, ScheduleGame[]>();
    for (const game of filteredGames) {
      const dateKey = new Date(game.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const existing = groups.get(dateKey) || [];
      existing.push(game);
      groups.set(dateKey, existing);
    }
    return Array.from(groups.entries());
  }, [filteredGames]);

  const swapRequestMap = useMemo(() => {
    const map = new Map<string, SwapRequestInfo>();
    for (const sr of swapRequests) {
      map.set(sr.gameId, sr);
    }
    return map;
  }, [swapRequests]);

  const activeScorekepers = scorekeepers.filter(
    (sk) => sk.status === 'active'
  );

  function handleQuickAssign(gameId: string, scorekeeperId: string) {
    setAssigningGameId(gameId);
    startTransition(async () => {
      const result = await bulkAssignScorekepers({
        leagueId,
        assignments: [{ gameId, scorekeeperId }],
      });

      if (result.success) {
        // Update local state
        const sk = scorekeepers.find(s => s.scorekeeper_id === scorekeeperId);
        setGames(prev => prev.map(g => {
          if (g.id === gameId) {
            return {
              ...g,
              assignment: {
                id: `temp-${Date.now()}`,
                scorekeeperId,
                scorekeeperName: sk?.display_name || sk?.profile?.full_name || 'Assigned',
                assignedAt: new Date().toISOString(),
              },
            };
          }
          return g;
        }));
      }
      setAssigningGameId(null);
    });
  }

  return (
    <div>
      {/* Swap Requests Banner */}
      {swapRequests.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">
            {t.pendingSwapRequests} ({swapRequests.length})
          </h3>
          <div className="space-y-2">
            {swapRequests.slice(0, 5).map((sr) => {
              const game = games.find(g => g.id === sr.gameId);
              return (
                <div key={sr.id} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-300">
                    {sr.requestingName} {t.wantsToSwap} {game ? `${game.homeTeamName} vs ${game.awayTeamName}` : ''}
                  </span>
                  {sr.reason && (
                    <span className="text-neutral-500 text-xs">
                      {sr.reason}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'unassigned', 'assigned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              filter === f
                ? 'bg-rink-500 text-white'
                : 'bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]'
            )}
          >
            {f === 'all' ? `${t.filterAll} (${games.length})` :
             f === 'unassigned' ? `${t.filterUnassigned} (${games.filter(g => !g.assignment).length})` :
             `${t.filterAssigned} (${games.filter(g => !!g.assignment).length})`}
          </button>
        ))}
      </div>

      {/* Games List */}
      {gamesByDate.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/10 rounded-xl p-8 text-center">
          <p className="text-neutral-400">{t.noGamesMatch}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {gamesByDate.map(([dateStr, dateGames]) => (
            <div key={dateStr}>
              <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                {dateStr}
              </h3>
              <div className="space-y-2">
                {dateGames.map((game) => {
                  const swapRequest = swapRequestMap.get(game.id);
                  const isAssigning = assigningGameId === game.id;
                  const date = new Date(game.scheduledAt);

                  return (
                    <div
                      key={game.id}
                      className={cn(
                        'bg-white/[0.04] border rounded-xl p-4',
                        !game.assignment ? 'border-amber-500/30' :
                        swapRequest ? 'border-blue-500/30' :
                        'border-white/10'
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Game Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-neutral-500">
                              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            {game.status === 'in_progress' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 text-red-400 text-xs font-semibold rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                {t.live}
                              </span>
                            )}
                            {!game.assignment && (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded">
                                {t.needsSk}
                              </span>
                            )}
                            {swapRequest && (
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded">
                                {t.swap}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-white truncate">
                            {game.homeTeamName} vs {game.awayTeamName}
                          </p>
                          {game.venueName && (
                            <p className="text-xs text-neutral-500 mt-0.5">{game.venueName}</p>
                          )}
                        </div>

                        {/* Assignment / Quick-Assign */}
                        <div className="flex-shrink-0">
                          {game.assignment ? (
                            <div className="text-right">
                              <p className="text-sm font-medium text-green-400">
                                {game.assignment.scorekeeperName}
                              </p>
                              <p className="text-xs text-neutral-500">{t.assignedLabel}</p>
                            </div>
                          ) : (
                            <select
                              disabled={isAssigning || isPending}
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleQuickAssign(game.id, e.target.value);
                                }
                              }}
                              className="bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:bg-white/[0.1] transition-colors disabled:opacity-50 disabled:cursor-wait min-w-[160px]"
                              defaultValue=""
                            >
                              <option value="" disabled>
                                {isAssigning ? t.assigning : t.quickAssign}
                              </option>
                              {activeScorekepers.map((sk) => (
                                <option key={sk.id} value={sk.scorekeeper_id}>
                                  {sk.display_name || sk.profile?.full_name || sk.email || 'Scorekeeper'}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
