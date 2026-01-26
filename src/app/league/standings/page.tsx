import { getLeagueFromHostname } from "@/lib/context/league-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamLogo } from "@/components/ui/team-logo";
import { createClient } from "@/lib/supabase/server";
import { SeasonSelector } from "@/components/standings/SeasonSelector";

// Cache this page for 60 seconds
export const revalidate = 60;

async function getStandings(seasonId?: string) {
  const supabase = await createClient();

  // Get all viewable seasons for the dropdown
  const { data: allSeasons } = await supabase
    .from("seasons")
    .select("id, name, status, current_game_count, games_per_cycle")
    .in("status", ["active", "playoffs", "completed"])
    .order("start_date", { ascending: false });

  // Get active season
  const activeSeason = allSeasons?.find(s => s.status === "active" || s.status === "playoffs") || null;

  // Determine which season to show standings for
  let selectedSeason = seasonId
    ? allSeasons?.find(s => s.id === seasonId)
    : activeSeason;

  if (!selectedSeason) {
    return { activeSeason, selectedSeason: null, allSeasons: allSeasons || [], standings: [] };
  }

  // Run teams and games queries in parallel
  const [teamsResult, gamesResult] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, short_name, logo_url, primary_color, secondary_color"),
    supabase
      .from("games")
      .select("home_team_id, away_team_id, home_score, away_score, status")
      .eq("season_id", selectedSeason.id)
      .eq("status", "completed")
  ]);

  const teams = teamsResult.data;
  const games = gamesResult.data;

  if (!teams || teams.length === 0) {
    return { activeSeason, selectedSeason, allSeasons: allSeasons || [], standings: [] };
  }

  // Calculate standings
  const teamStats: Record<string, {
    team: typeof teams[0];
    gp: number;
    w: number;
    l: number;
    t: number;
    gf: number;
    ga: number;
    pts: number;
  }> = {};

  // Initialize all teams
  teams.forEach(team => {
    teamStats[team.id] = {
      team,
      gp: 0,
      w: 0,
      l: 0,
      t: 0,
      gf: 0,
      ga: 0,
      pts: 0,
    };
  });

  // Process games
  games?.forEach(game => {
    const homeStats = teamStats[game.home_team_id];
    const awayStats = teamStats[game.away_team_id];

    if (homeStats && awayStats) {
      // Games played
      homeStats.gp++;
      awayStats.gp++;

      // Goals
      homeStats.gf += game.home_score;
      homeStats.ga += game.away_score;
      awayStats.gf += game.away_score;
      awayStats.ga += game.home_score;

      // Win/Loss/Tie
      if (game.home_score > game.away_score) {
        homeStats.w++;
        homeStats.pts += 2;
        awayStats.l++;
      } else if (game.away_score > game.home_score) {
        awayStats.w++;
        awayStats.pts += 2;
        homeStats.l++;
      } else {
        homeStats.t++;
        awayStats.t++;
        homeStats.pts += 1;
        awayStats.pts += 1;
      }
    }
  });

  // Sort by points, then wins, then goal differential
  const standings = Object.values(teamStats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.w !== a.w) return b.w - a.w;
    const aDiff = a.gf - a.ga;
    const bDiff = b.gf - b.ga;
    return bDiff - aDiff;
  });

  return { activeSeason, selectedSeason, allSeasons: allSeasons || [], standings };
}

/**
 * League Standings Page
 *
 * Shows team standings for the league instance accessed via subdomain/custom domain.
 * Displays standings table with league branding colors.
 */
