import { getCurrentUser } from '@/lib/actions/auth';
import { getTeam, getLeagueDivisions, getLeagueVenues } from '@/lib/actions/teams';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import TeamSettingsClient from './team-settings-client';

export async function generateMetadata({ params }: { params: { teamId: string } }) {
  const result = await getTeam(params.teamId);
  if (!result.data) {
    return { title: 'Team Not Found' };
  }
  return {
    title: `Settings - ${result.data.name} | Beer League Hockey`,
    description: `Manage ${result.data.name} team settings`,
  };
}

export default async function TeamSettingsPage({
  params,
}: {
  params: { teamId: string };
}) {
  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const result = await getTeam(params.teamId);

  if (result.error || !result.data) {
    notFound();
  }

  const team = result.data;

  // Get divisions and venues for the league
  const [divisionsResult, venuesResult] = await Promise.all([
    getLeagueDivisions(team.league_id),
    getLeagueVenues(team.league_id),
  ]);

  const divisions = divisionsResult.data || [];
  const venues = venuesResult.data || [];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/dashboard/teams/${team.id}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Team
          </Link>

          <div className="flex items-center gap-4">
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt={team.name}
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                style={{ backgroundColor: team.primary_color || '#22D3EE' }}
              >
                {team.short_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-white">Team Settings</h1>
              <p className="text-neutral-400">{team.name}</p>
            </div>
          </div>
        </div>

        {/* Settings Form - Client Component */}
        <TeamSettingsClient
          team={team}
          divisions={divisions}
          venues={venues}
        />
      </div>
    </div>
  );
}
