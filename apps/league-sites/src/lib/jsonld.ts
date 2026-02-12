import type { League, Team, ScheduleGame } from './types';

/**
 * JSON-LD Structured Data Helpers for SEO
 *
 * Generates schema.org structured data for league site pages.
 * Reference: https://schema.org/
 */

/**
 * Build the canonical URL for a league.
 */
function getLeagueUrl(league: League, path = ''): string {
  const base = league.website_url
    ? league.website_url
    : `https://${league.slug}.beerleaguehockey.ca`;
  return `${base}${path}`;
}

/**
 * SportsOrganization schema for the league homepage.
 */
export function buildSportsOrganizationJsonLd(league: League) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: league.name,
    sport: 'Ice Hockey',
    url: getLeagueUrl(league),
  };

  if (league.description) {
    jsonLd.description = league.description;
  }

  if (league.logo_url) {
    jsonLd.logo = league.logo_url;
  }

  if (league.contact_email) {
    jsonLd.email = league.contact_email;
  }

  if (league.contact_phone) {
    jsonLd.telephone = league.contact_phone;
  }

  if (league.address || league.city) {
    const address: Record<string, string> = {
      '@type': 'PostalAddress',
    };
    if (league.address) address.streetAddress = league.address;
    if (league.city) address.addressLocality = league.city;
    if (league.state) address.addressRegion = league.state;
    if (league.zip_code) address.postalCode = league.zip_code;
    jsonLd.address = address;
  }

  return jsonLd;
}

/**
 * SportsEvent schema for a single scheduled game.
 */
export function buildSportsEventJsonLd(
  game: ScheduleGame,
  league: League,
  leagueSlug: string
) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${game.home_team?.name ?? 'TBD'} vs ${game.away_team?.name ?? 'TBD'}`,
    startDate: game.scheduled_at,
    url: getLeagueUrl(league, `/${leagueSlug}/games/${game.id}`),
    sport: 'Ice Hockey',
    homeTeam: {
      '@type': 'SportsTeam',
      name: game.home_team?.name ?? 'TBD',
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: game.away_team?.name ?? 'TBD',
    },
  };

  if (game.venue) {
    jsonLd.location = {
      '@type': 'Place',
      name: game.venue,
    };
  }

  if (game.status === 'completed' && game.home_score !== null && game.away_score !== null) {
    jsonLd.eventStatus = 'https://schema.org/EventScheduled';
  }

  return jsonLd;
}

/**
 * Array of SportsEvent schemas for a list of games.
 * Wraps them in an ItemList for clean output.
 */
export function buildScheduleJsonLd(
  games: ScheduleGame[],
  league: League,
  leagueSlug: string
) {
  // Limit to first 20 games to keep the JSON-LD payload reasonable
  const limitedGames = games.slice(0, 20);

  return limitedGames.map((game) =>
    buildSportsEventJsonLd(game, league, leagueSlug)
  );
}

/**
 * SportsTeam schema for a single team.
 */
export function buildSportsTeamJsonLd(
  team: Team,
  league: League,
  leagueSlug: string
) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    sport: 'Ice Hockey',
    url: getLeagueUrl(league, `/${leagueSlug}/teams/${team.slug}`),
    memberOf: {
      '@type': 'SportsOrganization',
      name: league.name,
    },
  };

  const logoSrc = team.logo_url || team.logo;
  if (logoSrc) {
    jsonLd.logo = logoSrc;
  }

  return jsonLd;
}

/**
 * Array of SportsTeam schemas for all teams in a league.
 */
export function buildTeamsJsonLd(
  teams: Team[],
  league: League,
  leagueSlug: string
) {
  return teams.map((team) => buildSportsTeamJsonLd(team, league, leagueSlug));
}
