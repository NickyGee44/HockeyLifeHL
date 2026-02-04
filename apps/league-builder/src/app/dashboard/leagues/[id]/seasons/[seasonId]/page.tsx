/**
 * Season Detail Page
 *
 * Dashboard hub for managing a specific season within a league.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@hockey-life/ui';
import {
  ArrowLeft,
  Calendar,
  Trophy,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  Play,
  UserPlus,
  Edit,
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    id: string;
    seasonId: string;
  }>;
}

export default async function SeasonDetailPage({ params }: PageProps) {
  const { id: leagueId, seasonId } = await params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get season with league info
  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select(
      `
      *,
      league:leagues(
        id,
        name,
        slug,
        primary_color
      )
    `
    )
    .eq('id', seasonId)
    .eq('league_id', leagueId)
    .single();

  if (seasonError || !season) {
    notFound();
  }

  // Get teams count for this season (teams linked to the league)
  const { count: teamsCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId)
    .eq('status', 'active');

  // Get games count for this season
  const { count: gamesCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId);

  // Get player registrations count (via team_rosters)
  const { count: registrationsCount } = await supabase
    .from('team_rosters')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId);

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-500 border-green-500/30',
    draft: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    completed: 'bg-neutral-800 text-neutral-400 border-neutral-700',
    playoffs: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-gold-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {season.league?.name || 'League'}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: season.league?.primary_color || '#D4AF37',
                }}
              >
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  {season.name}
                </h1>
                <p className="text-neutral-400 mt-1">
                  {season.start_date
                    ? new Date(season.start_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Start TBD'}{' '}
                  -{' '}
                  {season.end_date
                    ? new Date(season.end_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'End TBD'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-3 py-1.5 text-sm font-semibold rounded-full border',
                  statusColors[season.status ?? 'draft'] || statusColors.draft
                )}
              >
                {(season.status || 'draft').charAt(0).toUpperCase() +
                  (season.status || 'draft').slice(1)}
              </span>
              <Link
                href={`/dashboard/leagues/${leagueId}/seasons/${seasonId}/edit`}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
                  'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700',
                  'transition-colors'
                )}
              >
                <Edit className="w-4 h-4" />
                Edit Season
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <div className="bg-neutral-900 border border-gold-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-gold-500" />
              <span className="text-sm text-neutral-400">Teams</span>
            </div>
            <p className="text-2xl font-bold text-white">{teamsCount || 0}</p>
          </div>
          <div className="bg-neutral-900 border border-gold-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Play className="w-5 h-5 text-gold-500" />
              <span className="text-sm text-neutral-400">Games</span>
            </div>
            <p className="text-2xl font-bold text-white">{gamesCount || 0}</p>
          </div>
          <div className="bg-neutral-900 border border-gold-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <UserPlus className="w-5 h-5 text-gold-500" />
              <span className="text-sm text-neutral-400">Registrations</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {registrationsCount || 0}
            </p>
          </div>
          <div className="bg-neutral-900 border border-gold-500/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-gold-500" />
              <span className="text-sm text-neutral-400">Schedule</span>
            </div>
            <p className="text-lg font-bold text-white">
              {season.schedule_generated ? (
                <span className="text-green-400">Generated</span>
              ) : (
                <span className="text-yellow-400">Pending</span>
              )}
            </p>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <ActionCard
            href={`/dashboard/seasons/${seasonId}/schedule`}
            icon={<Calendar className="w-6 h-6" />}
            title="Schedule Management"
            description="Generate and manage the game schedule"
            badge={
              season.schedule_generated ? (
                <span className="text-xs text-green-400">Generated</span>
              ) : (
                <span className="text-xs text-yellow-400">Setup Required</span>
              )
            }
          />
          <ActionCard
            href={`/dashboard/seasons/${seasonId}/standings`}
            icon={<Trophy className="w-6 h-6" />}
            title="Standings"
            description="View team standings and statistics"
          />
          <ActionCard
            href={`/dashboard/leagues/${leagueId}/registrations`}
            icon={<UserPlus className="w-6 h-6" />}
            title="Registrations"
            description="Manage player and team registrations"
            badge={
              registrationsCount ? (
                <span className="text-xs text-gold-400">
                  {registrationsCount} pending
                </span>
              ) : null
            }
          />
          <ActionCard
            href={`/dashboard/leagues/${leagueId}/teams`}
            icon={<Users className="w-6 h-6" />}
            title="Teams & Rosters"
            description="Manage teams and player rosters"
          />
          <ActionCard
            href={`/dashboard/leagues/${leagueId}/games`}
            icon={<ClipboardList className="w-6 h-6" />}
            title="Game Results"
            description="Enter scores and manage game stats"
          />
          <ActionCard
            href={`/dashboard/leagues/${leagueId}/settings`}
            icon={<Settings className="w-6 h-6" />}
            title="League Settings"
            description="Configure league and season settings"
          />
        </div>

        {/* Season Details */}
        <div className="bg-neutral-900 border border-gold-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Season Details</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <DetailItem
              label="Registration Type"
              value={formatRegistrationType(season.registration_type)}
            />
            <DetailItem
              label="Games per Cycle"
              value={season.games_per_cycle?.toString() || 'Not set'}
            />
            <DetailItem
              label="Max Players per Team"
              value={season.max_players_per_team?.toString() || 'Unlimited'}
            />
            <DetailItem
              label="Team Selection"
              value={season.allow_team_selection ? 'Players can choose' : 'Admin assigned'}
            />
            <DetailItem
              label="Current Game Count"
              value={season.current_game_count?.toString() || '0'}
            />
            <DetailItem
              label="Created"
              value={season.created_at ? new Date(season.created_at).toLocaleDateString() : 'Unknown'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-start gap-4 p-5 rounded-2xl transition-all duration-200',
        'bg-neutral-900 border border-gold-500/20 hover:border-gold-500/40',
        'group'
      )}
    >
      <div className="p-3 rounded-xl bg-gold-500/10 text-gold-500 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white group-hover:text-gold-500 transition-colors">
            {title}
          </h3>
          {badge}
        </div>
        <p className="text-sm text-neutral-400 mt-1">{description}</p>
      </div>
    </Link>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-800/50 rounded-lg p-3">
      <div className="text-xs text-neutral-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function formatRegistrationType(type: string | null): string {
  const types: Record<string, string> = {
    open_registration: 'Open Registration',
    draft: 'Draft',
    captain_invite_only: 'Captain Invite Only',
  };
  return types[type || ''] || type || 'Not set';
}
