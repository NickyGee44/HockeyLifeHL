import { setRequestLocale } from 'next-intl/server';
import { redirect as nextRedirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { DraftDashboard } from '@/components/dashboard/leagues/draft-dashboard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function DraftPage({ params }: Props) {
  const awaited = await params;
  const { locale, id: leagueId } = awaited;
  setRequestLocale(locale);

  const userData = await getCurrentUser();
  if (!userData) {
    nextRedirect(`/${locale}/login`);
  }

  const userId = userData!.user!.id;
  const supabase = await createClient();

  // Get league with seasons and teams
  const { data: league, error } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      slug,
      seasons (
        id,
        name,
        status,
        registration_type
      )
    `)
    .eq('id', leagueId)
    .single();

  if (error || !league) {
    notFound();
  }

  // Find the draft-type season
  const draftSeason = (league.seasons as any[])?.find(
    (s: any) => s.registration_type === 'draft'
  );

  if (!draftSeason) {
    notFound();
  }

  // Check for existing draft record
  const { data: existingDraft } = await (supabase as any)
    .from('drafts')
    .select('id, status, name')
    .eq('league_id', leagueId)
    .eq('season_id', draftSeason.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('league_id', leagueId);

  // Check if user is admin (owner) of this league
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .single();

  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin';

  // Get user's team (if captain)
  // team_members table is not in generated types yet
  const { data: captainTeam } = await (supabase as any)
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .eq('role', 'captain')
    .limit(1)
    .maybeSingle() as { data: { team_id: string; role: string } | null };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/${locale}/dashboard/leagues/${leagueId}`}
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-rink-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to League
        </Link>

        <DraftDashboard
          leagueId={leagueId}
          leagueName={league.name}
          seasonId={draftSeason.id}
          seasonName={draftSeason.name}
          existingDraft={existingDraft || null}
          teams={teams || []}
          userId={userId}
          userTeamId={captainTeam?.team_id || null}
          isAdmin={isAdmin}
          isCaptain={!!captainTeam}
        />
      </div>
    </div>
  );
}
