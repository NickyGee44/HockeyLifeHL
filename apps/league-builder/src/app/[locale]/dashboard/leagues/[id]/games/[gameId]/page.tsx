/**
 * Game Detail Page
 *
 * Displays full game details including teams, scores, location, status, and audit history.
 * Supports editing and cancelling the game.
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getGame, getGameAuditLog } from '@/lib/actions/games';
import { getLeagueReferees } from '@/lib/actions/referee-management';
import { cn } from '@hockey-life/ui';
import { StatusBadge } from '@/components/games';
import { GameDetailClient } from '@/components/dashboard/leagues/game-detail-client';
import { GameOfficialsPanel } from '@/components/referees';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  History,
  Trophy,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

export const metadata = {
  title: 'Game Details | Beer League Hockey',
  description: 'View and manage game details',
};

type Props = {
  params: Promise<{ locale: string; id: string; gameId: string }>;
  searchParams?: Promise<{ [key: string]: string }>;
};

export default async function GameDetailPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId, gameId } = awaited;
  setRequestLocale(locale);

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    nextRedirect(`/${locale}/login?redirect=/${locale}/dashboard/leagues/${leagueId}/games/${gameId}`);
  }

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color, created_by')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Verify user is owner or admin of this league
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single();

  const isCreator = league.created_by === user.id;
  const isAuthorized =
    isCreator || (membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'active');

  if (!isAuthorized) {
    nextRedirect(`/${locale}/dashboard?error=unauthorized`);
  }

  // Get game details
  const gameResult = await getGame(gameId);
  if (!gameResult.success || !gameResult.data) {
    notFound();
  }

  const game = gameResult.data;

  // Verify game belongs to this league
  if (game.league_id !== leagueId) {
    notFound();
  }

  // Get audit log and available referees
  const [auditResult, refereesResult] = await Promise.all([
    getGameAuditLog(gameId),
    getLeagueReferees(leagueId),
  ]);
  const auditLog = auditResult.success ? auditResult.data : [];
  const availableReferees = (refereesResult.success && refereesResult.data)
    ? refereesResult.data.referees.filter((r) => r.is_active).map((r) => ({ id: r.id, name: r.name }))
    : [];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/games`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Games
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={game.status} size="lg" isRescheduled={game.is_rescheduled} />
                {game.season && (
                  <span className="text-sm text-neutral-500">
                    <Trophy className="w-4 h-4 inline mr-1" />
                    {game.season.name}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Game Details
              </h1>
            </div>

            {/* Client component for actions */}
            <GameDetailClient game={game} leagueId={leagueId} />
          </div>
        </div>

        {/* Matchup Card */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex-1 text-center">
              <div
                className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-3"
                style={{ backgroundColor: game.home_team?.primary_color || '#22D3EE' }}
              >
                <span className="text-2xl font-black text-white">
                  {game.home_team?.short_name?.substring(0, 3).toUpperCase() || 'HOM'}
                </span>
              </div>
              <h2 className="font-bold text-white text-lg">{game.home_team?.name || 'Home Team'}</h2>
              <p className="text-sm text-neutral-400">Home</p>
              {game.status === 'completed' || game.status === 'in_progress' ? (
                <p className="text-5xl font-black text-white mt-4">{game.home_score}</p>
              ) : null}
            </div>

            {/* VS Divider */}
            <div className="px-8">
              <span className="text-neutral-600 font-black text-xl">VS</span>
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center">
              <div
                className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-3"
                style={{ backgroundColor: game.away_team?.primary_color || '#3B82F6' }}
              >
                <span className="text-2xl font-black text-white">
                  {game.away_team?.short_name?.substring(0, 3).toUpperCase() || 'AWY'}
                </span>
              </div>
              <h2 className="font-bold text-white text-lg">{game.away_team?.name || 'Away Team'}</h2>
              <p className="text-sm text-neutral-400">Away</p>
              {game.status === 'completed' || game.status === 'in_progress' ? (
                <p className="text-5xl font-black text-white mt-4">{game.away_score}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Game Info Grid */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {/* Schedule */}
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-rink-500" />
              <span className="text-sm font-medium text-neutral-400">Date & Time</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {format(new Date(game.scheduled_at), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-neutral-400">
              {format(new Date(game.scheduled_at), 'h:mm a')}
            </p>
            {game.is_rescheduled && game.original_scheduled_at && (
              <div className="mt-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <p className="text-xs text-orange-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Originally scheduled: {format(new Date(game.original_scheduled_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-rink-500" />
              <span className="text-sm font-medium text-neutral-400">Location</span>
            </div>
            <p className="text-lg font-semibold text-white">
              {game.location || 'TBD'}
            </p>
          </div>
        </div>

        {/* Game Officials */}
        <div className="mb-8">
          <GameOfficialsPanel
            gameId={gameId}
            leagueId={leagueId}
            availableReferees={availableReferees}
          />
        </div>

        {/* Cancellation/Postponement Info */}
        {(game.status === 'cancelled' || game.status === 'postponed') && game.cancellation_reason && (
          <div
            className={cn(
              'rounded-xl p-5 mb-8 border',
              game.status === 'cancelled'
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-yellow-500/5 border-yellow-500/20'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle
                className={cn('w-5 h-5', game.status === 'cancelled' ? 'text-red-500' : 'text-yellow-500')}
              />
              <span
                className={cn(
                  'text-sm font-medium',
                  game.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
                )}
              >
                {game.status === 'cancelled' ? 'Cancellation' : 'Postponement'} Reason
              </span>
            </div>
            <p className="text-white">{game.cancellation_reason}</p>
            {game.cancelled_at && (
              <p className="text-sm text-neutral-500 mt-2">
                {game.status === 'cancelled' ? 'Cancelled' : 'Postponed'} on{' '}
                {format(new Date(game.cancelled_at), 'MMM d, yyyy at h:mm a')}
              </p>
            )}
          </div>
        )}

        {/* Audit Log */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-rink-500" />
            <h2 className="text-lg font-bold text-white">Activity Log</h2>
          </div>

          {auditLog.length === 0 ? (
            <p className="text-neutral-500 text-center py-8">No activity recorded yet</p>
          ) : (
            <div className="space-y-4">
              {auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 p-4 rounded-xl bg-neutral-800/50 border border-white/[0.06]"
                >
                  <div className="w-8 h-8 rounded-full bg-rink-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-rink-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-white capitalize">
                        {entry.action.replace(/_/g, ' ')}
                      </p>
                      <time className="text-xs text-neutral-500 shrink-0">
                        {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                      </time>
                    </div>
                    {entry.reason && (
                      <p className="text-sm text-neutral-400 mt-1">Reason: {entry.reason}</p>
                    )}
                    <p className="text-xs text-neutral-500 mt-1">
                      By {entry.changed_by_profile?.full_name || 'Unknown'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
