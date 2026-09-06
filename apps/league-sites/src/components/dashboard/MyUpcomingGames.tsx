'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  ChevronDown,
  Check,
  HelpCircle,
  X,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import {
  updateGameCheckin,
  bulkUpdateCheckins,
  type CheckinStatus,
} from '@/lib/actions/checkins';
import {
  type GameWithCheckin,
  useWeekGroupedGames,
  WeekHeader,
} from './WeekGroupedGames';

interface MyUpcomingGamesProps {
  teamId?: string;
  leagueSlug: string;
}

export function MyUpcomingGames({ teamId, leagueSlug }: MyUpcomingGamesProps) {
  const [games, setGames] = useState<GameWithCheckin[]>([]);
  const [checkins, setCheckins] = useState<Record<string, CheckinStatus>>({});
  const [isLoading, setIsLoading] = useState(!!teamId);
  const [isPending, startTransition] = useTransition();
  const [updatingGame, setUpdatingGame] = useState<string | null>(null);
  const [showAllGames, setShowAllGames] = useState(false);
  const [bulkWeek, setBulkWeek] = useState<string | null>(null);
  const locale = useMemo(
    () => (typeof navigator !== 'undefined' ? navigator.languages?.[0] ?? navigator.language : undefined),
    []
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }),
    [locale]
  );
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }),
    [locale]
  );
  const relativeDayFormatter = useMemo(
    () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
    [locale]
  );

  const weekGroups = useWeekGroupedGames(games);

  // Show first 3 weeks by default, all if toggled
  const visibleGroups = showAllGames ? weekGroups : weekGroups.slice(0, 3);

  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      const supabase = createClient();

      // Fetch all upcoming games (no limit)
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          id,
          scheduled_at,
          location,
          game_type,
          home_team_id,
          away_team_id,
          home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url),
          away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url)
        `)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

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

  const handleBulkCheckin = async (weekLabel: string, gameIds: string[]) => {
    if (!teamId) return;

    setBulkWeek(weekLabel);
    startTransition(async () => {
      const result = await bulkUpdateCheckins(gameIds, teamId, 'confirmed');
      if (result.success) {
        setCheckins((prev) => {
          const updated = { ...prev };
          for (const id of gameIds) {
            updated[id] = 'confirmed';
          }
          return updated;
        });
      }
      setBulkWeek(null);
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round(
      (startOfDate.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (diffDays === 0 || diffDays === 1) {
      const relativeLabel = relativeDayFormatter.format(diffDays, 'day');
      return relativeLabel.charAt(0).toUpperCase() + relativeLabel.slice(1);
    }

    return dateFormatter.format(date);
  };

  const formatTime = (dateStr: string) => {
    return timeFormatter.format(new Date(dateStr));
  };

  if (!teamId) {
    return (
      <div className="glass-card rounded-xl p-6">
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
    <div className="glass-card rounded-xl">
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[var(--league-primary)]" />
          Upcoming Games
          {games.length > 0 && (
            <span className="text-sm font-normal text-[var(--color-text-muted)]">
              ({games.length})
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3">
          {weekGroups.length > 3 && (
            <button
              onClick={() => setShowAllGames(!showAllGames)}
              className="text-xs text-[var(--league-primary)] hover:underline flex items-center gap-1"
            >
              {showAllGames ? 'Show Less' : 'Show All Season Games'}
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showAllGames ? 'rotate-180' : ''}`}
              />
            </button>
          )}
          <Link
            href={`/${leagueSlug}/schedule`}
            className="text-sm text-[var(--league-primary)] hover:underline flex items-center gap-1"
          >
            Schedule
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
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
        <div>
          {visibleGroups.map((group) => {
            const weekConfirmed = group.games.filter(
              (g) => checkins[g.id] === 'confirmed'
            ).length;
            const unconfirmedIds = group.games
              .filter((g) => checkins[g.id] !== 'confirmed')
              .map((g) => g.id);

            return (
              <div key={group.label}>
                <WeekHeader
                  label={group.label}
                  gameCount={group.games.length}
                  confirmedCount={weekConfirmed}
                />

                {/* Bulk check-in for week */}
                {unconfirmedIds.length > 0 && (
                  <div className="glass-control border-b border-[var(--color-border)] px-4 py-1.5">
                    <button
                      onClick={() =>
                        handleBulkCheckin(group.label, unconfirmedIds)
                      }
                      disabled={isPending || bulkWeek === group.label}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--league-primary)] hover:underline disabled:opacity-50"
                    >
                      {bulkWeek === group.label ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3 h-3" />
                      )}
                      Mark all as In ({unconfirmedIds.length} remaining)
                    </button>
                  </div>
                )}

                <div className="divide-y divide-[var(--color-border)]">
                  {group.games.map((game) => {
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
                            <Image
                              src={opponent?.logo || '/blank_team.png'}
                              alt={opponent?.name || 'Team'}
                              width={40}
                              height={40}
                              className="rounded-lg"
                            />

                            {/* Game Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase">
                                  {isHome ? 'vs' : '@'}
                                </span>
                                <span className="font-medium text-[var(--color-text-primary)] truncate">
                                  {opponent?.name || 'TBD'}
                                </span>
                                {(game as any).game_type === 'playoff' && (
                                  <span className="shrink-0 px-1.5 py-0.5 text-xs font-semibold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    Playoff
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatTime(game.scheduled_at)}
                                </span>
                                {game.location && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="truncate">{game.location}</span>
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
              </div>
            );
          })}

          {!showAllGames && weekGroups.length > 3 && (
            <div className="p-3 text-center border-t border-[var(--color-border)]">
              <button
                onClick={() => setShowAllGames(true)}
                className="text-sm text-[var(--league-primary)] hover:underline"
              >
                Show {weekGroups.length - 3} more weeks
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
