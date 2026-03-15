/**
 * Season Players Management Page
 *
 * Central hub for league owners to view all players in a season,
 * search, filter, and take actions like:
 * - Assign/switch teams
 * - Manage payment status
 * - View player profiles
 * - Email players
 */
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { requireLeagueDashboardAccess } from '@/lib/auth/league-dashboard-access';
import { SeasonPlayersClient } from './SeasonPlayersClient';

type Props = {
  params: Promise<{ locale: string; id: string; seasonId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SeasonPlayersPage({ params, searchParams }: Props) {
  const { locale, id: leagueId, seasonId } = await params;
  setRequestLocale(locale);

  await requireLeagueDashboardAccess({ leagueId, locale });

  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  // Fetch season and league details
  const [{ data: league }, { data: season }] = await Promise.all([
    supabase.from('leagues').select('id, name').eq('id', leagueId).maybeSingle(),
    supabase.from('seasons').select('id, name, status').eq('id', seasonId).maybeSingle(),
  ]);

  if (!league || !season) {
    notFound();
  }

  // Get all players in this season with their team, registration, and payment info
  const { data: registrations } = await (serviceClient as any)
    .from('player_payments')
    .select(`
      id,
      player_id,
      team_id,
      season_id,
      amount_cents,
      amount_paid_cents,
      status,
      payment_method,
      player:player_id(id, full_name, email, avatar_url, phone),
      team:team_id(id, name, short_name),
      season_fee:season_fee_id(id, name, amount_cents)
    `)
    .eq('season_id', seasonId)
    .order('created_at', { ascending: false });

  // Get teams for this league (for team assignment)
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name')
    .eq('league_id', leagueId)
    .order('name');

  // Build unique player list from registrations
  const playerMap = new Map<string, any>();
  for (const reg of registrations ?? []) {
    if (!reg.player?.id) continue;
    const existing = playerMap.get(reg.player.id);
    if (!existing) {
      playerMap.set(reg.player.id, {
        id: reg.player.id,
        fullName: reg.player.full_name || 'Unknown',
        email: reg.player.email || '',
        phone: reg.player.phone || '',
        avatarUrl: reg.player.avatar_url || null,
        teamId: reg.team_id,
        teamName: reg.team?.name || 'Unassigned',
        teamShortName: reg.team?.short_name || '',
        paymentStatus: reg.status,
        amountCents: reg.amount_cents,
        amountPaidCents: reg.amount_paid_cents,
        paymentMethod: reg.payment_method,
        feeName: reg.season_fee?.name || '',
        paymentId: reg.id,
      });
    }
  }

  const players = Array.from(playerMap.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  );

  return (
    <SeasonPlayersClient
      locale={locale}
      leagueId={leagueId}
      seasonId={seasonId}
      leagueName={league.name}
      seasonName={season.name}
      players={players}
      teams={(teams ?? []).map((t) => ({ id: t.id, name: t.name, shortName: t.short_name }))}
    />
  );
}
