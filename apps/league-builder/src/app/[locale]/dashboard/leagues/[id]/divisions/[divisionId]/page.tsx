import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { getDivision, getDivisionTeams, getUnassignedTeams } from '@/lib/actions/divisions';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Trophy, Users, Clock, Plus, Settings } from 'lucide-react';
import { DivisionTeamManager } from './DivisionTeamManager';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

type Props = {
  params: Promise<{ locale: string; id: string; divisionId: string }>;
};

export default async function DivisionDetailPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId, divisionId } = awaited;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('[Division Detail] Error fetching league:', leagueError?.message);
    notFound();
  }

  // Get division details
  const divisionResult = await getDivision(divisionId);
  if (!divisionResult.success) {
    notFound();
  }
  const division = divisionResult.data;

  // Verify division belongs to this league
  if (division.league_id !== leagueId) {
    notFound();
  }

  // Get teams in this division
  const teamsResult = await getDivisionTeams(divisionId);
  const teams = teamsResult.success ? teamsResult.data : [];

  // Get unassigned teams
  const unassignedResult = await getUnassignedTeams(leagueId);
  const unassignedTeams = unassignedResult.success ? unassignedResult.data : [];

  const skillLevelColors: Record<string, string> = {
    A: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    B: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    C: 'bg-green-500/10 text-green-500 border-green-500/30',
    Beginner: 'bg-green-500/10 text-green-500 border-green-500/30',
    Intermediate: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    Advanced: 'bg-red-500/10 text-red-500 border-red-500/30',
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/divisions`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Divisions
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: league.primary_color || '#22D3EE' }}
              >
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black text-white tracking-tight">
                    {division.name}
                  </h1>
                  {division.skill_level && (
                    <span
                      className={cn(
                        'px-2.5 py-1 text-xs font-semibold rounded-full border',
                        skillLevelColors[division.skill_level] ||
                          'bg-neutral-800 text-neutral-400 border-neutral-700'
                      )}
                    >
                      {division.skill_level}
                    </span>
                  )}
                </div>
                <p className="text-neutral-400 mt-1">
                  {league.name}
                  {division.description && ` - ${division.description}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">Teams</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {division.team_count}
              {division.max_teams && (
                <span className="text-sm font-normal text-neutral-500 ml-1">
                  / {division.max_teams}
                </span>
              )}
            </p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">Game Duration</span>
            </div>
            <p className="text-2xl font-bold text-white">{division.game_duration_minutes} min</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-5 h-5 text-rink-500" />
              <span className="text-sm text-neutral-400">Periods</span>
            </div>
            <p className="text-2xl font-bold text-white">{division.period_count}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Plus className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-neutral-400">Available to Add</span>
            </div>
            <p className="text-2xl font-bold text-white">{unassignedTeams.length}</p>
          </div>
        </div>

        {/* Team Management */}
        <DivisionTeamManager
          division={division}
          leagueId={leagueId}
          locale={locale}
          initialTeams={teams}
          initialUnassignedTeams={unassignedTeams}
        />
      </div>
    </div>
  );
}
