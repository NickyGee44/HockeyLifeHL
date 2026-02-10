'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { usePlayerProfile } from '@/hooks/usePlayerProfile';
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

export default function CaptainPage({ params }: CaptainPageProps) {
  const { leagueSlug } = use(params);
  const { currentTeam, isLoading: profileLoading } = usePlayerProfile();
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isCaptain = currentTeam?.is_captain || currentTeam?.is_alternate;

  const fetchRosterData = useCallback(async () => {
    if (!currentTeam?.team_id) return;

    const [rosterResult, requestsResult] = await Promise.all([
      getTeamRoster(currentTeam.team_id),
      getJoinRequests(currentTeam.team_id),
    ]);

    if (rosterResult.success && rosterResult.data) {
      setRoster(rosterResult.data);
    }
    if (requestsResult.success && requestsResult.data) {
      setJoinRequests(requestsResult.data);
    }
  }, [currentTeam?.team_id]);

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

      setIsLoading(false);
    };

    if (!profileLoading) {
      fetchData();
    }
  }, [currentTeam, isCaptain, profileLoading, fetchRosterData]);

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

      {/* Roster Manager (editable roster + join requests) */}
      <RosterManager
        teamId={currentTeam.team_id}
        roster={roster}
        joinRequests={joinRequests}
        onRosterUpdate={fetchRosterData}
      />

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
