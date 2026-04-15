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
  Mail,
  Goal,
  PlayCircle,
} from 'lucide-react';
import { RosterManager } from '@/components/captain/RosterManager';
import { TeamAttendance } from '@/components/captain/TeamAttendance';
import { SubInviteModal } from '@/components/captain/SubInviteModal';
import { InvitePlayerWizard } from '@/components/captain/InvitePlayerWizard';
import { getOrCreateCaptainScorekeeperSession } from '@/lib/actions/scorekeeper';
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
  division_name: string | null;
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
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile(
    league?.id,
    league?.current_season_id
  );
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [nextLineupGame, setNextLineupGame] = useState<UpcomingLineupGame | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subInviteGameId, setSubInviteGameId] = useState<string | null>(null);
  const [inviteWizardOpen, setInviteWizardOpen] = useState(false);
  const [startingScore, setStartingScore] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;
  const leagueSettings = (league?.settings ?? null) as Record<string, unknown> | null;
  const selfScorekeeperEnabled =
    leagueSettings?.self_scorekeeper_enabled === true ||
    leagueSettings?.scorekeepingMode === 'self_scorekeeping' ||
    leagueSettings?.statEntryMode === 'captain';

  const teamId = currentTeam?.team_id;

  const fetchRosterData = useCallback(async () => {
    if (!teamId) return;

    const currentSeasonId = league?.current_season_id ?? null;

    const [rosterResult, requestsResult] = await Promise.all([
      getTeamRoster(teamId, currentSeasonId),
      getJoinRequests(teamId),
    ]);

    if (rosterResult.success && rosterResult.data) {
      setRoster(rosterResult.data);
    }
    if (requestsResult.success && requestsResult.data) {
      setJoinRequests(requestsResult.data);
    }
  }, [league?.current_season_id, teamId]);

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
      const [{ data: standings }, { data: leagueTeams }] = await Promise.all([
        supabase.rpc('get_team_standings', {
          check_league_id: currentTeam.team.league_id,
          check_season_id: league?.current_season_id || null,
        }),
        supabase
          .from('teams')
          .select('id, division_id')
          .eq('league_id', currentTeam.team.league_id),
      ]);

      if (standings) {
        const myTeam = standings.find((s: any) => s.team_id === currentTeam.team_id);
        if (myTeam) {
          const divisionIdByTeam = new Map(
            (leagueTeams || []).map((team: any) => [team.id, team.division_id ?? null])
          );

          // Calculate division rank from real team division membership, not RPC rows.
          const divisionTeams = standings.filter((s: any) => {
            if (!currentTeam.team?.division_id) return true;
            return divisionIdByTeam.get(s.team_id) === currentTeam.team.division_id;
          });

          divisionTeams.sort((a: any, b: any) => {
            const pointsDiff = Number(b.points || 0) - Number(a.points || 0);
            if (pointsDiff !== 0) return pointsDiff;
            const winsDiff = Number(b.wins || 0) - Number(a.wins || 0);
            if (winsDiff !== 0) return winsDiff;
            const goalDiff = Number(b.goal_differential || 0) - Number(a.goal_differential || 0);
            if (goalDiff !== 0) return goalDiff;
            const goalsForDiff = Number(b.goals_for || 0) - Number(a.goals_for || 0);
            if (goalsForDiff !== 0) return goalsForDiff;
            return String(a.team_id || '').localeCompare(String(b.team_id || ''));
          });

          const divisionRank = divisionTeams.findIndex((s: any) => s.team_id === currentTeam.team_id) + 1;

          setTeamStats({
            wins: Number(myTeam.wins || 0),
            losses: Number(myTeam.losses || 0),
            ties: Number(myTeam.ties || 0),
            points: Number(myTeam.points || 0),
            division_rank: divisionRank || null,
            division_name: null,
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

  const handleStartScoring = useCallback(async () => {
    if (!teamId || !nextLineupGame) return;

    setScoreError(null);
    setStartingScore(true);

    try {
      const result = await getOrCreateCaptainScorekeeperSession(nextLineupGame.id, teamId);

      if (result.success && result.token) {
        window.location.href = `/${result.leagueSlug ?? leagueSlug}/scorekeeper?token=${result.token}`;
        return;
      }

      setScoreError(result.error || 'Failed to start scoring session');
    } catch {
      setScoreError('Failed to start scoring session. Please try again.');
    } finally {
      setStartingScore(false);
    }
  }, [leagueSlug, nextLineupGame, teamId]);

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
  const captainNavItems = [
    selfScorekeeperEnabled && nextLineupGame
      ? {
          type: 'button' as const,
          label: startingScore ? 'Starting...' : 'Score Game',
          icon: PlayCircle,
          tone: 'bg-emerald-400/15 border-emerald-300/30 text-emerald-50',
          onClick: handleStartScoring,
          disabled: startingScore,
        }
      : null,
    nextLineupGame
      ? {
          type: 'link' as const,
          href: `/${leagueSlug}/captain/lineups/${nextLineupGame.id}`,
          label: 'Open Lineup Studio',
          icon: Calendar,
          tone: 'bg-cyan-500/10 border-cyan-400/20 text-cyan-100',
        }
      : null,
    {
      type: 'link' as const,
      href: `/${leagueSlug}/captain/duties`,
      label: 'Game Duties',
      icon: CheckCircle2,
      tone: 'bg-[var(--league-primary)]/10 border-[var(--league-primary)]/20 text-[var(--league-primary)]',
    },
    {
      type: 'link' as const,
      href: `/${leagueSlug}/captain/goalies`,
      label: 'Goalies',
      icon: Goal,
      tone: 'bg-cyan-500/10 border-cyan-400/20 text-cyan-100',
    },
    {
      type: 'link' as const,
      href: `/${leagueSlug}/captain/fees`,
      label: 'Team Fees',
      icon: DollarSign,
      tone: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]',
    },
    {
      type: 'link' as const,
      href: `/${leagueSlug}/captain/player-payments`,
      label: 'Player Payments',
      icon: Users,
      tone: 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]',
    },
    {
      type: 'link' as const,
      href: `/${leagueSlug}/captain/team-return`,
      label: 'Team Return',
      icon: Mail,
      tone: 'bg-cyan-500/10 border-cyan-400/20 text-cyan-100',
    },
  ].filter(Boolean) as Array<{
    type: 'link' | 'button';
    href?: string;
    label: string;
    icon: typeof Calendar;
    tone: string;
    onClick?: () => void;
    disabled?: boolean;
  }>;

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

      <div className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex flex-wrap gap-2">
          {captainNavItems.map((item) => {
            const Icon = item.icon;
            const className = `inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 ${item.tone}`;

            if (item.type === 'button') {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={className}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {scoreError && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {scoreError}
        </div>
      )}

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

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Roster tools</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Invite a new or existing player, then send their registration link.</p>
        </div>
        <button
          type="button"
          onClick={() => setInviteWizardOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--league-primary)]/30 bg-[var(--league-primary)]/10 px-4 py-2 text-sm font-semibold text-[var(--league-primary)] transition-colors hover:bg-[var(--league-primary)]/20"
        >
          <Users className="h-4 w-4" />
          Invite player
        </button>
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
          leagueId={currentTeam.team.league_id}
          seasonId={league?.current_season_id || null}
          leagueSlug={leagueSlug}
          onRequestSub={(gameId) => setSubInviteGameId(gameId)}
        />
      </div>

      <InvitePlayerWizard
        isOpen={inviteWizardOpen}
        onClose={() => {
          setInviteWizardOpen(false);
          fetchRosterData();
        }}
        teamId={currentTeam.team_id}
        seasonId={league?.current_season_id || ''}
      />

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
