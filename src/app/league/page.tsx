import { getLeagueFromHostname } from "@/lib/context/league-context";
import { getUpcomingGames, getRecentGames } from "@/lib/games/actions";
import { getActiveSeason } from "@/lib/seasons/actions";
import { getPlayerOfTheWeek } from "@/lib/players/actions";
import { getLeagueSponsors, getPlatformSponsors } from "@/lib/sponsors/actions";
import { LeagueLandingPage } from "@/components/league/LeagueLandingPage";
import { Card, CardContent } from "@/components/ui/card";
import { generateLeagueMetadata, generateLeagueStructuredData, renderStructuredData } from "@/lib/seo/metadata";
import { headers } from "next/headers";

// Cache this page for 60 seconds
export const revalidate = 60;

/**
 * Generate metadata for league home page
 */
export async function generateMetadata() {
  const league = await getLeagueFromHostname();

  if (!league) {
    return {
      title: "League Not Found",
      description: "The requested league could not be found.",
      robots: { index: false, follow: false },
    };
  }

  // Get custom domain from headers if available
  const headersList = await headers();
  const host = headersList.get("host");
  const customDomain = host && !host.includes("localhost") && !host.includes("vercel.app") ? host : undefined;

  return generateLeagueMetadata({ league, customDomain });
}

/**
 * League Home Page
 *
 * This is the landing page for league instances accessed via
 * subdomain or custom domain. Shows league overview with beautiful UI.
 */
export default async function LeagueHomePage() {
  // Get league branding from hostname
  const league = await getLeagueFromHostname();

  if (!league) {
    // Should not happen as layout handles this, but just in case
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">League not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch league data in parallel
  const [
    activeSeasonResult,
    upcomingGamesResult,
    recentGamesResult,
    playerOfTheWeekResult,
    leagueSponsorsResult,
    platformSponsorsResult,
  ] = await Promise.all([
    getActiveSeason(),
    getUpcomingGames(5),
    getRecentGames(5),
    getPlayerOfTheWeek(),
    getLeagueSponsors(league.id),
    getPlatformSponsors(),
  ]);

  const activeSeason = activeSeasonResult.season;
  const upcomingGames = upcomingGamesResult.games || [];
  const recentGames = recentGamesResult.games || [];
  const playerOfTheWeek = playerOfTheWeekResult.player;
  const leagueSponsors = leagueSponsorsResult.sponsors || [];
  const platformSponsors = platformSponsorsResult.sponsors || [];

  // Generate structured data for the league
  const headersList = await headers();
  const host = headersList.get("host");
  const baseUrl = host ? `https://${host}` : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const structuredData = generateLeagueStructuredData({
    name: league.name,
    description: league.tagline || undefined,
    logoUrl: league.logoUrl,
    url: baseUrl,
  });

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderStructuredData(structuredData) }}
      />

      <LeagueLandingPage
        league={league}
        activeSeason={activeSeason}
        upcomingGames={upcomingGames}
        recentGames={recentGames}
        playerOfTheWeek={playerOfTheWeek}
        leagueSponsors={leagueSponsors}
        platformSponsors={platformSponsors}
      />
    </>
  );
}