export default async function LeagueStandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const league = await getLeagueFromHostname();
  const { activeSeason, selectedSeason, allSeasons, standings } = await getStandings(params.season);

  // Use league colors for styling
  const primaryColor = league?.primaryColor || '#E31837';
  const accentColor = league?.accentColor || '#FFD700';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">
          <span className="text-foreground">League </span>
          <span style={{ color: primaryColor }}>Standings</span>
        </h1>
        {selectedSeason && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{selectedSeason.name}</span>
            {selectedSeason.status === "playoffs" && (
              <Badge style={{ backgroundColor: accentColor, color: '#000' }}>Playoffs</Badge>
            )}
            {selectedSeason.status === "completed" && (
              <Badge variant="outline">Completed</Badge>
            )}
          </div>
        )}
      </div>

      {/* Season Selector */}
      {allSeasons.length > 0 && (
        <div className="mb-6">
          <SeasonSelector
            seasons={allSeasons}
            currentSeasonId={selectedSeason?.id}
            activeSeason={activeSeason}
          />
        </div>
      )}

      {!activeSeason && !params.season ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No active season. Check back when the season starts!
            </p>
            {allSeasons.length > 0 && (
              <p className="text-sm text-muted-foreground">
                You can view past seasons by selecting from the dropdown above.
              </p>
            )}
          </CardContent>
        </Card>
      ) : !selectedSeason ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Season not found. Please select a valid season.
            </p>
          </CardContent>
        </Card>
      ) : standings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No teams in the league yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Season Progress - only show for active seasons */}
          {selectedSeason && (selectedSeason.status === "active" || selectedSeason.status === "playoffs") && (
            <Card className="mb-8">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Season Progress</CardTitle>
                <CardDescription>
                  {selectedSeason.current_game_count} of {selectedSeason.games_per_cycle} games until next draft
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${((selectedSeason.current_game_count || 0) / (selectedSeason.games_per_cycle || 1)) * 100}%`,
                      backgroundColor: primaryColor,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Standings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Team Standings</CardTitle>
              <CardDescription>
                2 points for a win, 1 point for a tie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 md:w-12 text-center">#</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-center">GP</TableHead>
                      <TableHead className="text-center">W</TableHead>
                      <TableHead className="text-center">L</TableHead>
                      <TableHead className="text-center">T</TableHead>
                      <TableHead className="text-center hidden md:table-cell">GF</TableHead>
                      <TableHead className="text-center hidden md:table-cell">GA</TableHead>
                      <TableHead className="text-center hidden lg:table-cell">DIFF</TableHead>
                      <TableHead className="text-center font-bold" style={{ color: primaryColor }}>PTS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((standing, index) => {
                      const diff = standing.gf - standing.ga;
                      return (
                        <TableRow key={standing.team.id}>
                          <TableCell className="text-center font-bold text-muted-foreground text-xs md:text-sm">
                            {index + 1}
                          </TableCell>
                          <TableCell className="py-3">
                            <TeamLogo
                              team={standing.team}
                              size="sm"
                              showName
                              nameClassName="font-bold text-sm md:text-base"
                            />
                          </TableCell>
                          <TableCell className="text-center text-xs md:text-sm">{standing.gp}</TableCell>
                          <TableCell className="text-center text-green-500 font-bold text-xs md:text-sm">{standing.w}</TableCell>
                          <TableCell className="text-center text-red-500 text-xs md:text-sm">{standing.l}</TableCell>
                          <TableCell className="text-center text-muted-foreground text-xs md:text-sm">{standing.t}</TableCell>
                          <TableCell className="text-center hidden md:table-cell text-xs md:text-sm">{standing.gf}</TableCell>
                          <TableCell className="text-center hidden md:table-cell text-xs md:text-sm">{standing.ga}</TableCell>
                          <TableCell className={`text-center font-medium hidden lg:table-cell ${diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : ""}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </TableCell>
                          <TableCell className="text-center font-black text-base md:text-lg" style={{ color: primaryColor }}>{standing.pts}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="mt-4 text-sm text-muted-foreground">
            <p><strong>GP</strong> = Games Played, <strong>W</strong> = Wins, <strong>L</strong> = Losses, <strong>T</strong> = Ties</p>
            <p><strong>GF</strong> = Goals For, <strong>GA</strong> = Goals Against, <strong>DIFF</strong> = Goal Differential, <strong>PTS</strong> = Points</p>
          </div>
        </>
      )}
    </div>
  );
}

export async function generateMetadata() {
  const league = await getLeagueFromHostname();
  return {
    title: 'Standings',
    description: league ? `Team standings for ${league.name}` : 'Team standings',
  };
}
