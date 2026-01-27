import { getLeagueFromHostname } from "@/lib/context/league-context";
import { getUpcomingGames, getRecentGames } from "@/lib/games/actions";
import { getActiveSeason } from "@/lib/seasons/actions";
import { getPlayerOfTheWeek } from "@/lib/players/actions";
import { getLeagueSponsors, getPlatformSponsors } from "@/lib/sponsors/actions";
import { LeagueLandingPage } from "@/components/league/LeagueLandingPage";
import { Card, CardContent } from "@/components/ui/card";

// Cache this page for 60 seconds
export const revalidate = 60;

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

  return (
    <LeagueLandingPage
      league={league}
      activeSeason={activeSeason}
      upcomingGames={upcomingGames}
      recentGames={recentGames}
      playerOfTheWeek={playerOfTheWeek}
      leagueSponsors={leagueSponsors}
      platformSponsors={platformSponsors}
    />
  );
}
