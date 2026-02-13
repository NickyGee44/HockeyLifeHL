'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useLeague } from '@/hooks/useLeague';
import {
  Calendar,
  Clock,
  MapPin,
  Check,
  HelpCircle,
  X,
  Loader2,
  CheckCheck,
  ArrowLeft,
  ClipboardCheck,
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
} from '@/components/dashboard/WeekGroupedGames';

export default function CheckinPage() {
  const params = useParams();
  const leagueSlug = params.leagueSlug as string;
  const { league, isLoading: leagueLoading } = useLeague();
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile(league?.id);

  const teamId = currentTeam?.team_id;
  const [games, setGames] = useState<GameWithCheckin[]>([]);
  const [checkins, setCheckins] = useState<Record<string, CheckinStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [updatingGame, setUpdatingGame] = useState<string | null>(null);
  const [bulkWeek, setBulkWeek] = useState<string | null>(null);

  const weekGroups = useWeekGroupedGames(games);

  // Summary stats
  const totalGames = games.length;
  const confirmedCount = Object.values(checkins).filter(s => s === 'confirmed').length;
  const tentativeCount = Object.values(checkins).filter(s => s === 'tentative').length;
  const needsResponse = totalGames - Object.keys(checkins).length;

  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      const supabase = createClient();

      const { data: gamesData } = await supabase
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
        .order('scheduled_at', { ascending: true });

      if (gamesData) {
        const transformed = gamesData.map((game: any) => {
          const rawHome = Array.isArray(game.home_team) ? game.home_team[0] : game.home_team;
          const rawAway = Array.isArray(game.away_team) ? game.away_team[0] : game.away_team;
          return {
            ...game,
            home_team: rawHome ? { ...rawHome, logo: rawHome.logo_url } : null,
            away_team: rawAway ? { ...rawAway, logo: rawAway.logo_url } : null,
          };
        });
        setGames(transformed);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: checkinsData } = await supabase
          .from('game_checkins')
          .select('game_id, status')
          .eq('player_id', user.id)
          .eq('team_id', teamId);

        if (checkinsData) {
          const map = checkinsData.reduce((acc, row) => {
            acc[row.game_id] = row.status as CheckinStatus;
            return acc;
          }, {} as Record<string, CheckinStatus>);
          setCheckins(map);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [teamId]);

  const handleCheckin = (gameId: string, status: CheckinStatus) => {
    if (!teamId) return;
    setUpdatingGame(gameId);
    startTransition(async () => {
      const result = await updateGameCheckin(gameId, teamId, status);
      if (result.success) {
        setCheckins(prev => ({ ...prev, [gameId]: status }));
      }
      setUpdatingGame(null);
    });
  };

  const handleBulkCheckin = (weekLabel: string, gameIds: string[]) => {
    if (!teamId) return;
    setBulkWeek(weekLabel);
    startTransition(async () => {
      const result = await bulkUpdateCheckins(gameIds, teamId, 'confirmed');
      if (result.success) {
        setCheckins(prev => {
          const updated = { ...prev };
          for (const id of gameIds) updated[id] = 'confirmed';
          return updated;
        });
      }
      setBulkWeek(null);
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // Loading state
  if (leagueLoading || profileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Not on a team
  if (!teamId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <ClipboardCheck className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Game Check-In</h1>
        <p className="text-[var(--color-text-secondary)] mb-6">Join a team to check in for games.</p>
        <Link
          href={`/${leagueSlug}/me`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--league-primary)] text-[var(--color-accent-text)] rounded-lg font-medium"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${leagueSlug}/me`}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-[var(--league-primary)]" />
          Game Check-In
        </h1>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{confirmedCount}</p>
          <p className="text-xs text-green-400/70">Confirmed</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-400">{tentativeCount}</p>
          <p className="text-xs text-amber-400/70">Maybe</p>
        </div>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{needsResponse}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Needs RSVP</p>
        </div>
      </div>

      {/* Games List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-24 bg-[var(--color-surface)] rounded-xl" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">No upcoming games scheduled</p>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          {weekGroups.map(group => {
            const weekConfirmed = group.games.filter(g => checkins[g.id] === 'confirmed').length;
            const unconfirmedIds = group.games.filter(g => checkins[g.id] !== 'confirmed').map(g => g.id);

            return (
              <div key={group.label}>
                <WeekHeader label={group.label} gameCount={group.games.length} confirmedCount={weekConfirmed} />

                {unconfirmedIds.length > 0 && (
                  <div className="px-4 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <button
                      onClick={() => handleBulkCheckin(group.label, unconfirmedIds)}
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
                  {group.games.map(game => {
                    const isHome = game.home_team_id === teamId;
                    const opponent = isHome ? game.away_team : game.home_team;
                    const currentStatus = checkins[game.id];
                    const isUpdating = updatingGame === game.id;

                    return (
                      <div key={game.id} className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          {opponent?.logo ? (
                            <Image src={opponent.logo} alt={opponent.name} width={36} height={36} className="rounded-lg" />
                          ) : (
                            <div className="w-9 h-9 bg-[var(--color-surface-hover)] rounded-lg flex items-center justify-center text-sm font-bold text-[var(--color-text-secondary)]">
                              {opponent?.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase">
                                {isHome ? 'vs' : '@'}
                              </span>
                              <span className="font-medium text-[var(--color-text-primary)] truncate">
                                {opponent?.name || 'TBD'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(game.scheduled_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(game.scheduled_at)}
                              </span>
                              {game.venue && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{game.venue}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Big RSVP Buttons */}
                        <div className="flex gap-2">
                          {isUpdating ? (
                            <div className="flex-1 flex items-center justify-center py-3 text-[var(--color-text-secondary)]">
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              <span className="text-sm">Updating...</span>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleCheckin(game.id, 'confirmed')}
                                disabled={isPending}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                  currentStatus === 'confirmed'
                                    ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-green-500/10 hover:text-green-400'
                                }`}
                              >
                                <Check className="w-4 h-4" />
                                In
                              </button>
                              <button
                                onClick={() => handleCheckin(game.id, 'tentative')}
                                disabled={isPending}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                  currentStatus === 'tentative'
                                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-amber-500/10 hover:text-amber-400'
                                }`}
                              >
                                <HelpCircle className="w-4 h-4" />
                                Maybe
                              </button>
                              <button
                                onClick={() => handleCheckin(game.id, 'out')}
                                disabled={isPending}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                  currentStatus === 'out'
                                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                                    : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400'
                                }`}
                              >
                                <X className="w-4 h-4" />
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
        </div>
      )}
    </div>
  );
}
