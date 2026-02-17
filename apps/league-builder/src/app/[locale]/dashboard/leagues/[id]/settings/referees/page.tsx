/**
 * League Referees Settings Page
 *
 * Referee roster management for a league.
 * Shows staff members with "Referee" role, allows assigning them to games via game_officials table.
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLeagueReferees } from '@/lib/actions/referee-management';
import { RefereeManagementClient } from '@/components/referees';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata = {
  title: 'Referees | League Settings',
  description: 'Manage referees and game officiating assignments for your league',
};

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueRefereesPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    nextRedirect(`/${locale}/login?redirect=/${locale}/dashboard/leagues/${leagueId}/settings/referees`);
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

  // Fetch initial data
  const [refereesResult, seasonsResult, gamesResult] = await Promise.all([
    getLeagueReferees(leagueId),
    supabase
      .from('seasons')
      .select('id, name')
      .eq('league_id', leagueId)
      .order('start_date', { ascending: false }),
    // Get games for assignment
    supabase
      .from('games')
      .select(`
        id, scheduled_at, status, location,
        home_team:teams!games_home_team_id_fkey(name),
        away_team:teams!games_away_team_id_fkey(name),
        season:seasons!inner(league_id)
      `)
      .eq('seasons.league_id' as any, leagueId)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true }),
  ]);

  const referees = refereesResult.success && refereesResult.data ? refereesResult.data.referees : [];
  const seasons = seasonsResult.data || [];
  const games = (gamesResult.data || []).map((g: any) => ({
    id: g.id,
    scheduled_at: g.scheduled_at,
    status: g.status,
    location: g.location,
    home_team: g.home_team,
    away_team: g.away_team,
  }));

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/settings`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: league.primary_color || '#22D3EE' }}
            >
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Referees</h1>
              <p className="text-neutral-400">{league.name}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <StatCard
            label="Total Referees"
            value={referees.length}
            color="blue"
          />
          <StatCard
            label="Active"
            value={referees.filter((r) => r.is_active).length}
            color="green"
          />
          <StatCard
            label="Total Assignments"
            value={referees.reduce((sum, r) => sum + (r.total_assignments || 0), 0)}
            color="gold"
          />
        </div>

        {/* Management Client */}
        <RefereeManagementClient
          leagueId={leagueId}
          initialReferees={referees}
          games={games}
          seasons={seasons}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'gold' | 'green' | 'blue' | 'neutral';
}) {
  const colorClasses = {
    gold: 'text-rink-500',
    green: 'text-green-500',
    blue: 'text-blue-500',
    neutral: 'text-neutral-400',
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-4">
      <p className="text-sm text-neutral-400 mb-1">{label}</p>
      <p className={cn('text-3xl font-bold', colorClasses[color])}>{value}</p>
    </div>
  );
}
