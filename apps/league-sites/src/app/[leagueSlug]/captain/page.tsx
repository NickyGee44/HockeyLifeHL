'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Image from 'next/image';
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
  DollarSign,
  Mail,
  Goal,
  UserPlus,
} from 'lucide-react';
import { RosterManager } from '@/components/captain/RosterManager';
import { InvitePlayerWizard } from '@/components/captain/InvitePlayerWizard';
import {
  getTeamRoster,
  getTeamSubsWhoPlayed,
  getJoinRequests,
  type RosterPlayer,
  type JoinRequest,
  type SubRosterPlayer,
} from '@/lib/actions/captain-roster';
import { getCaptainTeamReturnRequests } from '@/lib/actions/team-return';

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

interface CaptainActionItem {
  type: 'link' | 'button';
  label: string;
  href?: string;
  onClick?: () => void;
  icon: typeof Calendar;
}

export default function CaptainPage({ params }: CaptainPageProps) {
  const { leagueSlug } = use(params);
  const { league } = useLeague();
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile(
    league?.id,
    league?.current_season_id
  );
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [subs, setSubs] = useState<SubRosterPlayer[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [nextLineupGame, setNextLineupGame] = useState<UpcomingLineupGame | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteWizardOpen, setInviteWizardOpen] = useState(false);
  const [hasPendingTeamReturn, setHasPendingTeamReturn] = useState(false);

  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;

  const teamId = currentTeam?.team_id;

  const fetchRosterData = useCallback(async () => {
    if (!teamId) return;

    const currentSeasonId = league?.current_season_id ?? null;

    const [rosterResult, subsResult, requestsResult] = await Promise.all([
      getTeamRoster(teamId, currentSeasonId),
      getTeamSubsWhoPlayed(teamId, currentSeasonId),
      getJoinRequests(teamId),
    ]);

    if (rosterResult.success && rosterResult.data) {
      setRoster(rosterResult.data);
    }
    if (subsResult.success && subsResult.data) {
      setSubs(subsResult.data);
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

      // Only show the Team Return button when the captain actually has a
      // pending request to respond to — anything confirmed/declined is done.
      const teamReturnResult = await getCaptainTeamReturnRequests({
        leagueSlug,
        teamId: currentTeam.team_id,
      });
      if (teamReturnResult.success) {
        const pending = teamReturnResult.data.entries.some(
          (entry) => entry.status !== 'confirmed' && entry.status !== 'declined',
        );
        setHasPendingTeamReturn(pending);
      } else {
        setHasPendingTeamReturn(false);
      }

      setIsLoading(false);
    };

    if (!profileLoading) {
      fetchData();
    }
  }, [currentTeam, isCaptain, profileLoading, fetchRosterData, league, leagueSlug]);

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

  const regularRoster = roster.filter((player) => player.player_type === 'regular');
  const record = `${teamStats?.wins || 0}-${teamStats?.losses || 0}-${teamStats?.ties || 0}`;
  const rankLabel = teamStats?.division_rank ? `#${teamStats.division_rank}` : '-';
  const nextGameDateLabel = nextLineupGame
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(nextLineupGame.scheduled_at))
    : 'No game scheduled';
  const captainActionItems = [
    nextLineupGame
      ? {
          type: 'link' as const,
          href: `/${leagueSlug}/captain/lineups/${nextLineupGame.id}`,
          label: 'Game Day',
          icon: Calendar,
        }
      : null,
    {
      type: 'link' as const,
      href: `/${leagueSlug}/captain/goalies`,
      label: 'Goalies',
      icon: Goal,
    },
    {
      type: 'link' as const,
      href: `/${leagueSlug}/captain/fees`,
      label: 'Team Fees',
      icon: DollarSign,
    },
    {
      type: 'link' as const,
      href: `/${leagueSlug}/captain/player-payments`,
      label: 'Player Payments',
      icon: Users,
    },
    {
      type: 'button' as const,
      label: 'Invite Player',
      icon: UserPlus,
      onClick: () => setInviteWizardOpen(true),
    },
    hasPendingTeamReturn
      ? {
          type: 'link' as const,
          href: `/${leagueSlug}/captain/team-return`,
          label: 'Team Return',
          icon: Mail,
        }
      : null,
  ].filter(Boolean) as CaptainActionItem[];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 rounded-[30px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_28px_70px_-46px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-5">
          <div className="flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden">
            {currentTeam.team.logo ? (
              <Image
                src={currentTeam.team.logo}
                alt={currentTeam.team.name}
                width={192}
                height={192}
                className="h-full w-full object-contain"
              />
            ) : (
              <Shield className="h-16 w-16 text-[var(--league-primary)]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
              Captains Home
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {currentTeam.team.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)] sm:text-sm">
              <span>Record: {record}</span>
              <span>Rank: {rankLabel}</span>
              <span>Next Opponent: {nextLineupGame?.opponentName ?? 'TBD'}</span>
              <span>Next Game: {nextGameDateLabel}</span>
              <span>Players on Roster: {regularRoster.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-40 mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {captainActionItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 text-[var(--league-primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.12em] sm:text-base">{item.label}</p>
              </div>
            </>
          );

          const className = 'relative z-40 min-h-[108px] rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-[var(--color-text-primary)] shadow-[0_28px_70px_-46px_rgba(0,0,0,0.88)] transition-all backdrop-blur-xl hover:border-[var(--league-primary)]/35 hover:bg-white/[0.08]';

          if (item.type === 'button') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={className}
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={item.href} href={item.href!} className={className}>
              {content}
            </Link>
          );
        })}
      </div>

      <div className="mb-8 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Subs</h2>
          <span className="text-sm text-[var(--color-text-secondary)]">{subs.length} played this season</span>
        </div>
        {subs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-surface-hover)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Player</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Position</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">Games</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {subs.map((player) => (
                  <tr key={player.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{player.profile?.full_name || 'Unknown Player'}</td>
                    <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">{player.position || '-'}</td>
                    <td className="px-4 py-3 text-center text-[var(--color-text-primary)]">{player.games_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-5 text-sm text-[var(--color-text-secondary)]">
            No subs have appeared in a game yet this season.
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

      <InvitePlayerWizard
        isOpen={inviteWizardOpen}
        onClose={() => {
          setInviteWizardOpen(false);
          fetchRosterData();
        }}
        teamId={currentTeam.team_id}
        seasonId={league?.current_season_id || ''}
      />
    </div>
  );
}

