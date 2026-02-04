'use client';

/**
 * Result Step
 *
 * Final step showing generation results and schedule summary.
 */

import { cn } from '@hockey-life/ui/lib/utils';
import { CheckCircle, AlertTriangle, Calendar, Users, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import type { ScheduleGenerationResult, Team } from '@/lib/schedule/types';

// ============================================================================
// TYPES
// ============================================================================

interface ResultStepProps {
  result: ScheduleGenerationResult;
  teams: Team[];
  onSave: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ResultStep({ result, teams, onSave }: ResultStepProps) {
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));

  // Calculate home/away balance
  const balanceData = teams.map((team) => ({
    team,
    home: result.homeGamesPerTeam[team.id] ?? 0,
    away: result.awayGamesPerTeam[team.id] ?? 0,
    total: result.gamesPerTeam[team.id] ?? 0,
    balance: (result.homeGamesPerTeam[team.id] ?? 0) - (result.awayGamesPerTeam[team.id] ?? 0),
  }));

  // Get first and last game dates
  const sortedGames = [...result.games].sort(
    (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
  );
  const firstGame = sortedGames[0];
  const lastGame = sortedGames[sortedGames.length - 1];

  // Group games by round
  const gamesByRound: Record<number, typeof result.games> = {};
  for (const game of result.games) {
    if (!gamesByRound[game.roundNumber]) {
      gamesByRound[game.roundNumber] = [];
    }
    gamesByRound[game.roundNumber].push(game);
  }

  return (
    <div className="space-y-6">
      {/* Success/Failure Header */}
      {result.success ? (
        <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-green-400">Schedule Generated Successfully!</h3>
          <p className="text-sm text-green-400/80 mt-2">
            {result.totalGames} games have been scheduled. Review the details below and save to apply.
          </p>
        </div>
      ) : (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-red-400">Schedule Generation Failed</h3>
          <p className="text-sm text-red-400/80 mt-2">
            {result.error ?? 'Unable to generate a valid schedule with the given constraints.'}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
          <Calendar className="w-6 h-6 text-rink-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{result.totalGames}</div>
          <div className="text-sm text-neutral-400">Total Games</div>
        </div>

        <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
          <Users className="w-6 h-6 text-rink-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{teams.length}</div>
          <div className="text-sm text-neutral-400">Teams</div>
        </div>

        <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
          <Clock className="w-6 h-6 text-rink-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{result.durationMs}ms</div>
          <div className="text-sm text-neutral-400">Generation Time</div>
        </div>

        <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{result.constraintViolations.length}</div>
          <div className="text-sm text-neutral-400">Soft Violations</div>
        </div>
      </div>

      {/* Date Range */}
      {firstGame && lastGame && (
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-neutral-300 mb-3">Schedule Period</h4>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-neutral-500">First Game</div>
              <div className="text-white font-medium">
                {firstGame.scheduledAt.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
            <div className="text-neutral-600">→</div>
            <div className="text-right">
              <div className="text-sm text-neutral-500">Last Game</div>
              <div className="text-white font-medium">
                {lastGame.scheduledAt.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Home/Away Balance */}
      <div className="bg-neutral-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-neutral-300 mb-3">Home/Away Balance</h4>
        <div className="space-y-2">
          {balanceData.map(({ team, home, away, balance }) => (
            <div key={team.id} className="flex items-center gap-4">
              <div className="w-32 truncate text-sm text-white">{team.name}</div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-2 bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rink-500"
                    style={{ width: `${(home / (home + away)) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-20 text-right text-sm">
                <span className="text-green-400">{home}H</span>
                <span className="text-neutral-500 mx-1">/</span>
                <span className="text-blue-400">{away}A</span>
              </div>
              <div className={cn('w-8 text-right text-sm font-medium', balance > 0 ? 'text-green-400' : balance < 0 ? 'text-red-400' : 'text-neutral-400')}>
                {balance > 0 ? '+' : ''}{balance}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constraint Violations */}
      {result.constraintViolations.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Soft Constraint Violations ({result.constraintViolations.length})
          </h4>
          <ul className="space-y-1 text-sm text-yellow-400/80">
            {result.constraintViolations.slice(0, 5).map((v, i) => (
              <li key={i}>• Game #{v.gameIndex}: {v.message}</li>
            ))}
            {result.constraintViolations.length > 5 && (
              <li className="text-yellow-400/60">
                ... and {result.constraintViolations.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Sample Games Preview */}
      {result.games.length > 0 && (
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-neutral-300 mb-3">
            Sample Games (First Round)
          </h4>
          <div className="space-y-2">
            {(gamesByRound[1] ?? result.games.slice(0, 5)).map((game, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm text-neutral-500">
                    {game.scheduledAt.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-sm text-neutral-400">
                    {game.scheduledAt.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-white font-medium">
                    {teamsById[game.homeTeamId]?.name ?? 'Unknown'}
                  </span>
                  <span className="text-neutral-500">vs</span>
                  <span className="text-white font-medium">
                    {teamsById[game.awayTeamId]?.name ?? 'Unknown'}
                  </span>
                </div>
                <div className="text-sm text-neutral-500">{game.location}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Prompt */}
      {result.success && (
        <div className="p-4 bg-rink-500/10 border border-rink-500/30 rounded-lg text-center">
          <p className="text-rink-400">
            Click <strong>Save Schedule</strong> to apply these games to your season.
          </p>
        </div>
      )}
    </div>
  );
}
