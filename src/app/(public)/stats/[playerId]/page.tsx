import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlayerStats, getGoalieStats } from "@/lib/stats/queries";
import { getAllSeasons } from "@/lib/seasons/actions";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type Props = {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ season?: string }>;
};

async function getPlayerData(playerId: string) {
  const supabase = await createClient();
  
  const { data: player, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", playerId)
    .single();

  if (error || !player) {
    return { player: null };
  }

  return { player };
}

export default async function PlayerStatsPage({ params, searchParams }: Props) {
  const { playerId } = await params;
  const { season: seasonId } = await searchParams;
  
  const { player } = await getPlayerData(playerId);
  const { seasons } = await getAllSeasons();
  const activeSeason = seasons.find(s => s.status === "active" || s.status === "playoffs");

  if (!player) {
    notFound();
  }

  const selectedSeasonId = seasonId || activeSeason?.id;
  
  // Get stats for selected season or all seasons
  const [playerStatsResult, goalieStatsResult] = await Promise.all([
    getPlayerStats(playerId, selectedSeasonId || undefined),
    getGoalieStats(playerId, selectedSeasonId || undefined),
  ]);

  const playerStats = playerStatsResult.stats || [];
  const goalieStats = goalieStatsResult.stats || [];
  const playerTotals = playerStatsResult.totals || { games: 0, goals: 0, assists: 0, points: 0 };
  const goalieTotals = goalieStatsResult.totals || { games: 0, goalsAgainst: 0, saves: 0, shutouts: 0, gaa: 0, savePercentage: 0 };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isGoalie = goalieStats.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Player Header */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={player.avatar_url || ""} />
              <AvatarFallback className="bg-canada-red text-white text-2xl">
                {getInitials(player.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {player.full_name || "Unknown Player"}
              </h1>
              <div className="flex items-center gap-3">
                {player.jersey_number !== null && (
                  <Badge variant="outline" className="font-mono text-lg">
                    #{player.jersey_number}
                  </Badge>
                )}
                {player.position && (
                  <Badge variant="secondary" className="text-lg">
                    {player.position}
                  </Badge>
                )}
                {isGoalie && (
                  <Badge className="bg-rink-blue text-lg">G</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Selector */}
      {seasons.length > 1 && (
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Season:</span>
              <Link href={`/stats/${playerId}`}>
                <Badge variant={!selectedSeasonId ? "default" : "outline"} className="cursor-pointer">
                  All Seasons
                </Badge>
              </Link>
              {seasons.map((season) => (
                <Link key={season.id} href={`/stats/${playerId}?season=${season.id}`}>
                  <Badge 
                    variant={selectedSeasonId === season.id ? "default" : "outline"} 
                    className="cursor-pointer"
                  >
                    {season.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue={isGoalie ? "goalie" : "player"} className="space-y-6">
        <TabsList>
          {playerStats.length > 0 && (
            <TabsTrigger value="player">
              Player Stats
            </TabsTrigger>
          )}
          {goalieStats.length > 0 && (
            <TabsTrigger value="goalie">
              Goalie Stats
            </TabsTrigger>
          )}
        </TabsList>

        {playerStats.length > 0 && (
          <TabsContent value="player">
            {/* Player Stats Summary */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Games Played</CardDescription>
                  <CardTitle className="text-3xl">{playerTotals.games}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Goals</CardDescription>
                  <CardTitle className="text-3xl text-canada-red">{playerTotals.goals}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Assists</CardDescription>
                  <CardTitle className="text-3xl">{playerTotals.assists}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Points</CardDescription>
                  <CardTitle className="text-3xl text-gold">{playerTotals.points}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {playerTotals.games > 0 ? (playerTotals.points / playerTotals.games).toFixed(2) : "0.00"} PTS/G
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Game-by-Game Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Game-by-Game Stats</CardTitle>
                <CardDescription>
                  Detailed stats for each game
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Opponent</TableHead>
                        <TableHead className="text-center">G</TableHead>
                        <TableHead className="text-center">A</TableHead>
                        <TableHead className="text-center">PTS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {playerStats.map((stat: any) => {
                        const game = stat.game;
                        const opponent = game.home_team_id === stat.team_id 
                          ? game.away_team 
                          : game.home_team;
                        return (
                          <TableRow key={stat.id}>
                            <TableCell>
                              {new Date(game.scheduled_at).toLocaleDateString("en-CA", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              vs {opponent?.name || "TBD"}
                            </TableCell>
                            <TableCell className="text-center font-medium text-canada-red">
                              {stat.goals || 0}
                            </TableCell>
                            <TableCell className="text-center">
                              {stat.assists || 0}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {(stat.goals || 0) + (stat.assists || 0)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {goalieStats.length > 0 && (
          <TabsContent value="goalie">
            {/* Goalie Stats Summary */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Games Played</CardDescription>
                  <CardTitle className="text-3xl">{goalieTotals.games}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Goals Against</CardDescription>
                  <CardTitle className="text-3xl">{goalieTotals.goalsAgainst}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Shutouts</CardDescription>
                  <CardTitle className="text-3xl text-gold">{goalieTotals.shutouts}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>GAA</CardDescription>
                  <CardTitle className="text-3xl">{goalieTotals.gaa.toFixed(2)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {goalieTotals.savePercentage.toFixed(1)}% Save %
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Game-by-Game Goalie Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Game-by-Game Stats</CardTitle>
                <CardDescription>
                  Detailed goalie stats for each game
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Opponent</TableHead>
                        <TableHead className="text-center">GA</TableHead>
                        <TableHead className="text-center">Saves</TableHead>
                        <TableHead className="text-center">SO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goalieStats.map((stat: any) => {
                        const game = stat.game;
                        const opponent = game.home_team_id === stat.team_id 
                          ? game.away_team 
                          : game.home_team;
                        return (
                          <TableRow key={stat.id}>
                            <TableCell>
                              {new Date(game.scheduled_at).toLocaleDateString("en-CA", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              vs {opponent?.name || "TBD"}
                            </TableCell>
                            <TableCell className="text-center">
                              {stat.goals_against || 0}
                            </TableCell>
                            <TableCell className="text-center">
                              {stat.saves || 0}
                            </TableCell>
                            <TableCell className="text-center">
                              {stat.shutout ? (
                                <Badge className="bg-gold text-puck-black">✓</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
