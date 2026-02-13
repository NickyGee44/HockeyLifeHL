import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TeamRegistrationForm } from '@/components/teams/TeamRegistrationForm';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function RegisterTeamPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const supabase = await createClient();

  // Get league details
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, primary_color')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    console.error('[Register Team Page] Error fetching league:', leagueError?.message);
    notFound();
  }

  // Get divisions for this league
  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('league_id', leagueId)
    .order('name');

  // Check if user already has a pending request
  const { data: existingRequest } = await supabase
    .from('team_registration_requests')
    .select('id, team_name, status')
    .eq('league_id', leagueId)
    .eq('requester_id', userData.user.id)
    .eq('status', 'pending')
    .single();

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/${locale}/dashboard/leagues/${leagueId}/teams`}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Teams
          </Link>

          <h1 className="text-3xl font-black text-white tracking-tight">Register a Team</h1>
          <p className="text-neutral-400 mt-1">
            Submit a request to register your team in {league.name}
          </p>
        </div>

        {/* Form or Existing Request */}
        {existingRequest ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-yellow-500 mb-2">
              Pending Request
            </h2>
            <p className="text-neutral-300 mb-4">
              You already have a pending team registration request for{' '}
              <span className="font-medium text-white">&quot;{existingRequest.team_name}&quot;</span>.
            </p>
            <p className="text-sm text-neutral-400">
              Please wait for the league administrators to review your request.
              You will receive an email notification once your request has been processed.
            </p>
          </div>
        ) : (
          <TeamRegistrationForm
            leagueId={leagueId}
            leagueName={league.name}
            divisions={divisions || []}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}
