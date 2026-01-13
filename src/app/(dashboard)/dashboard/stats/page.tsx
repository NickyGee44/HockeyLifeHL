"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

type GameStat = {
  id: string;
  game: {
    id: string;
    scheduled_at: string;
    home_team: { name: string; short_name: string };
    away_team: { name: string; short_name: string };
    home_score: number;
    away_score: number;
  };
  goals: number;
  assists: number;
  team_id: string;
};

type SeasonData = {
  id: string;
  name: string;
  status: string;
};

type SeasonStats = {
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  goals_per_game: number;
  assists_per_game: number;
  points_per_game: number;
};

export default function MyStatsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [seasons, setSeasons] = useState<SeasonData[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [gameStats, setGameStats] = useState<GameStat[]>([]);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSeasons();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (selectedSeasonId && user) {
      loadPlayerStats();
    }
  }, [selectedSeasonId, user]);

  async function loadSeasons() {
    const supabase = createClient();

    const { data: seasonsData } = await supabase
      .from("seasons")
      .select("id, name, status")
      .order("start_date", { ascending: false });

    if (seasonsData) {
      setSeasons(seasonsData);
      // Default to active season or most recent
      const activeSeason = seasonsData.find(s => s.status === "active" || s.status === "playoffs");
      setSelectedSeasonId(activeSeason?.id || seasonsData[0]?.id || null);
    }
    setLoading(false);
  }

  async function loadPlayerStats() {
    if (!selectedSeasonId || !user) return;

    const supabase = createClient();

    // Get all games for this season that are verified
    const { data: games } = await supabase
      .from("games")
      .select(`
        id,
        scheduled_at,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        home_captain_verified,
        away_captain_verified,
        home_team:teams!games_home_team_id_fkey(id, name, short_name),
        away_team:teams!games_away_team_id_fkey(id, name, short_name)
      `)
      .eq("season_id", selectedSeasonId)
      .eq("status", "completed")
      .eq("home_captain_verified", true)
      .eq("away_captain_verified", true);

    if (!games || games.length === 0) {
      setGameStats([]);
      setSeasonStats({
        games_played: 0,
        goals: 0,
        assists: 0,
        points: 0,
        goals_per_game: 0,
        assists_per_game: 0,
        points_per_game: 0,
      });
      return;
    }

    // Get player stats for these games
    const gameIds = games.map(g => g.id);
    const { data: stats } = await supabase
      .from("player_stats")
      .select(`
        id,
        game_id,
        goals,
        assists,
        team_id,
        game:games!player_stats_game_id_fkey(
          id,
          scheduled_at,
          home_team_id,
          away_team_id,
          home_score,
          away_score,
          home_team:teams!games_home_team_id_fkey(id, name, short_name),
          away_team:teams!games_away_team_id_fkey(id, name, short_name)
        )
      `)
      .eq("player_id", user.id)
      .in("game_id", gameIds)
      .order("game(game(scheduled_at))", { ascending: false });

    if (stats) {
      const formattedStats = stats.map(s => ({
        id: s.id,
        game: {
          id: s.game.id,
          scheduled_at: s.game.scheduled_at,
          home_team: s.game.home_team,
          away_team: s.game.away_team,
          home_score: s.game.home_score,
          away_score: s.game.away_score,
        },
        goals: s.goals || 0,
        assists: s.assists || 0,
        team_id: s.team_id,
      }));

      setGameStats(formattedStats);

      // Calculate season totals
      const totals = formattedStats.reduce(
        (acc, stat) => ({
          goals: acc.goals + stat.goals,
          assists: acc.assists + stat.assists,
          points: acc.points + stat.goals + stat.assists,
        }),
        { goals: 0, assists: 0, points: 0 }
      );

      const gamesPlayed = formattedStats.length;
      setSeasonStats({
        games_played: gamesPlayed,
        goals: totals.goals,
        assists: totals.assists,
        points: totals.points,
        goals_per_game: gamesPlayed > 0 ? totals.goals / gamesPlayed : 0,
        assists_per_game: gamesPlayed > 0 ? totals.assists / gamesPlayed : 0,
        points_per_game: gamesPlayed > 0 ? totals.points / gamesPlayed : 0,
      });
    }
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Stats</h1>
          <p className="text-muted-foreground mt-2">
            Your detailed statistics
          </p>
        </div>
        {seasons.length > 0 && (
          <Select value={selectedSeasonId || ""} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!selectedSeasonId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No seasons available
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Season Summary */}
          {seasonStats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Games Played</CardDescription>
                  <CardTitle className="text-3xl">{seasonStats.games_played}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Goals</CardDescription>
                  <CardTitle className="text-3xl text-gold">{seasonStats.goals}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {seasonStats.goals_per_game.toFixed(2)} per game
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Assists</CardDescription>
                  <CardTitle className="text-3xl text-gold">{seasonStats.assists}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {seasonStats.assists_per_game.toFixed(2)} per game
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Points</CardDescription>
                  <CardTitle className="text-3xl text-canada-red">{seasonStats.points}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {seasonStats.points_per_game.toFixed(2)} per game
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Game-by-Game Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Game-by-Game Stats</CardTitle>
              <CardDescription>
                {selectedSeason?.name} season
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gameStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No stats recorded yet for this season
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Game</TableHead>
                        <TableHead className="text-center">G</TableHead>
                        <TableHead className="text-center">A</TableHead>
                        <TableHead className="text-center">P</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gameStats.map((stat) => {
                        const isHome = stat.team_id === stat.game.home_team.id;
                        const opponent = isHome ? stat.game.away_team : stat.game.home_team;
                        const myScore = isHome ? stat.game.home_score : stat.game.away_score;
                        const oppScore = isHome ? stat.game.away_score : stat.game.home_score;
                        const won = myScore > oppScore;
                        const lost = myScore < oppScore;

                        return (
                          <TableRow key={stat.id}>
                            <TableCell>
                              {new Date(stat.game.scheduled_at).toLocaleDateString("en-CA", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  vs {opponent.name}
                                </span>
                                <Badge variant={won ? "default" : lost ? "destructive" : "outline"}>
                                  {myScore}-{oppScore}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-gold">
                              {stat.goals}
                            </TableCell>
                            <TableCell className="text-center font-bold text-gold">
                              {stat.assists}
                            </TableCell>
                            <TableCell className="text-center font-bold text-canada-red">
                              {stat.goals + stat.assists}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Link to Public Stats */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  View your public stats page
                </p>
                <Link href={`/stats/${user?.id}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                    View Public Page →
                  </Badge>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
