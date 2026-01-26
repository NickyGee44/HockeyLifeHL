import { getLeagueFromHostname } from "@/lib/context/league-context";
import { getUpcomingGames, getRecentGames } from "@/lib/games/actions";
import { getAllTeams } from "@/lib/teams/actions";
import { getActiveSeason, getAllSeasons } from "@/lib/seasons/actions";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { Card, CardContent } from "@/components/ui/card";

// Cache this page for 60 seconds
export const revalidate = 60;

/**
 * League Schedule Page
 *
 * Shows game schedule for the league instance accessed via subdomain/custom domain.
 * Displays upcoming games and recent results with league branding.
 */
export default async function LeagueSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const selectedSeasonId = params.season;

  // Get league branding for page styling
  const league = await getLeagueFromHostname();

  // Get active season and all seasons for dropdown
  const [activeSeasonResult, allSeasonsResult, teamsResult] = await Promise.all([
    getActiveSeason(),
    getAllSeasons(),
    getAllTeams(),
  ]);

  const activeSeason = activeSeasonResult.season;
  const allSeasons = allSeasonsResult.seasons || [];
  const teams = teamsResult.teams || [];

  // Filter to only completed/active/playoffs seasons for the dropdown
  const viewableSeasons = allSeasons.filter(s =>
    s.status === "active" || s.status === "playoffs" || s.status === "completed"
  );

  // Determine which season to show
  const seasonToShow = selectedSeasonId
    ? viewableSeasons.find(s => s.id === selectedSeasonId)
    : activeSeason;

  // Only fetch games if we have a season to show
  let upcomingGames: any[] = [];
  let recentGames: any[] = [];

  if (seasonToShow) {
    const [upcomingResult, recentResult] = await Promise.all([
      getUpcomingGames(50, seasonToShow.id),
      getRecentGames(50, seasonToShow.id),
    ]);
    upcomingGames = upcomingResult.games || [];
    recentGames = recentResult.games || [];
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">
          <span className="text-foreground">Game </span>
          <span style={{ color: league?.primaryColor || 'var(--canada-red)' }}>Schedule</span>
        </h1>
        <p className="text-muted-foreground">
          {seasonToShow
            ? `${seasonToShow.name} - View upcoming games and recent results`
            : "View upcoming games and recent results"}
        </p>
      </div>

      {!activeSeason && !selectedSeasonId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No active season. Check back when the season starts!
            </p>
            {viewableSeasons.length > 0 && (
              <p className="text-sm text-muted-foreground">
                You can view past seasons by selecting from the dropdown below.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <ScheduleView
        upcomingGames={upcomingGames}
        recentGames={recentGames}
        teams={teams}
        seasons={viewableSeasons}
        currentSeasonId={seasonToShow?.id}
        activeSeason={activeSeason}
        showSeasonSelector={true}
      />
    </div>
  );
}

export async function generateMetadata() {
  const league = await getLeagueFromHostname();
  return {
    title: 'Schedule',
    description: league ? `Game schedule for ${league.name}` : 'Game schedule',
  };
}
