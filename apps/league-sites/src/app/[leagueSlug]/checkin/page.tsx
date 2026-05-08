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
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Shield,
  UserPlus,
  PlayCircle,
} from 'lucide-react';
import {
  updateGameCheckin,
  type CheckinStatus,
} from '@/lib/actions/checkins';
import { getOrCreateCaptainScorekeeperSession } from '@/lib/actions/scorekeeper';
import { SubInviteModal } from '@/components/captain/SubInviteModal';
import { GoalieRequestModal } from '@/components/captain/GoalieRequestModal';
import type { GameWithCheckin } from '@/components/dashboard/WeekGroupedGames';

interface RosterEntry {
  player_id: string;
  position: string | null;
  jersey_number: number | null;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function CheckinPage() {
  const params = useParams();
  const leagueSlug = params.leagueSlug as string;
  const { league, isLoading: leagueLoading } = useLeague();
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile(
    league?.id,
    league?.current_season_id
  );

  const teamId = currentTeam?.team_id;
  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;

  // Games + navigation
  const [games, setGames] = useState<GameWithCheckin[]>([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);

  // Checkins: my own per game, and all teammates per game
  const [myCheckins, setMyCheckins] = useState<Record<string, CheckinStatus>>({});
  const [teamCheckins, setTeamCheckins] = useState<Record<string, Record<string, string>>>({});

  // Roster (once, for the team)
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  // Open goalie requests (set of gameIds that already have an open request)
  const [openGoalieRequestGames, setOpenGoalieRequestGames] = useState<Set<string>>(new Set());

  // Loading / error
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [updatingGame, setUpdatingGame] = useState<string | null>(null);

  // Modals
  const [showSubModal, setShowSubModal] = useState(false);
  const [showGoalieModal, setShowGoalieModal] = useState(false);

  // Self-scorekeeping
  const leagueSettings = (league?.settings ?? null) as Record<string, unknown> | null;
  const selfScorekeeperEnabled =
    leagueSettings?.self_scorekeeper_enabled === true ||
    leagueSettings?.scorekeepingMode === 'self_scorekeeping' ||
    leagueSettings?.statEntryMode === 'captain';
  const [startingScore, setStartingScore] = useState(false);

  // Derived: current game
  const currentGame = games[currentGameIndex] ?? null;

  // My RSVP summary (across ALL games)
  const confirmedCount = Object.values(myCheckins).filter(s => s === 'confirmed').length;
  const tentativeCount = Object.values(myCheckins).filter(s => s === 'tentative').length;
  const needsResponse = games.length - Object.keys(myCheckins).length;

  // Current game: team attendance
  const currentCheckins = currentGame ? (teamCheckins[currentGame.id] ?? {}) : {};
  const inPlayers = roster.filter(r => currentCheckins[r.player_id] === 'confirmed');
  const outPlayers = roster.filter(r => currentCheckins[r.player_id] === 'out');
  const maybePlayers = roster.filter(r => currentCheckins[r.player_id] === 'tentative');
  const noReplyPlayers = roster.filter(r => !currentCheckins[r.player_id]);

  // Captain action visibility
  const hasGoalieConfirmed = roster.some(
    r => r.position?.toLowerCase() === 'goalie' && currentCheckins[r.player_id] === 'confirmed'
  );
  const hasOpenGoalieRequest = currentGame ? openGoalieRequestGames.has(currentGame.id) : false;
  const showGoalieButton = isCaptain && !hasGoalieConfirmed && !hasOpenGoalieRequest;

  useEffect(() => {
    if (!teamId || !league) return;

    const leagueId = league.id;
    const seasonId = league.current_season_id;

    const fetchData = async () => {
      const supabase = createClient();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // --- 1. Games ---
      let gamesQuery = supabase
        .from('games')
        .select(`
          id,
          scheduled_at,
          location,
          home_team_id,
          away_team_id,
          home_team:teams!games_home_team_id_fkey(id, name, slug, logo_url),
          away_team:teams!games_away_team_id_fkey(id, name, slug, logo_url)
        `)
        .eq('league_id', leagueId)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', startOfToday.toISOString())
        .order('scheduled_at', { ascending: true });

      if (seasonId) gamesQuery = gamesQuery.eq('season_id', seasonId);

      const { data: gamesData, error: gamesError } = await gamesQuery;

      if (gamesError) {
        console.error('Failed to fetch games:', gamesError.message);
        setIsLoading(false);
        return;
      }

      const transformed: GameWithCheckin[] = (gamesData || []).map((game: any) => {
        const rawHome = Array.isArray(game.home_team) ? game.home_team[0] : game.home_team;
        const rawAway = Array.isArray(game.away_team) ? game.away_team[0] : game.away_team;
        return {
          ...game,
          home_team: rawHome ? { ...rawHome, logo: rawHome.logo_url } : null,
          away_team: rawAway ? { ...rawAway, logo: rawAway.logo_url } : null,
        };
      });
      setGames(transformed);

      const gameIds = transformed.map(g => g.id);

      // --- 2. Roster ---
      const { data: rosterData } = await supabase
        .from('team_rosters')
        .select('player_id, position, jersey_number, profile:profiles(id, full_name, avatar_url)')
        .eq('team_id', teamId)
        .eq('status', 'active')
        .is('end_date', null)
        .eq('player_type', 'regular');

      if (rosterData) {
        setRoster(
          rosterData.map((r: any) => ({
            player_id: r.player_id,
            position: r.position,
            jersey_number: r.jersey_number,
            profile: Array.isArray(r.profile) ? r.profile[0] : r.profile,
          }))
        );
      }

      // --- 3. All team checkins for loaded games (batch) ---
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && gameIds.length > 0) {
        const { data: checkinsData } = await supabase
          .from('game_checkins')
          .select('game_id, player_id, status')
          .eq('team_id', teamId)
          .in('game_id', gameIds);

        if (checkinsData) {
          const mine: Record<string, CheckinStatus> = {};
          const team: Record<string, Record<string, string>> = {};

          for (const row of checkinsData) {
            // Team map
            if (!team[row.game_id]) team[row.game_id] = {};
            team[row.game_id][row.player_id] = row.status;

            // My own
            if (row.player_id === user.id) {
              mine[row.game_id] = row.status as CheckinStatus;
            }
          }

          setMyCheckins(mine);
          setTeamCheckins(team);
        }
      }

      // --- 4. Open goalie requests for this team ---
      if (gameIds.length > 0) {
        const { data: openRequests } = await supabase
          .from('goalie_requests' as any)
          .select('game_id')
          .eq('team_id', teamId)
          .eq('status', 'open')
          .in('game_id', gameIds);

        if (openRequests) {
          setOpenGoalieRequestGames(new Set((openRequests as any[]).map(r => r.game_id)));
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [teamId, league]);

  const handleCheckin = (gameId: string, status: CheckinStatus) => {
    if (!teamId) return;
    setSaveError(null);
    setUpdatingGame(gameId);
    startTransition(async () => {
      const result = await updateGameCheckin(gameId, teamId, status);
      if (result.success) {
        setMyCheckins(prev => ({ ...prev, [gameId]: status }));
        // Also update team checkins map for realtime roster display
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setTeamCheckins(prev => ({
            ...prev,
            [gameId]: { ...(prev[gameId] ?? {}), [user.id]: status },
          }));
        }
      } else {
        setSaveError(result.error || 'Failed to save your response. Please try again.');
      }
      setUpdatingGame(null);
    });
  };

  const handleGoalieRequestSubmitted = (gameId: string) => {
    setOpenGoalieRequestGames(prev => new Set([...prev, gameId]));
  };

  const handleStartScoring = async (gameId: string) => {
    if (!teamId) return;
    setStartingScore(true);
    try {
      const result = await getOrCreateCaptainScorekeeperSession(gameId, teamId);
      if (result.success && result.token) {
        window.location.href = `/${result.leagueSlug ?? leagueSlug}/scorekeeper?token=${result.token}`;
      } else {
        setSaveError(result.error || 'Failed to start scoring session');
      }
    } catch {
      setSaveError('Failed to start scoring session. Please try again.');
    } finally {
      setStartingScore(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  // ── Loading ──
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

  // ── Not on a team ──
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

      {/* Save error banner */}
      {saveError && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-3">
          <p className="text-sm text-red-400">{saveError}</p>
          <button onClick={() => setSaveError(null)} className="text-red-400/60 hover:text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* My RSVP Summary (all games) */}
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

      {/* Games */}
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
        <>
          {/* Game Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentGameIndex(i => Math.max(0, i - 1))}
              disabled={currentGameIndex === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Prev
            </button>

            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              Game {currentGameIndex + 1} of {games.length}
            </span>

            <button
              onClick={() => setCurrentGameIndex(i => Math.min(games.length - 1, i + 1))}
              disabled={currentGameIndex === games.length - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Game Card */}
          {currentGame && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
              {/* Matchup header */}
              <div className="p-4 border-b border-[var(--color-border)]">
                {/* Teams */}
                <div className="flex items-center justify-center gap-4 mb-3">
                  <TeamBadge
                    team={currentGame.home_team}
                    isMyTeam={currentGame.home_team_id === teamId}
                  />
                  <span className="text-lg font-bold text-[var(--color-text-muted)]">vs</span>
                  <TeamBadge
                    team={currentGame.away_team}
                    isMyTeam={currentGame.away_team_id === teamId}
                  />
                </div>

                {/* Game info */}
                <div className="flex items-center justify-center gap-4 text-sm text-[var(--color-text-secondary)]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(currentGame.scheduled_at)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(currentGame.scheduled_at)}
                  </span>
                  {currentGame.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {currentGame.location}
                    </span>
                  )}
                </div>
              </div>

              {/* My RSVP */}
              <div className="p-4 border-b border-[var(--color-border)]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                  My RSVP
                </p>
                {updatingGame === currentGame.id ? (
                  <div className="flex items-center justify-center py-3 text-[var(--color-text-secondary)]">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">Updating...</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCheckin(currentGame.id, 'confirmed')}
                      disabled={isPending}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        myCheckins[currentGame.id] === 'confirmed'
                          ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-green-500/10 hover:text-green-400'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      In
                    </button>
                    <button
                      onClick={() => handleCheckin(currentGame.id, 'tentative')}
                      disabled={isPending}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        myCheckins[currentGame.id] === 'tentative'
                          ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-amber-500/10 hover:text-amber-400'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      Maybe
                    </button>
                    <button
                      onClick={() => handleCheckin(currentGame.id, 'out')}
                      disabled={isPending}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        myCheckins[currentGame.id] === 'out'
                          ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      Out
                    </button>
                  </div>
                )}
              </div>

              {/* Team Attendance */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Team Attendance
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-400">{inPlayers.length} in</span>
                    <span className="text-[var(--color-text-muted)]">·</span>
                    <span className="text-red-400">{outPlayers.length} out</span>
                    {maybePlayers.length > 0 && (
                      <>
                        <span className="text-[var(--color-text-muted)]">·</span>
                        <span className="text-amber-400">{maybePlayers.length} maybe</span>
                      </>
                    )}
                    {noReplyPlayers.length > 0 && (
                      <>
                        <span className="text-[var(--color-text-muted)]">·</span>
                        <span className="text-[var(--color-text-muted)]">{noReplyPlayers.length} no reply</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  {roster.map(player => {
                    const status = currentCheckins[player.player_id];
                    const name = player.profile?.full_name || 'Unknown';
                    const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

                    return (
                      <div
                        key={player.player_id}
                        className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                      >
                        {/* Avatar */}
                        {player.profile?.avatar_url ? (
                          <Image
                            src={player.profile.avatar_url}
                            alt={name}
                            width={28}
                            height={28}
                            className="rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[var(--color-surface-hover)] flex items-center justify-center text-xs font-bold text-[var(--color-text-secondary)] flex-shrink-0">
                            {initials}
                          </div>
                        )}

                        {/* Name + position */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-[var(--color-text-primary)] truncate">
                            {player.jersey_number ? `#${player.jersey_number} ` : ''}{name}
                          </span>
                          {player.position && (
                            <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">
                              {player.position}
                            </span>
                          )}
                        </div>

                        {/* Status badge */}
                        <StatusBadge status={status} />
                      </div>
                    );
                  })}

                  {roster.length === 0 && (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-2">
                      No roster members found
                    </p>
                  )}
                </div>
              </div>

              {/* Captain Actions */}
              {isCaptain && (
                <div className="px-4 pb-4 flex items-center flex-wrap gap-3">
                  <Link
                    href={`/${leagueSlug}/captain/lineups/${currentGame.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--league-primary)]/10 text-[var(--league-primary)] hover:bg-[var(--league-primary)]/20 transition-colors border border-[var(--league-primary)]/20"
                  >
                    <Calendar className="w-4 h-4" />
                    Lineup Studio
                  </Link>

                  <button
                    onClick={() => setShowSubModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:bg-[var(--league-primary)]/10 hover:text-[var(--league-primary)] transition-colors border border-[var(--color-border)]"
                  >
                    <UserPlus className="w-4 h-4" />
                    Find Sub
                  </button>

                  {showGoalieButton && (
                    <button
                      onClick={() => setShowGoalieModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:bg-[var(--league-primary)]/10 hover:text-[var(--league-primary)] transition-colors border border-[var(--color-border)]"
                    >
                      <Shield className="w-4 h-4" />
                      Request Goalie
                    </button>
                  )}

                  {hasOpenGoalieRequest && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                      <Shield className="w-4 h-4" />
                      Goalie Requested
                    </span>
                  )}

                  {/* Self-scorekeeper: only visible when league has self_scorekeeper_enabled */}
                  {selfScorekeeperEnabled && currentGame && (
                    <button
                      onClick={() => handleStartScoring(currentGame.id)}
                      disabled={startingScore}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--league-primary)] text-white hover:opacity-90 active:opacity-80 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {startingScore ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                      Score Game
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dot navigation */}
          {games.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {games.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentGameIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentGameIndex
                      ? 'bg-[var(--league-primary)] w-4'
                      : 'bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
                  }`}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Sub Invite Modal */}
      {currentGame && (
        <SubInviteModal
          isOpen={showSubModal}
          onClose={() => setShowSubModal(false)}
          gameId={currentGame.id}
          teamId={teamId}
          leagueId={league?.id ?? ''}
          // SubInviteModal only reads player_id to filter the sub list; cast to satisfy RosterPlayer[]
          roster={roster as any}
          gameDateLabel={formatDate(currentGame.scheduled_at)}
        />
      )}

      {/* Goalie Request Modal */}
      {currentGame && (
        <GoalieRequestModal
          isOpen={showGoalieModal}
          onClose={() => {
            setShowGoalieModal(false);
          }}
          gameId={currentGame.id}
          teamId={teamId}
          gameDateLabel={formatDate(currentGame.scheduled_at)}
        />
      )}
    </div>
  );
}

// ── Sub-components ──

function TeamBadge({
  team,
  isMyTeam,
}: {
  team: GameWithCheckin['home_team'];
  isMyTeam: boolean;
}) {
  const name = team?.name || 'TBD';
  return (
    <div className={`flex flex-col items-center gap-1 ${isMyTeam ? 'opacity-100' : 'opacity-70'}`}>
      {team?.logo ? (
        <Image src={team.logo} alt={name} width={44} height={44} className="rounded-xl" />
      ) : (
        <div className="w-11 h-11 rounded-xl bg-[var(--color-surface-hover)] flex items-center justify-center text-sm font-bold text-[var(--color-text-secondary)]">
          {name.charAt(0)}
        </div>
      )}
      <span className={`text-xs font-medium truncate max-w-[80px] text-center ${isMyTeam ? 'text-[var(--league-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
        {name}
      </span>
      {isMyTeam && (
        <span className="text-[10px] text-[var(--league-primary)]/60 uppercase tracking-wider">Your Team</span>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (status === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
        <Check className="w-3 h-3" />
        In
      </span>
    );
  }
  if (status === 'out') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
        <X className="w-3 h-3" />
        Out
      </span>
    );
  }
  if (status === 'tentative') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
        <HelpCircle className="w-3 h-3" />
        Maybe
      </span>
    );
  }
  return (
    <span className="text-xs text-[var(--color-text-muted)]">—</span>
  );
}
