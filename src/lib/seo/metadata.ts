import { Metadata } from "next";

/**
 * Base site configuration
 */
const SITE_CONFIG = {
  name: "HockeyLifeHL",
  description: "The ultimate men's recreational hockey league platform. For Fun, For Beers, For Glory.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ogImage: "/banner2.png",
  twitterHandle: "@hockeylifehl",
};

/**
 * League-specific metadata
 */
interface LeagueMetadataProps {
  league: {
    name: string;
    tagline?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    primaryColor: string;
  };
  customDomain?: string;
}

/**
 * Generate base metadata for any page
 */
export function generateBaseMetadata({
  title,
  description,
  path = "",
  image,
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE_CONFIG.url}${path}`;
  const ogImage = image || SITE_CONFIG.ogImage;

  return {
    title,
    description,
    ...(noIndex && { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      creator: SITE_CONFIG.twitterHandle,
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate league-specific homepage metadata
 */
export function generateLeagueMetadata({
  league,
  customDomain,
}: LeagueMetadataProps): Metadata {
  const baseUrl = customDomain ? `https://${customDomain}` : SITE_CONFIG.url;
  const title = `${league.name} - Recreational Hockey League`;
  const description =
    league.description ||
    league.tagline ||
    `${league.name} - The ultimate recreational hockey experience. ${SITE_CONFIG.description}`;
  const image = league.bannerUrl || league.logoUrl || SITE_CONFIG.ogImage;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName: league.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: league.name,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: baseUrl,
    },
    keywords: [
      "hockey league",
      "recreational hockey",
      league.name,
      "men's hockey",
      "hockey stats",
      "hockey teams",
      "hockey games",
    ],
    themeColor: league.primaryColor,
  };
}

/**
 * Generate metadata for standings page
 */
export function generateStandingsMetadata(leagueName: string): Metadata {
  return generateBaseMetadata({
    title: `Standings - ${leagueName}`,
    description: `View current standings, team rankings, and season statistics for ${leagueName}.`,
    path: "/standings",
  });
}

/**
 * Generate metadata for schedule page
 */
export function generateScheduleMetadata(leagueName: string): Metadata {
  return generateBaseMetadata({
    title: `Schedule - ${leagueName}`,
    description: `View upcoming games, recent results, and the complete schedule for ${leagueName}.`,
    path: "/schedule",
  });
}

/**
 * Generate metadata for stats page
 */
export function generateStatsMetadata(leagueName: string): Metadata {
  return generateBaseMetadata({
    title: `Player Stats - ${leagueName}`,
    description: `View player statistics, leaderboards, and performance metrics for ${leagueName}.`,
    path: "/stats",
  });
}

/**
 * Generate metadata for teams page
 */
export function generateTeamsMetadata(leagueName: string): Metadata {
  return generateBaseMetadata({
    title: `Teams - ${leagueName}`,
    description: `Browse all teams, rosters, and team statistics for ${leagueName}.`,
    path: "/teams",
  });
}

/**
 * Generate metadata for individual team page
 */
export function generateTeamMetadata({
  teamName,
  leagueName,
  teamId,
  primaryColor,
  logoUrl,
}: {
  teamName: string;
  leagueName: string;
  teamId: string;
  primaryColor?: string;
  logoUrl?: string;
}): Metadata {
  return {
    ...generateBaseMetadata({
      title: `${teamName} - ${leagueName}`,
      description: `View roster, stats, and schedule for ${teamName} in ${leagueName}.`,
      path: `/teams/${teamId}`,
      image: logoUrl,
    }),
    ...(primaryColor && { themeColor: primaryColor }),
  };
}

/**
 * Generate metadata for individual player stats page
 */
export function generatePlayerMetadata({
  playerName,
  leagueName,
  playerId,
  stats,
}: {
  playerName: string;
  leagueName: string;
  playerId: string;
  stats?: {
    goals?: number;
    assists?: number;
    gamesPlayed?: number;
  };
}): Metadata {
  const statsText = stats
    ? `${stats.goals || 0}G, ${stats.assists || 0}A in ${stats.gamesPlayed || 0} games`
    : "View career and season statistics";

  return generateBaseMetadata({
    title: `${playerName} Stats - ${leagueName}`,
    description: `${playerName}'s hockey statistics in ${leagueName}. ${statsText}`,
    path: `/stats/${playerId}`,
  });
}

/**
 * Generate metadata for news/articles page
 */
export function generateNewsMetadata(leagueName: string): Metadata {
  return generateBaseMetadata({
    title: `News & Articles - ${leagueName}`,
    description: `Latest news, game recaps, and updates from ${leagueName}.`,
    path: "/news",
  });
}

/**
 * Generate JSON-LD structured data for sports league
 */
export function generateLeagueStructuredData(league: {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: league.name,
    description: league.description || `${league.name} - Recreational Hockey League`,
    url: league.url,
    logo: league.logoUrl,
    sport: "Ice Hockey",
  };
}

/**
 * Generate JSON-LD structured data for a game
 */
export function generateGameStructuredData(game: {
  id: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  scheduledAt: string;
  location?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "@id": `game-${game.id}`,
    name: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
    sport: "Ice Hockey",
    startDate: game.scheduledAt,
    ...(game.location && { location: { "@type": "Place", name: game.location } }),
    homeTeam: {
      "@type": "SportsTeam",
      name: game.homeTeam.name,
    },
    awayTeam: {
      "@type": "SportsTeam",
      name: game.awayTeam.name,
    },
    ...(game.status === "completed" &&
      game.homeScore !== null &&
      game.awayScore !== null && {
        competitor: [
          {
            "@type": "SportsTeam",
            name: game.homeTeam.name,
            score: game.homeScore,
          },
          {
            "@type": "SportsTeam",
            name: game.awayTeam.name,
            score: game.awayScore,
          },
        ],
      }),
  };
}

/**
 * Generate JSON-LD structured data for a team
 */
export function generateTeamStructuredData(team: {
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  primaryColor: string;
  captain?: { fullName: string } | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name,
    ...(team.shortName && { alternateName: team.shortName }),
    sport: "Ice Hockey",
    ...(team.logoUrl && { logo: team.logoUrl }),
    ...(team.captain && {
      athlete: {
        "@type": "Person",
        name: team.captain.fullName,
        jobTitle: "Captain",
      },
    }),
  };
}

/**
 * Generate JSON-LD structured data for a player
 */
export function generatePlayerStructuredData(player: {
  fullName: string;
  position?: string | null;
  jerseyNumber?: number | null;
  avatarUrl?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.fullName,
    ...(player.position && { jobTitle: player.position }),
    ...(player.jerseyNumber && { identifier: `#${player.jerseyNumber}` }),
    ...(player.avatarUrl && { image: player.avatarUrl }),
    sport: "Ice Hockey",
  };
}

/**
 * Render structured data as script tag content
 */
export function renderStructuredData(data: Record<string, any>): string {
  return JSON.stringify(data);
}
