'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface EligibilityPlayer {
  player_id: string;
  team_id: string;
  full_name: string | null;
  jersey_number: number | null;
  games_played: number;
  total_team_games: number;
  games_played_pct: number;
  is_eligible: boolean;
  min_games_pct: number | null;
  min_games: number | null;
}

interface PlayoffEligibilityProps {
  seasonId: string;
  teamId: string;
}

export function PlayoffEligibility({ seasonId, teamId }: PlayoffEligibilityProps) {
  const [players, setPlayers] = useState<EligibilityPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEligibility() {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('get_playoff_eligibility', {
        p_season_id: seasonId,
        p_team_id: teamId,
      });

      if (rpcError) {
        setError(rpcError.message);
      } else {
        setPlayers((data ?? []) as EligibilityPlayer[]);
      }

      setIsLoading(false);
    }

    fetchEligibility();
  }, [seasonId, teamId]);

  if (isLoading) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <div className="flex items-center justify-center gap-2 text-[var(--color-text-secondary)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading eligibility...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--color-surface)] border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          Failed to load eligibility data
        </div>
      </div>
    );
  }

  // If no eligibility rules are set, show a simple message
  const hasRules = players.length > 0 && (players[0].min_games_pct !== null || players[0].min_games !== null);

  if (!hasRules) {
    return null;
  }

  const eligibleCount = players.filter((p) => p.is_eligible).length;
  const ineligibleCount = players.length - eligibleCount;
  const minPct = players[0]?.min_games_pct;
  const minGames = players[0]?.min_games;
  const totalTeamGames = players[0]?.total_team_games ?? 0;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--league-primary)]" />
          Playoff Eligibility
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          {minPct !== null && `Min ${minPct}% of team games`}
          {minPct !== null && minGames !== null && ' or '}
          {minGames !== null && `min ${minGames} games`}
          {totalTeamGames > 0 && ` (${totalTeamGames} team games played)`}
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-green-400">{eligibleCount}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Eligible</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-red-400">{ineligibleCount}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Ineligible</p>
          </div>
        </div>
      </div>

      {/* Player list */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--color-surface-hover)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Player
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                GP
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Eligible
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {players.map((player) => {
              const gamesNeeded = getGamesNeeded(player);
              return (
                <tr
                  key={player.player_id}
                  className="hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                    {player.full_name || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-[var(--color-text-secondary)]">
                    {player.jersey_number ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[var(--color-text-primary)]">
                      {player.games_played}
                    </span>
                    <span className="text-[var(--color-text-muted)]">
                      {' / '}{player.total_team_games}
                    </span>
                    <span className="text-[var(--color-text-secondary)] text-xs ml-1">
                      ({player.games_played_pct}%)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {player.is_eligible ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <XCircle className="w-5 h-5 text-red-400" />
                        {gamesNeeded > 0 && (
                          <span className="text-xs text-red-400 mt-0.5">
                            Needs {gamesNeeded} more
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getGamesNeeded(player: EligibilityPlayer): number {
  if (player.is_eligible) return 0;

  let needed = 0;

  if (player.min_games !== null) {
    const gamesForAbsolute = player.min_games - player.games_played;
    needed = Math.max(needed, gamesForAbsolute);
  }

  if (player.min_games_pct !== null && player.total_team_games > 0) {
    const gamesForPct = Math.ceil(
      (player.min_games_pct / 100) * player.total_team_games
    ) - player.games_played;
    needed = Math.max(needed, gamesForPct);
  }

  return Math.max(0, needed);
}
