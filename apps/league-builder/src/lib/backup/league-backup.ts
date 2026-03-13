import { createHash, randomBytes } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const LEAGUE_BACKUP_TOKEN_PREFIX = 'blhbk';

export interface LeagueBackupTokenRecord {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

export interface LeagueBackupExport {
  schemaVersion: string;
  exportedAt: string;
  league: Record<string, unknown>;
  organization: Record<string, unknown> | null;
  configuration: {
    seasons: Record<string, unknown>[];
    divisions: Record<string, unknown>[];
    venues: Record<string, unknown>[];
    venueAvailability: Record<string, unknown>[];
    venueBlackouts: Record<string, unknown>[];
    teamSchedulePreferences: Record<string, unknown>[];
  };
  teams: {
    teams: Record<string, unknown>[];
    rosters: Record<string, unknown>[];
    teamStaff: Record<string, unknown>[];
    teamReturns: Record<string, unknown>[];
  };
  people: {
    profiles: Record<string, unknown>[];
    leagueMemberships: Record<string, unknown>[];
    referees: Record<string, unknown>[];
    scorekeepers: Record<string, unknown>[];
  };
  scheduling: {
    games: Record<string, unknown>[];
    gameOfficials: Record<string, unknown>[];
  };
  finance: {
    seasonFees: Record<string, unknown>[];
    registrations: Record<string, unknown>[];
    teamInvoices: Record<string, unknown>[];
    teamInvoicePayments: Record<string, unknown>[];
  };
  stats: {
    playerStats: Record<string, unknown>[];
    goalieStats: Record<string, unknown>[];
    awards: Record<string, unknown>[];
    suspensions: Record<string, unknown>[];
  };
  content: {
    articles: Record<string, unknown>[];
    customPages: Record<string, unknown>[];
    galleryAlbums: Record<string, unknown>[];
    galleryPhotos: Record<string, unknown>[];
  };
  migration: {
    requests: Record<string, unknown>[];
  };
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function hashLeagueBackupToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createLeagueBackupTokenValue() {
  return `${LEAGUE_BACKUP_TOKEN_PREFIX}_${randomBytes(24).toString('hex')}`;
}

export async function verifyLeagueBackupToken(leagueId: string, token: string) {
  const serviceSupabase = createServiceRoleClient() as any;
  const tokenHash = hashLeagueBackupToken(token);

  const { data, error } = await serviceSupabase
    .from('league_backup_tokens')
    .select('id, league_id, label, expires_at, revoked_at')
    .eq('league_id', leagueId)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !data) {
    return { valid: false as const };
  }

  if (data.revoked_at) {
    return { valid: false as const };
  }

  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    return { valid: false as const };
  }

  await serviceSupabase
    .from('league_backup_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    valid: true as const,
    token: data as LeagueBackupTokenRecord & { league_id: string },
  };
}

