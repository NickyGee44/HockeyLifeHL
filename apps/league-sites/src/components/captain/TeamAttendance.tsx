'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar,
  AlertTriangle,
  Loader2,
  Users,
  UserPlus,
} from 'lucide-react';
import type { RosterPlayer } from '@/lib/actions/captain-roster';

interface UpcomingGame {
  id: string;
  scheduled_at: string;
  venue: string | null;
  home_team_id: string;
  away_team_id: string;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
}

interface CheckinEntry {
  game_id: string;
  player_id: string;
  status: string;
}

interface TeamAttendanceProps {
  teamId: string;
  roster: RosterPlayer[];
  leagueId?: string | null;
  seasonId?: string | null;
  leagueSlug: string;
  onRequestSub?: (gameId: string) => void;
}

const MIN_ROSTER_THRESHOLD = 8;

export function TeamAttendance({
  teamId,
  roster,
  leagueId,
  seasonId,
  leagueSlug: _leagueSlug,
  onRequestSub,
}: TeamAttendanceProps) {
  const [games, setGames] = useState<UpcomingGame[]>([]);
  const [checkins, setCheckins] = useState<CheckinEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      // Fetch next 6 upcoming games for this team
      let gamesQuery = supabase
        .from('games')
        .select(`
          id,
          scheduled_at,
          location,
          league_id,
          season_id,
          home_team_id,
          away_team_id,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(6);

      if (leagueId) {
        gamesQuery = gamesQuery.eq('league_id', leagueId);
      }

      if (seasonId) {
        gamesQuery = gamesQuery.eq('season_id', seasonId);
      }

      const { data: gamesData } = await gamesQuery;

      if (gamesData) {
        const transformed = gamesData.map((g: any) => ({
          ...g,
          home_team: Array.isArray(g.home_team) ? g.home_team[0] : g.home_team,
          away_team: Array.isArray(g.away_team) ? g.away_team[0] : g.away_team,
        }));
        setGames(transformed);

        // Fetch checkins for these games
        const gameIds = transformed.map((g: UpcomingGame) => g.id);
        if (gameIds.length > 0) {
          const { data: checkinsData } = await supabase
            .from('game_checkins')
            .select('game_id, player_id, status')
            .eq('team_id', teamId)
            .in('game_id', gameIds);

          if (checkinsData) {
            setCheckins(checkinsData);
          }
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [leagueId, seasonId, teamId]);

  const getPlayerStatus = (
    playerId: string,
    gameId: string
  ): string | null => {
    const entry = checkins.find(
      (c) => c.player_id === playerId && c.game_id === gameId
    );
    return entry?.status || null;
  };

  const getGameConfirmedCount = (gameId: string): number => {
    return checkins.filter(
      (c) => c.game_id === gameId && c.status === 'confirmed'
    ).length;
  };

  const formatGameDate = (dateStr: string, isHome: boolean, opponent: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let prefix: string;
    if (date.toDateString() === today.toDateString()) {
      prefix = 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      prefix = 'Tmrw';
    } else {
      prefix = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }

    return `${prefix} ${isHome ? 'vs' : '@'} ${opponent}`;
  };

  if (isLoading) {
    return (
      <div className="glass-card-strong rounded-xl p-6">
        <div className="flex items-center justify-center gap-2 text-[var(--color-text-secondary)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading attendance...
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="glass-card-strong rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
          Team Attendance
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
          No upcoming games scheduled
        </p>
      </div>
    );
  }

  const statusColor = (status: string | null): string => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 text-green-400';
      case 'tentative':
        return 'bg-amber-500/20 text-amber-400';
      case 'out':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]';
    }
  };

  const statusSymbol = (status: string | null): string => {
    switch (status) {
      case 'confirmed':
        return 'IN';
      case 'tentative':
        return '?';
      case 'out':
        return 'OUT';
      default:
        return '-';
    }
  };

  return (
    <div className="glass-card-strong rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
          Team Attendance
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-hover)]">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider sticky left-0 bg-[var(--color-surface-hover)] z-10 min-w-[160px]">
                Player
              </th>
              {games.map((game) => {
                const isHome = game.home_team_id === teamId;
                const opponent = isHome
                  ? game.away_team?.name || 'TBD'
                  : game.home_team?.name || 'TBD';

                return (
                  <th
                    key={game.id}
                    className="px-2 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)] min-w-[80px]"
                  >
                    <div className="truncate">
                      {formatGameDate(game.scheduled_at, isHome, opponent)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {roster.map((player) => {
              const name = player.profile?.full_name || 'Unknown';

              return (
                <tr
                  key={player.id}
                  className="hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <td className="glass-control sticky left-0 z-10 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--color-text-muted)] w-6 text-right">
                        {player.jersey_number ?? '-'}
                      </span>
                      <span className="font-medium text-[var(--color-text-primary)] truncate">
                        {name}
                      </span>
                    </div>
                  </td>
                  {games.map((game) => {
                    const status = getPlayerStatus(
                      player.player_id,
                      game.id
                    );
                    return (
                      <td key={game.id} className="px-2 py-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-bold ${statusColor(
                            status
                          )}`}
                        >
                          {statusSymbol(status)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Footer totals */}
            <tr className="bg-[var(--color-surface-hover)] font-semibold">
              <td className="px-4 py-2 sticky left-0 bg-[var(--color-surface-hover)] z-10">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  <span className="text-xs text-[var(--color-text-secondary)] uppercase">
                    Confirmed
                  </span>
                </div>
              </td>
              {games.map((game) => {
                const confirmed = getGameConfirmedCount(game.id);
                const isShort = confirmed < MIN_ROSTER_THRESHOLD;

                return (
                  <td key={game.id} className="px-2 py-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`text-sm font-bold ${
                          isShort
                            ? 'text-red-400'
                            : 'text-green-400'
                        }`}
                      >
                        {confirmed}
                      </span>
                      {isShort && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          {onRequestSub && (
                            <button
                              onClick={() => onRequestSub(game.id)}
                              className="text-xs text-[var(--league-primary)] hover:underline flex items-center gap-0.5"
                            >
                              <UserPlus className="w-3 h-3" />
                              Sub
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-[var(--color-border)] flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500/20" /> Confirmed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500/20" /> Tentative
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500/20" /> Out
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-[var(--color-surface-hover)]" /> No Response
        </span>
      </div>
    </div>
  );
}
