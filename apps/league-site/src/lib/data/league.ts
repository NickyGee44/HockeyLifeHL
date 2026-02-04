import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { LeagueBranding, Team, TeamStanding, Game, PlayerStats, Season } from '@/lib/types';

// Cache league branding for the entire request
export const getLeagueBySubdomain = cache(async (subdomain: string): Promise<LeagueBranding | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      slug,
      subdomain,
      custom_domain,
      custom_domain_verified,
      tagline,
      description,
      logo_url,
      banner_url,
      favicon_url,
      primary_color,
      secondary_color,
      accent_color,
      font_family,
      custom_css,
      contact_email,
      contact_phone,
      city,
      state_province,
      country,
      address,
      is_public
    `)
    .eq('subdomain', subdomain)
    .eq('is_public', true)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    subdomain: data.subdomain,
    customDomain: data.custom_domain,
    customDomainVerified: data.custom_domain_verified ?? false,
    tagline: data.tagline,
    description: data.description,
    logoUrl: data.logo_url,
    bannerUrl: data.banner_url,
    faviconUrl: data.favicon_url,
    primaryColor: data.primary_color ?? '#D4AF37',
    secondaryColor: data.secondary_color ?? '#0a0a0a',
    accentColor: data.accent_color,
    fontFamily: data.font_family,
    customCss: data.custom_css,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    city: data.city,
    stateProvince: data.state_province,
    country: data.country,
    address: data.address,
    isPublic: data.is_public ?? false,
  };
});

export const getLeagueBySlug = cache(async (slug: string): Promise<LeagueBranding | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leagues')
    .select(`
      id,
      name,
      slug,
      subdomain,
      custom_domain,
      custom_domain_verified,
      tagline,
      description,
      logo_url,
      banner_url,
      favicon_url,
      primary_color,
      secondary_color,
      accent_color,
      font_family,
      custom_css,
      contact_email,
      contact_phone,
      city,
      state_province,
      country,
      address,
      is_public
    `)
    .eq('slug', slug)
    .eq('is_public', true)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    subdomain: data.subdomain,
    customDomain: data.custom_domain,
    customDomainVerified: data.custom_domain_verified ?? false,
    tagline: data.tagline,
    description: data.description,
    logoUrl: data.logo_url,
    bannerUrl: data.banner_url,
    faviconUrl: data.favicon_url,
    primaryColor: data.primary_color ?? '#D4AF37',
    secondaryColor: data.secondary_color ?? '#0a0a0a',
    accentColor: data.accent_color,
    fontFamily: data.font_family,
    customCss: data.custom_css,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    city: data.city,
    stateProvince: data.state_province,
    country: data.country,
    address: data.address,
    isPublic: data.is_public ?? false,
  };
});

export const getActiveSeasons = cache(async (leagueId: string): Promise<Season[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('seasons')
    .select('id, name, status, start_date, end_date, league_id')
    .eq('league_id', leagueId)
    .in('status', ['active', 'completed'])
    .order('start_date', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(s => ({
    id: s.id,
    name: s.name,
    status: s.status as Season['status'],
    startDate: s.start_date,
    endDate: s.end_date,
    leagueId: s.league_id,
  }));
});

export const getCurrentSeason = cache(async (leagueId: string): Promise<Season | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('seasons')
    .select('id, name, status, start_date, end_date, league_id')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // Try to get the most recent completed season
    const { data: completedData } = await supabase
      .from('seasons')
      .select('id, name, status, start_date, end_date, league_id')
      .eq('league_id', leagueId)
      .eq('status', 'completed')
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (!completedData) return null;

    return {
      id: completedData.id,
      name: completedData.name,
      status: completedData.status as Season['status'],
      startDate: completedData.start_date,
      endDate: completedData.end_date,
      leagueId: completedData.league_id,
    };
  }

  return {
    id: data.id,
    name: data.name,
    status: data.status as Season['status'],
    startDate: data.start_date,
    endDate: data.end_date,
    leagueId: data.league_id,
  };
});

export const getTeams = cache(async (leagueId: string): Promise<Team[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('teams')
    .select('id, name, short_name, logo_url, primary_color, secondary_color')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .order('name');

  if (error || !data) {
    return [];
  }

  return data.map(t => ({
    id: t.id,
    name: t.name,
    shortName: t.short_name,
    logoUrl: t.logo_url,
    primaryColor: t.primary_color,
    secondaryColor: t.secondary_color,
  }));
});

export const getStandings = cache(async (seasonId: string): Promise<TeamStanding[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('team_standings')
    .select('*')
    .eq('season_id', seasonId)
    .order('points', { ascending: false })
    .order('wins', { ascending: false })
    .order('goals_for', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(s => ({
    teamId: s.team_id!,
    name: s.name!,
    shortName: s.short_name!,
    logoUrl: s.logo_url,
    primaryColor: s.primary_color,
    secondaryColor: s.secondary_color,
    seasonId: s.season_id!,
    gamesPlayed: Number(s.games_played) || 0,
    wins: Number(s.wins) || 0,
    losses: Number(s.losses) || 0,
    ties: Number(s.ties) || 0,
    points: Number(s.points) || 0,
    goalsFor: Number(s.goals_for) || 0,
    goalsAgainst: Number(s.goals_against) || 0,
  }));
});

export const getUpcomingGames = cache(async (leagueId: string, limit = 10): Promise<Game[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select(`
      id,
      season_id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      status,
      scheduled_at,
      location,
      home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color)
    `)
    .eq('league_id', leagueId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(g => ({
    id: g.id,
    seasonId: g.season_id,
    homeTeamId: g.home_team_id,
    awayTeamId: g.away_team_id,
    homeScore: g.home_score,
    awayScore: g.away_score,
    status: g.status as Game['status'],
    scheduledAt: g.scheduled_at,
    location: g.location,
    homeTeam: g.home_team ? {
      id: (g.home_team as any).id,
      name: (g.home_team as any).name,
      shortName: (g.home_team as any).short_name,
      logoUrl: (g.home_team as any).logo_url,
      primaryColor: (g.home_team as any).primary_color,
      secondaryColor: (g.home_team as any).secondary_color,
    } : undefined,
    awayTeam: g.away_team ? {
      id: (g.away_team as any).id,
      name: (g.away_team as any).name,
      shortName: (g.away_team as any).short_name,
      logoUrl: (g.away_team as any).logo_url,
      primaryColor: (g.away_team as any).primary_color,
      secondaryColor: (g.away_team as any).secondary_color,
    } : undefined,
  }));
});

export const getRecentGames = cache(async (leagueId: string, limit = 10): Promise<Game[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select(`
      id,
      season_id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      status,
      scheduled_at,
      location,
      home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color)
    `)
    .eq('league_id', leagueId)
    .eq('status', 'completed')
    .order('scheduled_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(g => ({
    id: g.id,
    seasonId: g.season_id,
    homeTeamId: g.home_team_id,
    awayTeamId: g.away_team_id,
    homeScore: g.home_score,
    awayScore: g.away_score,
    status: g.status as Game['status'],
    scheduledAt: g.scheduled_at,
    location: g.location,
    homeTeam: g.home_team ? {
      id: (g.home_team as any).id,
      name: (g.home_team as any).name,
      shortName: (g.home_team as any).short_name,
      logoUrl: (g.home_team as any).logo_url,
      primaryColor: (g.home_team as any).primary_color,
      secondaryColor: (g.home_team as any).secondary_color,
    } : undefined,
    awayTeam: g.away_team ? {
      id: (g.away_team as any).id,
      name: (g.away_team as any).name,
      shortName: (g.away_team as any).short_name,
      logoUrl: (g.away_team as any).logo_url,
      primaryColor: (g.away_team as any).primary_color,
      secondaryColor: (g.away_team as any).secondary_color,
    } : undefined,
  }));
});

export const getAllGames = cache(async (seasonId: string): Promise<Game[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('games')
    .select(`
      id,
      season_id,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      status,
      scheduled_at,
      location,
      home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url, primary_color, secondary_color)
    `)
    .eq('season_id', seasonId)
    .neq('status', 'cancelled')
    .order('scheduled_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map(g => ({
    id: g.id,
    seasonId: g.season_id,
    homeTeamId: g.home_team_id,
    awayTeamId: g.away_team_id,
    homeScore: g.home_score,
    awayScore: g.away_score,
    status: g.status as Game['status'],
    scheduledAt: g.scheduled_at,
    location: g.location,
    homeTeam: g.home_team ? {
      id: (g.home_team as any).id,
      name: (g.home_team as any).name,
      shortName: (g.home_team as any).short_name,
      logoUrl: (g.home_team as any).logo_url,
      primaryColor: (g.home_team as any).primary_color,
      secondaryColor: (g.home_team as any).secondary_color,
    } : undefined,
    awayTeam: g.away_team ? {
      id: (g.away_team as any).id,
      name: (g.away_team as any).name,
      shortName: (g.away_team as any).short_name,
      logoUrl: (g.away_team as any).logo_url,
      primaryColor: (g.away_team as any).primary_color,
      secondaryColor: (g.away_team as any).secondary_color,
    } : undefined,
  }));
});

export const getStatsLeaders = cache(async (seasonId: string, limit = 20): Promise<PlayerStats[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('player_season_stats')
    .select('*')
    .eq('season_id', seasonId)
    .order('points', { ascending: false })
    .order('goals', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(s => ({
    playerId: s.player_id!,
    seasonId: s.season_id!,
    fullName: s.full_name!,
    jerseyNumber: s.jersey_number,
    position: s.position,
    teamName: s.team_name!,
    teamShortName: s.team_short_name!,
    teamColor: s.team_color,
    gamesPlayed: Number(s.games_played) || 0,
    goals: Number(s.goals) || 0,
    assists: Number(s.assists) || 0,
    points: Number(s.points) || 0,
    pointsPerGame: Number(s.points_per_game) || 0,
  }));
});

// For generateStaticParams - get top leagues by activity
// This uses the static client (no cookies) for build-time generation
export async function getTopLeagues(limit = 100): Promise<{ slug: string }[]> {
  // Import dynamically to avoid issues during SSR
  const { createStaticClient } = await import('@/lib/supabase/static');
  const supabase = createStaticClient();

  const { data, error } = await supabase
    .from('leagues')
    .select('slug')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(l => ({ slug: l.slug }));
}
