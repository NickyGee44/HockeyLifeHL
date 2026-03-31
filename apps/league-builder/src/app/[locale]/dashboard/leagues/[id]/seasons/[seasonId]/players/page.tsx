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

type SeasonPaymentRow = {
  id: string;
  player_id: string | null;
  team_id: string | null;
  amount_cents: number | null;
  amount_paid_cents: number | null;
  status: string | null;
  payment_method: string | null;
  season_fee?: {
    name?: string | null;
  } | null;
};

type ApprovedRegistrationRow = {
  player_id: string | null;
  team_id: string | null;
  assigned_team_id: string | null;
  preferred_position: string | null;
  preferred_jersey_number: number | null;
};

export default async function SeasonPlayersPage({ params, searchParams: _searchParams }: Props) {
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

  // Approved registrations should also appear here even before a player is rostered.
  const { data: registrations } = await serviceClient
    .from('registration_submissions')
    .select(
      'player_id, team_id, assigned_team_id, preferred_position, preferred_jersey_number, status, submitted_at'
    )
    .eq('league_id', leagueId)
    .eq('season_id', seasonId)
    .eq('status', 'approved')
    .not('submitted_at', 'is', null);

  const paymentRows = (payments ?? []) as SeasonPaymentRow[];
  const registrationRows = (registrations ?? []) as ApprovedRegistrationRow[];

  // Get teams for this league (for team assignment)
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_name')
    .eq('league_id', leagueId)
    .order('name');

  const teamById = new Map(
    (teams ?? []).map((team) => [
      team.id,
      { name: team.name, short_name: team.short_name },
    ])
  );

  const registrationPlayerIds = Array.from(
    new Set(
      (registrations ?? [])
        .map((registration) => registration.player_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )
  );

  const { data: registrationProfiles } = registrationPlayerIds.length
    ? await serviceClient
        .from('profiles')
        .select('id, full_name, email, avatar_url, phone')
        .in('id', registrationPlayerIds)
    : { data: [] };

  const registrationProfileById = new Map(
    (registrationProfiles ?? []).map((profile) => [profile.id, profile])
  );

  // Index payments by player_id for quick lookup
  const paymentsByPlayer = new Map<string, SeasonPaymentRow>();
  for (const p of paymentRows) {
    if (p.player_id) paymentsByPlayer.set(p.player_id, p);
  }

  // Build unique player list from roster entries (primary) + any payment-only players
  const playerMap = new Map<string, any>();

  // 1. Approved registrations (including imported previous-season players)
  for (const registration of registrationRows) {
    if (!registration.player_id || playerMap.has(registration.player_id)) continue;
    const profile = registrationProfileById.get(registration.player_id);
    if (!profile) continue;
    const payment = paymentsByPlayer.get(registration.player_id);
    const teamId = registration.assigned_team_id || registration.team_id || null;
    const team = teamId ? teamById.get(teamId) : null;

    playerMap.set(registration.player_id, {
      id: profile.id,
      fullName: profile.full_name || 'Unknown',
      email: profile.email || '',
      phone: profile.phone || '',
      avatarUrl: profile.avatar_url || null,
      teamId,
      teamName: team?.name || 'Unassigned',
      teamShortName: team?.short_name || '',
      jerseyNumber: registration.preferred_jersey_number,
      position: registration.preferred_position,
      rosterStatus: null,
      paymentStatus: payment?.status || 'none',
      amountCents: payment?.amount_cents || 0,
      amountPaidCents: payment?.amount_paid_cents || 0,
      paymentMethod: payment?.payment_method || null,
      feeName: payment?.season_fee?.name || '',
      paymentId: payment?.id || null,
    });
  }

  // 2. Players from team_rosters
  for (const entry of rosterEntries ?? []) {
    if (!entry.player?.id) continue;
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

  // 3. Players with payments but not on a roster or approved registration
  const paymentOnlyPlayerIds: string[] = Array.from(
    new Set(
      paymentRows
        .map((payment: SeasonPaymentRow) => payment.player_id)
        .filter(
          (playerId: string | null): playerId is string =>
            typeof playerId === 'string' && playerId.length > 0 && !playerMap.has(playerId)
        )
    )
  );

  const { data: paymentOnlyProfiles } = paymentOnlyPlayerIds.length
    ? await serviceClient
        .from('profiles')
        .select('id, full_name, email, avatar_url, phone')
        .in('id', paymentOnlyPlayerIds)
    : { data: [] };

  const paymentOnlyProfileById = new Map(
    (paymentOnlyProfiles ?? []).map((profile) => [profile.id, profile])
  );

  for (const payment of paymentRows) {
    if (!payment.player_id || playerMap.has(payment.player_id)) continue;
    const profile = paymentOnlyProfileById.get(payment.player_id);
    if (!profile) continue;
    const team = payment.team_id ? teamById.get(payment.team_id) : null;

    playerMap.set(payment.player_id, {
      id: profile.id,
      fullName: profile.full_name || 'Unknown',
      email: profile.email || '',
      phone: profile.phone || '',
      avatarUrl: profile.avatar_url || null,
      teamId: payment.team_id || null,
      teamName: team?.name || 'Unassigned',
      teamShortName: team?.short_name || '',
      jerseyNumber: null,
      position: null,
      rosterStatus: null,
      paymentStatus: payment.status,
      amountCents: payment.amount_cents,
      amountPaidCents: payment.amount_paid_cents,
      paymentMethod: payment.payment_method,
      feeName: payment.season_fee?.name || '',
      paymentId: payment.id,
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
