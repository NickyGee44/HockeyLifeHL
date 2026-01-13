import Link from "next/link";
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
import { createClient } from "@/lib/supabase/server";

async function getStandings() {
  const supabase = await createClient();
  
  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name, status, current_game_count, games_per_cycle")
    .in("status", ["active", "playoffs"])
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  if (!activeSeason) {
    return { activeSeason: null, standings: [] };
  }

  // Get all teams
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_name, primary_color, secondary_color");

  if (!teams || teams.length === 0) {
    return { activeSeason, standings: [] };
  }

  // Get all completed games for this season
  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score, status")
    .eq("season_id", activeSeason.id)
    .eq("status", "completed");

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

  return { activeSeason, standings };
}

export default async function StandingsPage() {
  const { activeSeason, standings } = await getStandings();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">
          <span className="text-foreground">League </span>
          <span className="text-canada-red">Standings</span>
        </h1>
        {activeSeason && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{activeSeason.name}</span>
            {activeSeason.status === "playoffs" && (
              <Badge className="bg-gold text-puck-black">🏆 Playoffs</Badge>
            )}
          </div>
        )}
      </div>

      {!activeSeason ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No active season. Check back when the season starts!
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
          {/* Season Progress */}
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Season Progress</CardTitle>
              <CardDescription>
                {activeSeason.current_game_count} of {activeSeason.games_per_cycle} games until next draft
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-canada-red transition-all"
                  style={{ 
                    width: `${(activeSeason.current_game_count / activeSeason.games_per_cycle) * 100}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>

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
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-center">GP</TableHead>
                      <TableHead className="text-center">W</TableHead>
                      <TableHead className="text-center">L</TableHead>
                      <TableHead className="text-center">T</TableHead>
                      <TableHead className="text-center">GF</TableHead>
                      <TableHead className="text-center">GA</TableHead>
                      <TableHead className="text-center">DIFF</TableHead>
                      <TableHead className="text-center font-bold">PTS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standings.map((standing, index) => {
                      const diff = standing.gf - standing.ga;
                      return (
                        <TableRow key={standing.team.id}>
                          <TableCell className="text-center font-bold">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <Link 
                              href={`/teams/${standing.team.id}`}
                              className="flex items-center gap-3 hover:underline"
                            >
                              <div 
                                className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs"
                                style={{ 
                                  backgroundColor: standing.team.primary_color,
                                  color: standing.team.secondary_color,
                                }}
                              >
                                {standing.team.short_name}
                              </div>
                              <span className="font-medium">{standing.team.name}</span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">{standing.gp}</TableCell>
                          <TableCell className="text-center text-green-500 font-medium">{standing.w}</TableCell>
                          <TableCell className="text-center text-red-500">{standing.l}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{standing.t}</TableCell>
                          <TableCell className="text-center">{standing.gf}</TableCell>
                          <TableCell className="text-center">{standing.ga}</TableCell>
                          <TableCell className={`text-center font-medium ${diff > 0 ? "text-green-500" : diff < 0 ? "text-red-500" : ""}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </TableCell>
                          <TableCell className="text-center font-bold text-lg">{standing.pts}</TableCell>
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
