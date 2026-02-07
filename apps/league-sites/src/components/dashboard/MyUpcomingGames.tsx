'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Check,
  HelpCircle,
  X,
  Loader2,
} from 'lucide-react';
import { updateGameCheckin, type CheckinStatus } from '@/lib/actions/checkins';

interface UpcomingGame {
  id: string;
  scheduled_at: string;
  venue: string | null;
  home_team_id: string;
  away_team_id: string;
  home_team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  } | null;
  away_team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
  } | null;
}

interface MyUpcomingGamesProps {
  teamId?: string;
  leagueSlug: string;
}

export function MyUpcomingGames({ teamId, leagueSlug }: MyUpcomingGamesProps) {
  const [games, setGames] = useState<UpcomingGame[]>([]);
  const [checkins, setCheckins] = useState<Record<string, CheckinStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [updatingGame, setUpdatingGame] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      const supabase = createClient();

      // Fetch games
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          id,
          scheduled_at,
          venue,
          home_team_id,
          away_team_id,
          home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url),
          away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (!gamesError && gamesData) {
        const transformedGames = gamesData.map((game: any) => {
          const rawHomeTeam = Array.isArray(game.home_team)
            ? game.home_team[0]
            : game.home_team;
          const rawAwayTeam = Array.isArray(game.away_team)
            ? game.away_team[0]
            : game.away_team;
          return {
            ...game,
            home_team: rawHomeTeam
              ? { ...rawHomeTeam, logo: rawHomeTeam.logo_url }
              : null,
            away_team: rawAwayTeam
              ? { ...rawAwayTeam, logo: rawAwayTeam.logo_url }
              : null,
          };
        });
        setGames(transformedGames);
      }

      // Fetch existing check-ins
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: checkinsData } = await supabase
          .from('game_checkins')
          .select('game_id, status')
          .eq('player_id', user.id)
          .eq('team_id', teamId);

        if (checkinsData) {
          const checkinsMap = checkinsData.reduce((acc, row) => {
            acc[row.game_id] = row.status as CheckinStatus;
            return acc;
          }, {} as Record<string, CheckinStatus>);
          setCheckins(checkinsMap);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [teamId]);

  const handleCheckin = async (gameId: string, status: CheckinStatus) => {
    if (!teamId) return;

    setUpdatingGame(gameId);
    startTransition(async () => {
      const result = await updateGameCheckin(gameId, teamId, status);
      if (result.success) {
        setCheckins((prev) => ({ ...prev, [gameId]: status }));
      }
      setUpdatingGame(null);
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!teamId) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
          Upcoming Games
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
          Join a team to see your upcoming games
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
          Upcoming Games
        </h3>
        <Link
          href={`/${leagueSlug}/schedule`}
          className="text-sm text-[var(--league-primary)] hover:underline flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-[var(--color-surface-hover)] rounded-lg" />
            </div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            No upcoming games scheduled
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border)]">
          {games.map((game) => {
            const isHome = game.home_team_id === teamId;
            const opponent = isHome ? game.away_team : game.home_team;
            const currentStatus = checkins[game.id];
            const isUpdating = updatingGame === game.id;

            return (
              <div key={game.id} className="p-4">
                <Link
                  href={`/${leagueSlug}/games/${game.id}`}
                  className="block hover:bg-[var(--color-surface-hover)] -m-2 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Opponent Logo */}
                    {opponent?.logo ? (
                      <Image
                        src={opponent.logo}
                        alt={opponent.name}
                        width={40}
                        height={40}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-[var(--color-surface-hover)] rounded-lg flex items-center justify-center text-lg font-bold text-[var(--color-text-secondary)]">
                        {opponent?.name?.charAt(0) || '?'}
                      </div>
                    )}

                    {/* Game Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase">
                          {isHome ? 'vs' : '@'}
                        </span>
                        <span className="font-medium text-[var(--color-text-primary)] truncate">
                          {opponent?.name || 'TBD'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(game.scheduled_at)}
                        </span>
                        {game.venue && (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{game.venue}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date Badge */}
                    <div className="text-right flex-shrink-0">
                      <span className="inline-block px-2 py-1 bg-[var(--color-surface-hover)] rounded text-xs font-medium text-[var(--color-text-secondary)]">
                        {formatDate(game.scheduled_at)}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Check-in Buttons */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)] mr-1">
                    RSVP:
                  </span>
                  {isUpdating ? (
                    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Updating...</span>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleCheckin(game.id, 'confirmed')}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          currentStatus === 'confirmed'
                            ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-green-500/10 hover:text-green-400'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        In
                      </button>
                      <button
                        onClick={() => handleCheckin(game.id, 'tentative')}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          currentStatus === 'tentative'
                            ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-amber-500/10 hover:text-amber-400'
                        }`}
                      >
                        <HelpCircle className="w-3 h-3" />
                        Maybe
                      </button>
                      <button
                        onClick={() => handleCheckin(game.id, 'out')}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          currentStatus === 'out'
                            ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400'
                        }`}
                      >
                        <X className="w-3 h-3" />
                        Out
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
  );
}
