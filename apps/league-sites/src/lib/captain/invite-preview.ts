import { createServiceRoleClient } from '@/lib/supabase/server';

export interface CaptainInvitePreview {
  inviteId: string;
  leagueSlug: string | null;
  leagueName: string;
  teamName: string;
  inviteeName: string;
  registrationUrl: string;
  sharePhone: string | null;
  shareTitle: string;
  shareText: string;
  branding: {
    name: string;
    logoUrl: string | null;
    kind: 'team' | 'league';
    subtitle: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

const DEFAULT_PRIMARY = '#153A6B';
const DEFAULT_SECONDARY = '#081A33';
const DEFAULT_ACCENT = '#D4AF66';
const PLATFORM_BRAND_NAME = 'Beer League Hockey';

function resolveBaseUrl(league: any) {
  if (league?.custom_domain && league?.custom_domain_verified) {
    return /^https?:\/\//i.test(league.custom_domain)
      ? league.custom_domain
      : `https://${league.custom_domain}`;
  }

  if (league?.subdomain) {
    return `https://${league.subdomain}.beerleaguehockey.ca`;
  }

  if (league?.slug) {
    return `https://${league.slug}.beerleaguehockey.ca`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'https://beerleaguehockey.ca';
}

function buildBranding(invite: any, team: any, league: any) {
  const isLeagueScoped = invite.brand_scope === 'league';
  const primaryColor = league?.primary_color || DEFAULT_PRIMARY;
  const secondaryColor = league?.secondary_color || DEFAULT_SECONDARY;
  const accentColor = league?.accent_color || DEFAULT_ACCENT;

  if (isLeagueScoped) {
    return {
      name: PLATFORM_BRAND_NAME,
      logoUrl: null,
      kind: 'league' as const,
      subtitle: `${league?.name || 'League'} spare player pool`,
      primaryColor,
      secondaryColor,
      accentColor,
    };
  }

  return {
    name: team?.name || 'Team',
    logoUrl: team?.logo_url || league?.logo_url || null,
    kind: 'team' as const,
    subtitle: `${league?.name || 'League'} team invite`,
    primaryColor,
    secondaryColor,
    accentColor,
  };
}

export async function getPublicCaptainInvitePreview(inviteId: string): Promise<CaptainInvitePreview | null> {
  const serviceSupabase = createServiceRoleClient();
  const { data: invite } = await (serviceSupabase as any)
    .from('captain_player_invites')
    .select(`
      id,
      share_phone,
      invitee_name,
      registration_path,
      brand_scope,
      player_type,
      position,
      teams (name, logo_url),
      leagues (
        name,
        logo_url,
        slug,
        subdomain,
        custom_domain,
        custom_domain_verified,
        primary_color,
        secondary_color,
        accent_color
      )
    `)
    .eq('id', inviteId)
    .maybeSingle();

  if (!invite) {
    return null;
  }

  const team = Array.isArray(invite.teams) ? invite.teams[0] : invite.teams;
  const league = Array.isArray(invite.leagues) ? invite.leagues[0] : invite.leagues;
  const baseUrl = resolveBaseUrl(league);
  const registrationPath = invite.registration_path || `/${league?.slug || ''}/register?captainInvite=${invite.id}`;
  const registrationUrl = `${String(baseUrl).replace(/\/$/, '')}${registrationPath.startsWith('/') ? registrationPath : `/${registrationPath}`}`;
  const inviteeName = invite.invitee_name || 'there';
  const branding = buildBranding(invite, team, league);
  const leagueName = league?.name || 'League';
  const teamName = team?.name || 'Team';

  const shareTitle = branding.kind === 'league'
    ? `${leagueName} spare player invite`
    : `${teamName} player invite`;

  const shareText = branding.kind === 'league'
    ? `Hi ${inviteeName}, you've been invited to join the ${leagueName} spare player pool on Beer League Hockey. Finish your registration to get started.`
    : `Hi ${inviteeName}, welcome to ${teamName}! Finish your Beer League Hockey registration to get started.`;

  return {
    inviteId,
    leagueSlug: league?.slug || null,
    leagueName,
    teamName,
    inviteeName,
    registrationUrl,
    sharePhone: invite.share_phone || null,
    shareTitle,
    shareText,
    branding,
  } satisfies CaptainInvitePreview;
}
