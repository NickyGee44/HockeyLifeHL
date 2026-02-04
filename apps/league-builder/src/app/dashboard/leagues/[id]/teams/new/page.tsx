import { getCurrentUser } from '@/lib/actions/auth';
import { getLeagueDivisions, getLeagueVenues } from '@/lib/actions/teams';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TeamCreationWizard } from '@/components/teams';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Create Team | HockeyLifeHL',
  description: 'Add a new team to your league',
};

export default async function NewTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await params as required in Next.js 16
  const { id: leagueId } = await params;

  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { user } = userData;

  // Verify league access
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, organization_id, organizations!inner(owner_user_id)')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    notFound();
  }

  const orgOwnerId = (league.organizations as any).owner_user_id;
  if (orgOwnerId !== user.id) {
    redirect('/dashboard');
  }

  // Get divisions and venues for the league
  const [divisionsResult, venuesResult] = await Promise.all([
    getLeagueDivisions(leagueId),
    getLeagueVenues(leagueId),
  ]);

  const divisions = divisionsResult.data || [];
  const venues = venuesResult.data || [];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/dashboard/leagues/${leagueId}`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-gold-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {league.name}
          </Link>

          <h1 className="text-2xl font-black text-white">Create New Team</h1>
          <p className="text-neutral-400 mt-1">Add a new team to {league.name}</p>
        </div>

        {/* Team Creation Wizard */}
        <TeamCreationWizard
          leagueId={leagueId}
          divisions={divisions}
          venues={venues}
        />
      </div>
    </div>
  );
}
