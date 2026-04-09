/**
 * League Scorekeepers Settings Page
 *
 * Bulk scorekeeper management for a league.
 * Includes: view/add/edit scorekeepers, bulk assign to games, auto-assign, CSV import/export.
 */

import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getLeagueScorekepers } from '@/lib/actions/scorekeeper-management';
import { ScorekeeperManagementClient, SelfScorekeeperToggle } from '@/components/scorekeepers';
import { cn } from '@hockey-life/ui';
import { ArrowLeft, Users } from 'lucide-react';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';

export const metadata = {
  title: 'Scorekeepers | League Settings',
  description: 'Manage scorekeepers and game assignments for your league',
};

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function LeagueScorekeepersPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const { supabase } = await requireLeagueDashboardAccess({ leagueId, locale });

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color, settings')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  // Fetch initial data
  const [scorekeepersResult, seasonsResult] = await Promise.all([
    getLeagueScorekepers(leagueId),
    supabase
      .from('seasons')
      .select('id, name')
      .eq('league_id', leagueId)
      .order('start_date', { ascending: false }),
  ]);

  const scorekeepers = scorekeepersResult.success ? scorekeepersResult.data.scorekeepers : [];
  const seasons = seasonsResult.data || [];
  const leagueSettings = ((league.settings as Record<string, unknown> | null) ?? {});
  const selfScorekeeperEnabled =
    leagueSettings.self_scorekeeper_enabled === true ||
    leagueSettings.scorekeepingMode === 'self_scorekeeping' ||
    leagueSettings.statEntryMode === 'captain';

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
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Scorekeepers</h1>
              <p className="text-neutral-400">{league.name}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <StatCard
            label="Total Scorekeepers"
            value={scorekeepers.length}
            color="gold"
          />
          <StatCard
            label="Active"
            value={scorekeepers.filter((sk) => sk.status === 'active').length}
            color="green"
          />
          <StatCard
            label="Inactive"
            value={scorekeepers.filter((sk) => sk.status === 'inactive').length}
            color="neutral"
          />
          <StatCard
            label="Total Assignments"
            value={scorekeepers.reduce((sum, sk) => sum + (sk.total_assignments || 0), 0)}
            color="blue"
          />
        </div>

        {/* Self-Scorekeeping Toggle */}
        <SelfScorekeeperToggle
          leagueId={leagueId}
          initialEnabled={selfScorekeeperEnabled}
        />

        {/* Management Client */}
        <ScorekeeperManagementClient
          leagueId={leagueId}
          initialScorekepers={scorekeepers}
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
