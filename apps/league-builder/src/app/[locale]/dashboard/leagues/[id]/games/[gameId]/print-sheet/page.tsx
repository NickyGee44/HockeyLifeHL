import { notFound, redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getGame } from '@/lib/actions/games';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { PrintBar } from '@/components/games/PrintBar';
import { PrintableGameSheet, type RosterPlayer } from '@/components/games/PrintableGameSheet';
import { randomBytes } from 'crypto';

type Props = {
  params: Promise<{ locale: string; id: string; gameId: string }>;
};

export const metadata = {
  title: 'Print Game Sheet',
};

function generateScorekeeperToken(): string {
  const bytes = randomBytes(24);
  const token = bytes
    .toString('base64')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .substring(0, 16);

  if (token.length < 16) return generateScorekeeperToken();
  return token;
}

export default async function PrintSheetPage({ params }: Props) {
  const { locale, id: leagueId, gameId } = await params;
  setRequestLocale(locale);

  // Auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  // Authorization
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, logo_url, slug, custom_domain, custom_domain_verified, created_by')
    .eq('id', leagueId)
    .single();

  if (!league) notFound();

  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    redirect(`/${locale}/dashboard?error=unauthorized`);
  }

  // Game data
  const gameResult = await getGame(gameId);
  if (!gameResult.success || !gameResult.data) notFound();
  const game = gameResult.data;
  if (game.league_id !== leagueId) notFound();

  const seasonId = (game.season as { id: string } | null)?.id;
  const serviceClient = createServiceRoleClient();

  // Fetch rosters + scorekeeper token in parallel
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

  const getOrCreateScorekeeperToken = async (): Promise<string | null> => {
    const nowIso = new Date().toISOString();
    const { data: existing } = await (serviceClient as any)
      .from('scorekeeper_sessions')
      .select('token')
      .eq('game_id', gameId)
      .eq('is_active', true)
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.token) {
      return existing.token as string;
    }

    let token = generateScorekeeperToken();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const { data: tokenExists } = await (serviceClient as any)
        .from('scorekeeper_sessions')
        .select('id')
        .eq('token', token)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!tokenExists) break;
      token = generateScorekeeperToken();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error('Failed to generate unique scorekeeper token for print sheet');
      return null;
    }

    const now = new Date();
    const minimumExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const gameTime = new Date(game.scheduled_at);
    const gameBasedExpiry = new Date(gameTime.getTime() + 48 * 60 * 60 * 1000);
    const expiresAt = gameBasedExpiry > minimumExpiry ? gameBasedExpiry : minimumExpiry;

    const { error: insertError } = await (serviceClient as any)
      .from('scorekeeper_sessions')
      .insert({
        game_id: gameId,
        league_id: leagueId,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        session_type: 'single',
        is_active: true,
      });

    if (insertError) {
      console.error('Failed to create scorekeeper token for print sheet', insertError);
      return null;
    }

    return token;
  };

  const [homeRoster, awayRoster, skToken] = await Promise.all([
    fetchRoster(game.home_team_id),
    fetchRoster(game.away_team_id),
    getOrCreateScorekeeperToken(),
  ]);

  // Build scorekeeper URL for the QR code.
  // League sites run as subdomains: {slug}.beerleaguehockey.ca
  // If the league has a verified custom domain that takes precedence.
  const leagueSlug = (league as any).slug as string;
  const baseDomain = process.env.NEXT_PUBLIC_SITES_BASE_DOMAIN ?? 'beerleaguehockey.ca';
  const customDomain = (league as any).custom_domain_verified
    ? ((league as any).custom_domain as string | null)
    : null;
  const leagueSiteOrigin = customDomain
    ? `https://${customDomain}`
    : `https://${leagueSlug}.${baseDomain}`;

  // QR code URL — scorekeeper token lands them directly into the game
  const qrCodeUrl = skToken
    ? `${leagueSiteOrigin}/scorekeeper?token=${skToken}`
    : null;

  const periodCount = (game as any).period_count ?? 3;
  const periodLengthMinutes = (game as any).period_length_minutes ?? 20;

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      <PrintBar leagueId={leagueId} gameId={gameId} locale={locale} />
      <PrintableGameSheet
        league={{ name: (league as any).name, logoUrl: (league as any).logo_url }}
        game={{
          scheduledAt: game.scheduled_at,
          location: game.location ?? null,
          periodCount,
          periodLengthMinutes,
        }}
        season={{ name: (game.season as { name: string } | null)?.name ?? '' }}
        homeTeam={{ name: game.home_team?.name ?? 'Home Team', roster: homeRoster }}
        awayTeam={{ name: game.away_team?.name ?? 'Away Team', roster: awayRoster }}
        qrCodeUrl={qrCodeUrl}
      />
    </div>
  );
}