export async function buildLeagueBackupExport(leagueId: string): Promise<LeagueBackupExport> {
  const serviceSupabase = createServiceRoleClient() as any;

  const { data: league } = await serviceSupabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (!league) {
    throw new Error('League not found');
  }

  const [
    { data: organization },
    { data: seasons },
    { data: divisions },
    { data: venues },
    { data: venueAvailability },
    { data: venueBlackouts },
    { data: teamSchedulePreferences },
    { data: teams },
    { data: rosters },
    { data: teamStaff },
    { data: teamReturns },
    { data: leagueMemberships },
    { data: referees },
    { data: scorekeepers },
    { data: games },
    { data: seasonFees },
    { data: registrations },
    { data: teamInvoices },
    { data: playerStats },
    { data: goalieStats },
    { data: awards },
    { data: suspensions },
    { data: articles },
    { data: customPages },
    { data: galleryAlbums },
    { data: migrationRequests },
  ] = await Promise.all([
    league.organization_id
      ? serviceSupabase.from('organizations').select('id, name, slug, created_at').eq('id', league.organization_id).maybeSingle()
      : Promise.resolve({ data: null }),
    serviceSupabase.from('seasons').select('*').eq('league_id', leagueId).order('start_date', { ascending: false }),
    serviceSupabase.from('divisions').select('*').eq('league_id', leagueId).order('display_order', { ascending: true }),
    serviceSupabase.from('venues').select('*').eq('league_id', leagueId).order('name', { ascending: true }),
    serviceSupabase.from('venue_availability').select('*').eq('league_id', leagueId),
    serviceSupabase.from('venue_blackout_dates').select('*').eq('league_id', leagueId),
    serviceSupabase.from('team_schedule_preferences').select('*').eq('league_id', leagueId),
    serviceSupabase.from('teams').select('*').eq('league_id', leagueId).order('name', { ascending: true }),
    serviceSupabase.from('team_rosters').select('*').eq('league_id', leagueId),
    serviceSupabase.from('team_staff').select('*').eq('league_id', leagueId),
    serviceSupabase.from('season_team_returns').select('*').eq('league_id', leagueId),
    serviceSupabase.from('league_memberships').select('*').eq('league_id', leagueId),
    (serviceSupabase.from as any)('league_referees').select('*').eq('league_id', leagueId),
    serviceSupabase.from('league_scorekeepers').select('*').eq('league_id', leagueId),
    serviceSupabase.from('games').select('*').eq('league_id', leagueId).order('date', { ascending: true }),
    serviceSupabase.from('season_fees').select('*').eq('league_id', leagueId),
    serviceSupabase.from('registration_submissions').select('*').eq('league_id', leagueId),
    serviceSupabase.from('team_invoices').select('*').eq('league_id', leagueId),
    serviceSupabase.from('player_stats').select('*').eq('league_id', leagueId),
    serviceSupabase.from('goalie_stats').select('*').eq('league_id', leagueId),
    (serviceSupabase.from as any)('league_awards').select('*').eq('league_id', leagueId),
    serviceSupabase.from('suspensions').select('*').eq('league_id', leagueId),
    (serviceSupabase.from('articles') as any).select('*').eq('league_id', leagueId).order('created_at', { ascending: false }),
    serviceSupabase.from('custom_pages').select('*').eq('league_id', leagueId).order('sort_order', { ascending: true }),
    (serviceSupabase.from('league_gallery') as any).select('*').eq('league_id', leagueId).order('created_at', { ascending: false }),
    serviceSupabase.from('league_migration_requests').select('*').eq('league_id', leagueId).order('created_at', { ascending: false }),
  ]);

  const invoiceIds = uniqueIds((teamInvoices ?? []).map((row: any) => row.id));
  const gameIds = uniqueIds((games ?? []).map((row: any) => row.id));
  const { data: teamInvoicePayments } =
    invoiceIds.length > 0
      ? await (serviceSupabase.from as any)('team_invoice_payments')
          .select('*')
          .in('team_invoice_id', invoiceIds)
      : { data: [] };
  const { data: gameOfficials } =
    gameIds.length > 0
      ? await serviceSupabase
          .from('game_officials')
          .select('*')
          .in('game_id', gameIds)
      : { data: [] };

  const albumIds = uniqueIds((galleryAlbums ?? []).map((album: any) => album.id));
  const { data: galleryPhotos } =
    albumIds.length > 0
      ? await (serviceSupabase.from('gallery_photos') as any)
          .select('*')
          .in('gallery_id', albumIds)
      : { data: [] };

  const profileIds = uniqueIds([
    league.owner_id,
    league.created_by,
    ...(leagueMemberships ?? []).map((membership: any) => membership.user_id),
    ...(rosters ?? []).map((row: any) => row.player_id),
    ...(teamStaff ?? []).map((row: any) => row.user_id),
    ...(registrations ?? []).map((row: any) => row.player_id),
    ...(referees ?? []).map((row: any) => row.user_id),
    ...(scorekeepers ?? []).map((row: any) => row.scorekeeper_id),
    ...(migrationRequests ?? []).map((row: any) => row.requested_by),
  ]);

  const { data: profiles } =
    profileIds.length > 0
      ? await serviceSupabase
          .from('profiles')
          .select('id, full_name, email, phone, city, province, avatar_url, created_at')
          .in('id', profileIds)
      : { data: [] };

  return {
    schemaVersion: 'blh-league-backup-v1',
    exportedAt: new Date().toISOString(),
    league,
    organization: organization ?? null,
    configuration: {
      seasons: seasons ?? [],
      divisions: divisions ?? [],
      venues: venues ?? [],
      venueAvailability: venueAvailability ?? [],
      venueBlackouts: venueBlackouts ?? [],
      teamSchedulePreferences: teamSchedulePreferences ?? [],
    },
    teams: {
      teams: teams ?? [],
      rosters: rosters ?? [],
      teamStaff: teamStaff ?? [],
      teamReturns: teamReturns ?? [],
    },
    people: {
      profiles: profiles ?? [],
      leagueMemberships: leagueMemberships ?? [],
      referees: referees ?? [],
      scorekeepers: scorekeepers ?? [],
    },
    scheduling: {
      games: games ?? [],
      gameOfficials: gameOfficials ?? [],
    },
    finance: {
      seasonFees: seasonFees ?? [],
      registrations: registrations ?? [],
      teamInvoices: teamInvoices ?? [],
      teamInvoicePayments: teamInvoicePayments ?? [],
    },
    stats: {
      playerStats: playerStats ?? [],
      goalieStats: goalieStats ?? [],
      awards: awards ?? [],
      suspensions: suspensions ?? [],
    },
    content: {
      articles: articles ?? [],
      customPages: customPages ?? [],
      galleryAlbums: galleryAlbums ?? [],
      galleryPhotos: galleryPhotos ?? [],
    },
    migration: {
      requests: migrationRequests ?? [],
    },
  };
}
