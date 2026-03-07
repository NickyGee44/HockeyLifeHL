'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
import { useLeague } from '@/hooks/useLeague';
import { createClient } from '@/lib/supabase/client';
import {
  Shield,
  Users,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Trophy,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { RosterManager } from '@/components/captain/RosterManager';
import { TeamAttendance } from '@/components/captain/TeamAttendance';
import { SubInviteModal } from '@/components/captain/SubInviteModal';
import {
  getTeamRoster,
  getJoinRequests,
  type RosterPlayer,
  type JoinRequest,
} from '@/lib/actions/captain-roster';

interface CaptainPageProps {
  params: Promise<{ leagueSlug: string }>;
}

interface TeamStats {
  wins: number;
  losses: number;
  ties: number;
  points: number;
  division_rank: number | null;
}

interface UpcomingLineupGame {
  id: string;
  scheduled_at: string;
  location: string | null;
  status: string;
  opponentName: string;
}

export default function CaptainPage({ params }: CaptainPageProps) {
  const { leagueSlug } = use(params);
  const { league } = useLeague();
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile(league?.id);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [nextLineupGame, setNextLineupGame] = useState<UpcomingLineupGame | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subInviteGameId, setSubInviteGameId] = useState<string | null>(null);

  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;

  const teamId = currentTeam?.team_id;

  const fetchRosterData = useCallback(async () => {
    if (!teamId) return;

    const [rosterResult, requestsResult] = await Promise.all([
      getTeamRoster(teamId),
      getJoinRequests(teamId),
    ]);

    if (rosterResult.success && rosterResult.data) {
      setRoster(rosterResult.data);
    }
    if (requestsResult.success && requestsResult.data) {
      setJoinRequests(requestsResult.data);
    }
  }, [teamId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentTeam || !currentTeam.team || !isCaptain) {
        setIsLoading(false);
        return;
      }

      const supabase = createClient();

      // Fetch roster + join requests via server actions
      await fetchRosterData();

      // Fetch team stats (actual RPC: get_team_standings)
      const { data: standings } = await supabase.rpc('get_team_standings', {
        check_league_id: currentTeam.team.league_id,
        check_season_id: null,
      });

      if (standings) {
        const myTeam = standings.find((s: any) => s.team_id === currentTeam.team_id);
        if (myTeam) {
          // Calculate division rank
          const divisionTeams = standings.filter(
            (s: any) => s.division_id === myTeam.division_id
          );
          divisionTeams.sort((a: any, b: any) => b.points - a.points);
          const divisionRank =
            divisionTeams.findIndex((s: any) => s.team_id === currentTeam.team_id) + 1;

          setTeamStats({
            wins: myTeam.wins || 0,
            losses: myTeam.losses || 0,
            ties: myTeam.ties || 0,
            points: myTeam.points || 0,
            division_rank: divisionRank,
          });
        }
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      let nextGameQuery = supabase
        .from('games')
        .select(`
          id,
          scheduled_at,
          location,
          status,
          home_team_id,
          away_team_id,
          home_team:teams!games_home_team_id_fkey(name),
          away_team:teams!games_away_team_id_fkey(name)
        `)
        .eq('league_id', currentTeam.team.league_id)
        .or(`home_team_id.eq.${currentTeam.team_id},away_team_id.eq.${currentTeam.team_id}`)
        .in('status', ['scheduled', 'in_progress'])
        .gte('scheduled_at', startOfToday.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1);

      if (league?.current_season_id) {
        nextGameQuery = nextGameQuery.eq('season_id', league.current_season_id);
      }

      const { data: nextGameData } = await nextGameQuery;
      const nextGame = nextGameData?.[0];

      if (nextGame) {
        const rawOpponent = nextGame.home_team_id === currentTeam.team_id ? nextGame.away_team : nextGame.home_team;
        const opponent = Array.isArray(rawOpponent) ? rawOpponent[0] : rawOpponent;

        setNextLineupGame({
          id: nextGame.id,
          scheduled_at: nextGame.scheduled_at,
          location: nextGame.location ?? null,
          status: nextGame.status,
          opponentName: opponent?.name ?? 'Opponent',
        });
      } else {
        setNextLineupGame(null);
      }

      setIsLoading(false);
    };

    if (!profileLoading) {
      fetchData();
    }
  }, [currentTeam, isCaptain, profileLoading, fetchRosterData, league]);

  if (profileLoading || isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--league-primary)]" />
          <p className="text-[var(--color-text-secondary)]">Loading captain dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentTeam || !currentTeam.team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-400 mb-4" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            No Team Found
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            You need to be on a team to access captain features.
          </p>
          <Link
            href={`/${leagueSlug}/teams`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--league-primary)] text-[var(--color-accent-text)] rounded-lg font-medium"
          >
            Browse Teams
          </Link>
        </div>
      </div>
    );
  }

  if (!isCaptain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center">
          <Shield className="w-12 h-12 mx-auto text-amber-400 mb-4" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Captain Access Required
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Only team captains and alternates can access this page.
          </p>
          <Link
            href={`/${leagueSlug}/me`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-lg font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const record = `${teamStats?.wins || 0}-${teamStats?.losses || 0}-${teamStats?.ties || 0}`;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/${leagueSlug}/me`}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              Captain Dashboard
            </h1>
          </div>
          <p className="text-[var(--color-text-secondary)]">
            Manage your team: {currentTeam.team.name}
          </p>
        </div>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users className="w-5 h-5 text-[var(--league-primary)]" />}
          value={roster.length}
          label="Players"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5 text-amber-400" />}
          value={record}
          label="Record"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
          value={teamStats?.points || 0}
          label="Points"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5 text-blue-400" />}
          value={teamStats?.division_rank ? `#${teamStats.division_rank}` : '-'}
          label="Division Rank"
        />
      </div>

      <div className="mb-8">
        {nextLineupGame ? (
          <Link
            href={`/${leagueSlug}/captain/lineups/${nextLineupGame.id}`}
            className="block rounded-3xl border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(15,23,42,0.92))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)] transition-transform hover:-translate-y-0.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/80">
                  Tonight&apos;s Lineup
                </p>
                <h2 className="mt-3 text-2xl font-bold text-white">
                  Build your card for {nextLineupGame.opponentName}
                </h2>
                <p className="mt-2 text-sm text-cyan-50/80">
                  Drag skaters onto the ice, publish the lineup, and share it to the room before puck drop.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-cyan-50/85">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                    {new Intl.DateTimeFormat(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(new Date(nextLineupGame.scheduled_at))}
                  </span>
                  {nextLineupGame.location && (
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                      {nextLineupGame.location}
                    </span>
                  )}
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                    {nextLineupGame.status === 'in_progress' ? 'Live now' : 'Upcoming'}
                  </span>
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white">
                Open lineup studio
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
              Tonight&apos;s Lineup
            </p>
            <h2 className="mt-3 text-xl font-bold text-[var(--color-text-primary)]">
              No current game ready for lineup setup
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              As soon as your next scheduled game is available, you&apos;ll be able to build and publish a lineup card here.
            </p>
          </div>
        )}
      </div>

      {/* Roster Manager (editable roster + join requests) */}
      <RosterManager
        teamId={currentTeam.team_id}
        roster={roster}
        joinRequests={joinRequests}
        onRosterUpdate={fetchRosterData}
      />

      {/* Team Attendance Matrix */}
      <div className="mt-8">
        <TeamAttendance
          teamId={currentTeam.team_id}
          roster={roster}
          leagueSlug={leagueSlug}
          onRequestSub={(gameId) => setSubInviteGameId(gameId)}
        />
      </div>

      {/* Sub Invite Modal */}
      {subInviteGameId && currentTeam.team && (
        <SubInviteModal
          isOpen={!!subInviteGameId}
          onClose={() => setSubInviteGameId(null)}
          gameId={subInviteGameId}
          teamId={currentTeam.team_id}
          leagueId={currentTeam.team.league_id}
          roster={roster}
        />
      )}

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {nextLineupGame && (
          <Link
            href={`/${leagueSlug}/captain/lineups/${nextLineupGame.id}`}
            className="flex items-center gap-4 p-4 bg-cyan-500/10 border border-cyan-400/20 rounded-xl hover:bg-cyan-500/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-400/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <p className="font-medium text-cyan-100">Lineup Studio</p>
              <p className="text-sm text-cyan-100/75">Set game-day positions</p>
            </div>
          </Link>
        )}

        <Link
          href={`/${leagueSlug}/captain/duties`}
          className="flex items-center gap-4 p-4 bg-[var(--league-primary)]/10 border border-[var(--league-primary)]/20 rounded-xl hover:bg-[var(--league-primary)]/20 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--league-primary)]/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[var(--league-primary)]" />
          </div>
          <div>
            <p className="font-medium text-[var(--league-primary)]">Game Duties</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Assign pucks, scoresheet</p>
          </div>
        </Link>

        <Link
          href={`/${leagueSlug}/captain/fees`}
          className="flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">Team Fees</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Invoices & payments</p>
          </div>
        </Link>

        <Link
          href={`/${leagueSlug}/captain/player-payments`}
          className="flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">Player Payments</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Track player fee collection</p>
          </div>
        </Link>

        <Link
          href={`/${leagueSlug}/schedule?team=${currentTeam.team_id}`}
          className="flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">Team Schedule</p>
            <p className="text-sm text-[var(--color-text-secondary)]">View upcoming games</p>
          </div>
        </Link>

        <Link
          href={`/${leagueSlug}/teams/${currentTeam.team.slug}`}
          className="flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--league-primary)]/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-[var(--league-primary)]" />
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">Team Page</p>
            <p className="text-sm text-[var(--color-text-secondary)]">Public team profile</p>
          </div>
        </Link>

        <Link
          href={`/${leagueSlug}/standings`}
          className="flex items-center gap-4 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">Standings</p>
            <p className="text-sm text-[var(--color-text-secondary)]">League standings</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-hover)] flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-[var(--color-text-primary)]">{value}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
        </div>
      </div>
    </div>
  );
}
