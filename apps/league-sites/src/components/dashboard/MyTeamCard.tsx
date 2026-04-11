'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Trophy, Shield, AlertCircle, RefreshCw } from 'lucide-react';

interface TeamMembership {
  id: string;
  team_id: string;
  team: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    league_id: string;
    division_id: string | null;
  } | null;
  jersey_number: number | null;
  position: string | null;
  leadership_role: 'captain' | 'alternate_captain' | null;
}

interface TeamStats {
  wins: number;
  losses: number;
  ties: number;
  overtime_losses: number;
  points: number;
  division_rank: number | null;
  division_name: string | null;
}

interface MyTeamCardProps {
  team: TeamMembership | null;
  leagueSlug: string;
  seasonId?: string | null;
}

function sortStandings(left: any, right: any) {
  const leftPoints = Number(left?.points || 0);
  const rightPoints = Number(right?.points || 0);
  if (rightPoints !== leftPoints) return rightPoints - leftPoints;

  const leftWins = Number(left?.wins || 0);
  const rightWins = Number(right?.wins || 0);
  if (rightWins !== leftWins) return rightWins - leftWins;

  const leftGoalDiff = Number(left?.goal_differential || 0);
  const rightGoalDiff = Number(right?.goal_differential || 0);
  if (rightGoalDiff !== leftGoalDiff) return rightGoalDiff - leftGoalDiff;

  const leftGoalsFor = Number(left?.goals_for || 0);
  const rightGoalsFor = Number(right?.goals_for || 0);
  if (rightGoalsFor !== leftGoalsFor) return rightGoalsFor - leftGoalsFor;

  return String(left?.team_name || '').localeCompare(String(right?.team_name || ''));
}

export function MyTeamCard({ team, leagueSlug, seasonId }: MyTeamCardProps) {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!team || !team.team) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Try to get team standings data (actual RPC: get_team_standings)
      const { data, error: rpcError } = await supabase.rpc('get_team_standings', {
        check_league_id: team.team.league_id,
        check_season_id: seasonId || null,
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to load team stats');
      }

      if (data) {
        const teamStanding = data.find((s: any) => s.team_id === team.team_id);
        if (teamStanding) {
          const relevantStandings = data
            .filter((s: any) =>
              teamStanding.division_id ? s.division_id === teamStanding.division_id : true
            )
            .sort(sortStandings);

          const divisionRank =
            relevantStandings.findIndex((s: any) => s.team_id === team.team_id) + 1;

          setStats({
            wins: Number(teamStanding.wins || 0),
            losses: Number(teamStanding.losses || 0),
            ties: Number(teamStanding.ties || 0),
            overtime_losses: Number(teamStanding.overtime_losses || 0),
            points: Number(teamStanding.points || 0),
            division_rank: divisionRank || null,
            division_name: teamStanding.division_name || null,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team stats');
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [seasonId, team]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await fetchStats();
  };

  if (!team || !team.team) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-[var(--color-surface-hover)] rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-[var(--color-text-secondary)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)]">No Team</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              You&apos;re not currently on a team in this league
            </p>
          </div>
          <Link
            href={`/${leagueSlug}/teams`}
            className="inline-block px-4 py-2 bg-[var(--league-primary)] text-[var(--color-accent-text)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Browse Teams
          </Link>
        </div>
      </div>
    );
  }

  const record = `${stats?.wins || 0}-${stats?.losses || 0}-${stats?.ties || 0}`;
  const otl = stats?.overtime_losses || 0;
  const fullRecord = otl > 0 ? `${record}-${otl}` : record;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Team Header */}
      <div className="p-6 border-b border-[var(--color-border)]">
        <Link
          href={`/${leagueSlug}/teams/${team.team.slug}`}
          className="flex items-center gap-4 group"
        >
          <Image
            src={team.team.logo || '/blank_team.png'}
            alt={team.team.name}
            width={80}
            height={80}
            className="rounded-lg group-hover:scale-105 transition-transform"
          />
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--league-primary)] transition-colors">
              {team.team.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              {team.leadership_role === 'captain' && (
                <span className="flex items-center gap-1 text-[var(--league-primary)]">
                  <Shield className="w-4 h-4" />
                  Captain
                </span>
              )}
              {team.leadership_role === 'alternate_captain' && (
                <span className="flex items-center gap-1 text-[var(--league-primary)]">
                  <Shield className="w-4 h-4" />
                  Alternate
                </span>
              )}
              {team.jersey_number && (
                <span>#{team.jersey_number}</span>
              )}
              {team.position && (
                <span className="text-[var(--color-text-muted)]">{team.position}</span>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Team Stats */}
      {isLoading ? (
        <div className="p-4 flex justify-center">
          <div className="animate-pulse flex gap-4">
            <div className="w-16 h-12 bg-[var(--color-surface-hover)] rounded" />
            <div className="w-16 h-12 bg-[var(--color-surface-hover)] rounded" />
            <div className="w-16 h-12 bg-[var(--color-surface-hover)] rounded" />
          </div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/5 border-t border-red-500/10">
          <div className="flex flex-col items-center text-center space-y-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </div>
      ) : stats ? (
        <div className="p-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {fullRecord}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
              Record
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--league-primary)]">
              {stats.points}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
              Points
            </p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1">
              {stats.division_rank && stats.division_rank <= 3 && (
                <Trophy className="w-4 h-4 text-yellow-500" />
              )}
              <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                {stats.division_rank ? `#${stats.division_rank}` : '-'}
              </p>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider">
              {stats.division_name || 'Standing'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
