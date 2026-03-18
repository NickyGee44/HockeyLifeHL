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

  // Get all players from team_rosters for this season (primary source of truth)
  const { data: rosterEntries } = await (serviceClient as any)
    .from('team_rosters')
    .select(`
      id,
      player_id,
      team_id,
      season_id,
      jersey_number,
      position,
      leadership_role,
      status,
      joined_at,
      player:player_id(id, full_name, email, avatar_url, phone),
      team:team_id(id, name, short_name)
    `)
    .eq('season_id', seasonId)
    .eq('league_id', leagueId)
    .order('joined_at', { ascending: false });

  // Also get payment info for these players
  const { data: payments } = await (serviceClient as any)
    .from('player_payments')
    .select(`
      id,
      player_id,
      team_id,
      amount_cents,
      amount_paid_cents,
      status,
      payment_method,
      season_fee:season_fee_id(id, name, amount_cents)
    `)
    .eq('season_id', seasonId)
    .eq('league_id', leagueId);

  // Get teams for this league (for team assignment)
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name')
    .eq('league_id', leagueId)
    .order('name');

  // Index payments by player_id for quick lookup
  const paymentsByPlayer = new Map<string, any>();
  for (const p of payments ?? []) {
    if (p.player_id) paymentsByPlayer.set(p.player_id, p);
  }

  // Build unique player list from roster entries (primary) + any payment-only players
  const playerMap = new Map<string, any>();

  // 1. Players from team_rosters
  for (const entry of rosterEntries ?? []) {
    if (!entry.player?.id) continue;
    if (playerMap.has(entry.player.id)) continue;
    const payment = paymentsByPlayer.get(entry.player.id);
    playerMap.set(entry.player.id, {
      id: entry.player.id,
      fullName: entry.player.full_name || 'Unknown',
      email: entry.player.email || '',
      phone: entry.player.phone || '',
      avatarUrl: entry.player.avatar_url || null,
      teamId: entry.team_id,
      teamName: entry.team?.name || 'Unassigned',
      teamShortName: entry.team?.short_name || '',
      jerseyNumber: entry.jersey_number,
      position: entry.position,
      rosterStatus: entry.status,
      paymentStatus: payment?.status || 'none',
      amountCents: payment?.amount_cents || 0,
      amountPaidCents: payment?.amount_paid_cents || 0,
      paymentMethod: payment?.payment_method || null,
      feeName: payment?.season_fee?.name || '',
      paymentId: payment?.id || null,
    });
  }

  // 2. Players with payments but not on a roster (e.g. registered but unassigned)
  for (const p of payments ?? []) {
    if (!p.player_id || playerMap.has(p.player_id)) continue;
    // Need to fetch player info separately for payment-only entries
    const { data: playerData } = await (serviceClient as any)
      .from('users')
      .select('id, full_name, email, avatar_url, phone')
      .eq('id', p.player_id)
      .maybeSingle();
    if (!playerData) continue;
    playerMap.set(p.player_id, {
      id: playerData.id,
      fullName: playerData.full_name || 'Unknown',
      email: playerData.email || '',
      phone: playerData.phone || '',
      avatarUrl: playerData.avatar_url || null,
      teamId: p.team_id || null,
      teamName: 'Unassigned',
      teamShortName: '',
      jerseyNumber: null,
      position: null,
      rosterStatus: null,
      paymentStatus: p.status,
      amountCents: p.amount_cents,
      amountPaidCents: p.amount_paid_cents,
      paymentMethod: p.payment_method,
      feeName: p.season_fee?.name || '',
      paymentId: p.id,
    });
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
