import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getGame } from '@/lib/actions/games';
import { PrintBar } from '@/components/games/PrintBar';
import { PrintableGameSheet, type RosterPlayer } from '@/components/games/PrintableGameSheet';

type Props = {
  params: Promise<{ locale: string; id: string; gameId: string }>;
};

export const metadata = {
  title: 'Print Game Sheet',
};

export default async function PrintSheetPage({ params }: Props) {
  const { locale, id: leagueId, gameId } = await params;
  setRequestLocale(locale);

  // Auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // Authorization — owner or admin only (same guard as game detail page)
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, logo_url, created_by')
    .eq('id', leagueId)
    .single();

  if (!league) notFound();

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role, status')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single();

  const isAuthorized =
    league.created_by === user.id ||
    (membership && ['owner', 'admin'].includes(membership.role) && membership.status === 'active');

  if (!isAuthorized) {
    redirect(`/${locale}/dashboard?error=unauthorized`);
  }

  // Game data
  const gameResult = await getGame(gameId);
  if (!gameResult.success || !gameResult.data) notFound();
  const game = gameResult.data;
  if (game.league_id !== leagueId) notFound();

  const seasonId = (game.season as { id: string } | null)?.id;

  // Fetch both team rosters in parallel
  const serviceClient = createServiceRoleClient();

  const fetchRoster = async (teamId: string): Promise<RosterPlayer[]> => {
    if (!seasonId) return [];
    const { data } = await (serviceClient as any)
      .from('team_rosters')
      .select('jersey_number, is_goalie, player:profiles!team_rosters_player_id_fkey(full_name)')
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .is('end_date', null)
      .eq('status', 'active')
      .order('jersey_number', { ascending: true });

    return (data ?? []).map((row: any) => ({
      jerseyNumber: row.jersey_number as number | null,
      fullName: (row.player?.full_name as string) ?? 'Unknown',
      isGoalie: row.is_goalie === true,
    }));
  };

  const [homeRoster, awayRoster] = await Promise.all([
    fetchRoster(game.home_team_id),
    fetchRoster(game.away_team_id),
  ]);

  const periodCount = (game as any).period_count ?? 3;
  const periodLengthMinutes = (game as any).period_length_minutes ?? 20;

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      <PrintBar leagueId={leagueId} gameId={gameId} locale={locale} />
      <PrintableGameSheet
        league={{
          name: league.name,
          logoUrl: league.logo_url,
        }}
        game={{
          scheduledAt: game.scheduled_at,
          location: game.location ?? null,
          periodCount,
          periodLengthMinutes,
        }}
        season={{
          name: (game.season as { name: string } | null)?.name ?? '',
        }}
        homeTeam={{
          name: game.home_team?.name ?? 'Home Team',
          roster: homeRoster,
        }}
        awayTeam={{
          name: game.away_team?.name ?? 'Away Team',
          roster: awayRoster,
        }}
      />
    </div>
  );
}
