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

  const allSeasons = (league.seasons as any[]) ?? [];

  // Find the active/upcoming draft-type season
  const draftSeason = allSeasons.find(
    (s: any) => s.registration_type === 'draft' && s.status !== 'archived'
  ) ?? allSeasons.find((s: any) => s.registration_type === 'draft');

  if (!draftSeason) {
    notFound();
  }

  // Past seasons that can be used as a player pool source (completed or archived, not the current one)
  const pastSeasons = allSeasons.filter(
    (s: any) => s.id !== draftSeason.id && (s.status === 'completed' || s.status === 'archived')
  );

  // Check for existing draft record
  const { data: existingDraft } = await (supabase as any)
    .from('drafts')
    .select('id, status, name')
    .eq('league_id', leagueId)
    .eq('season_id', draftSeason.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get teams scoped to this draft season.
  // If a draft already exists, fetch teams from draft_order (exact set for this draft).
  // Otherwise fall back to active teams in the league for the setup wizard.
  let teams: { id: string; name: string }[] = [];
  if (existingDraft) {
    const { data: draftOrderRows } = await (supabase as any)
      .from('draft_order')
      .select('team_id, teams(id, name)')
      .eq('draft_id', existingDraft.id)
      .order('pick_position', { ascending: true });

    const seen = new Set<string>();
    for (const row of draftOrderRows ?? []) {
      const t = (row as any).teams;
      if (t && !seen.has(t.id)) {
        seen.add(t.id);
        teams.push({ id: t.id, name: t.name });
      }
    }
  } else {
    const { data: activeTeams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('league_id', leagueId)
      .eq('status', 'active');
    teams = activeTeams ?? [];
  }

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
          pastSeasons={pastSeasons}
          userId={userId}
          userTeamId={captainTeam?.team_id || null}
          isAdmin={isAdmin}
          isCaptain={!!captainTeam}
        />
      </div>
    </div>
  );
}
