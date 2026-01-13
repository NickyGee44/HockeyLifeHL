"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { 
  getGamesNeedingStats, 
  enterPlayerStats, 
  enterGoalieStats,
  verifyGameStats,
  getGameStats 
} from "@/lib/stats/actions";
import { toast } from "sonner";

type Game = {
  id: string;
  scheduled_at: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: string;
  home_captain_verified: boolean;
  away_captain_verified: boolean;
  home_team: { id: string; name: string; short_name: string };
  away_team: { id: string; name: string; short_name: string };
  season: { id: string; name: string };
  hasStats: boolean;
  isHomeTeam: boolean;
};

type Player = {
  id: string;
  full_name: string | null;
  jersey_number: number | null;
  position: string | null;
};

export default function CaptainStatsPage() {
  const { user, loading: authLoading, isCaptain } = useAuth();
  const [team, setTeam] = useState<{ id: string; name: string } | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [goalies, setGoalies] = useState<Player[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, { goals: number; assists: number }>>({});
  const [goalieStats, setGoalieStats] = useState<Record<string, { goalsAgainst: number; saves: number; shutout: boolean }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"enter" | "verify">("enter");

  useEffect(() => {
    if (user && isCaptain) {
      loadData();
    } else if (!authLoading && !isCaptain) {
      setLoading(false);
    }
  }, [user, isCaptain, authLoading]);

  async function loadData() {
    const supabase = createClient();
    
    // Get team where user is captain
    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name")
      .eq("captain_id", user?.id)
      .single();

    if (!teamData) {
      setLoading(false);
      return;
    }

    setTeam(teamData);

    // Get games needing stats
    const result = await getGamesNeedingStats(teamData.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setGames(result.games || []);
    }

    // Get team roster for active season
    const { data: seasonData } = await supabase
      .from("seasons")
      .select("id")
      .in("status", ["active", "playoffs"])
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (seasonData) {
      const { data: roster } = await supabase
        .from("team_rosters")
        .select(`
          is_goalie,
          player:profiles!team_rosters_player_id_fkey(id, full_name, jersey_number, position)
        `)
        .eq("team_id", teamData.id)
        .eq("season_id", seasonData.id);

      if (roster) {
        const regularPlayers = roster
          .filter(r => !r.is_goalie)
          .map(r => r.player as Player);
        const goaliePlayers = roster
          .filter(r => r.is_goalie)
          .map(r => r.player as Player);
        
        setPlayers(regularPlayers);
        setGoalies(goaliePlayers);
      }
    }

    setLoading(false);
  }

  function openGameDialog(game: Game, mode: "enter" | "verify") {
    setSelectedGame(game);
    setViewMode(mode);
    
    if (mode === "enter") {
      // Initialize stats with zeros
      const initialPlayerStats: Record<string, { goals: number; assists: number }> = {};
      players.forEach(p => {
        initialPlayerStats[p.id] = { goals: 0, assists: 0 };
      });
      setPlayerStats(initialPlayerStats);

      const initialGoalieStats: Record<string, { goalsAgainst: number; saves: number; shutout: boolean }> = {};
      goalies.forEach(g => {
        initialGoalieStats[g.id] = { goalsAgainst: 0, saves: 0, shutout: false };
      });
      setGoalieStats(initialGoalieStats);

      // Load existing stats if any
      loadGameStats(game.id);
    }
  }

  async function loadGameStats(gameId: string) {
    const result = await getGameStats(gameId);
    if (result.playerStats) {
      const stats: Record<string, { goals: number; assists: number }> = {};
      result.playerStats.forEach((ps: any) => {
        if (ps.team_id === team?.id) {
          stats[ps.player_id] = { goals: ps.goals, assists: ps.assists };
        }
      });
      setPlayerStats(stats);
    }
    if (result.goalieStats) {
      const stats: Record<string, { goalsAgainst: number; saves: number; shutout: boolean }> = {};
      result.goalieStats.forEach((gs: any) => {
        if (gs.team_id === team?.id) {
          stats[gs.player_id] = {
            goalsAgainst: gs.goals_against,
            saves: gs.saves,
            shutout: gs.shutout,
          };
        }
      });
      setGoalieStats(stats);
    }
  }

  async function handleSaveStats() {
    if (!selectedGame || !team) return;

    setIsSaving(true);

    // Save player stats
    const playerStatsArray = Object.entries(playerStats).map(([playerId, stats]) => ({
      playerId,
      goals: stats.goals,
      assists: stats.assists,
    }));

    const playerResult = await enterPlayerStats(selectedGame.id, team.id, playerStatsArray);
    if (playerResult.error) {
      toast.error(playerResult.error);
      setIsSaving(false);
      return;
    }

    // Save goalie stats
    for (const [goalieId, stats] of Object.entries(goalieStats)) {
      if (stats.goalsAgainst > 0 || stats.saves > 0) {
        const goalieResult = await enterGoalieStats(selectedGame.id, team.id, goalieId, stats);
        if (goalieResult.error) {
          toast.error(goalieResult.error);
          setIsSaving(false);
          return;
        }
      }
    }

    toast.success("Stats saved successfully!");
    setSelectedGame(null);
    setIsSaving(false);
    loadData();
  }

  async function handleVerify() {
    if (!selectedGame || !team) return;

    const result = await verifyGameStats(selectedGame.id, team.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Game stats verified!");
      setSelectedGame(null);
      loadData();
    }
  }

  if (loading || authLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!isCaptain) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            You are not currently a team captain.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            You haven&apos;t been assigned to a team yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const gamesNeedingEntry = games.filter(g => !g.hasStats);
  const gamesNeedingVerify = games.filter(g => {
    if (g.isHomeTeam) {
      return g.hasStats && !g.home_captain_verified && g.away_captain_verified;
    } else {
      return g.hasStats && !g.away_captain_verified && g.home_captain_verified;
    }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Enter Game Stats 📊</h1>
        <p className="text-muted-foreground mt-2">
          Enter stats for {team.name} games
        </p>
      </div>

      {/* Games Needing Stats Entry */}
      {gamesNeedingEntry.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Games Needing Stats Entry</CardTitle>
            <CardDescription>
              Enter player and goalie stats for completed games
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gamesNeedingEntry.map((game) => {
                const opponent = game.isHomeTeam ? game.away_team : game.home_team;
                const score = game.isHomeTeam 
                  ? `${game.home_score} - ${game.away_score}`
                  : `${game.away_score} - ${game.home_score}`;
                
                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-canada-red/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">
                        vs {opponent.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(game.scheduled_at).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })} • Final: {score}
                      </p>
                    </div>
                    <Button
                      onClick={() => openGameDialog(game, "enter")}
                      className="bg-canada-red hover:bg-canada-red-dark"
                    >
                      Enter Stats
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Games Needing Verification */}
      {gamesNeedingVerify.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Games Needing Verification</CardTitle>
            <CardDescription>
              Review and verify opponent&apos;s submitted stats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gamesNeedingVerify.map((game) => {
                const opponent = game.isHomeTeam ? game.away_team : game.home_team;
                const score = game.isHomeTeam 
                  ? `${game.home_score} - ${game.away_score}`
                  : `${game.away_score} - ${game.home_score}`;
                
                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        vs {opponent.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(game.scheduled_at).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })} • Final: {score}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        Opponent has submitted stats - please verify
                      </p>
                    </div>
                    <Button
                      onClick={() => openGameDialog(game, "verify")}
                      variant="outline"
                    >
                      Review & Verify
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {gamesNeedingEntry.length === 0 && gamesNeedingVerify.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No games need stats entry or verification right now.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stat Entry Dialog */}
      <Dialog open={!!selectedGame} onOpenChange={() => setSelectedGame(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewMode === "enter" ? "Enter Game Stats" : "Verify Game Stats"}
            </DialogTitle>
            <DialogDescription>
              {selectedGame && (
                <>
                  {selectedGame.isHomeTeam ? selectedGame.home_team.name : selectedGame.away_team.name} vs{" "}
                  {selectedGame.isHomeTeam ? selectedGame.away_team.name : selectedGame.home_team.name}
                  {" • "}
                  {new Date(selectedGame.scheduled_at).toLocaleDateString("en-CA")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {viewMode === "enter" && (
            <div className="space-y-6 py-4">
              {/* Player Stats */}
              <div>
                <h3 className="font-semibold mb-4">Player Stats</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-center">Goals</TableHead>
                        <TableHead className="text-center">Assists</TableHead>
                        <TableHead className="text-center">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.map((player) => {
                        const stats = playerStats[player.id] || { goals: 0, assists: 0 };
                        return (
                          <TableRow key={player.id}>
                            <TableCell>
                              <Link 
                                href={`/stats/${player.id}`}
                                className="hover:underline"
                              >
                                {player.full_name || "Unknown"}
                              </Link>
                              {player.jersey_number !== null && (
                                <span className="text-muted-foreground ml-2">
                                  #{player.jersey_number}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={stats.goals}
                                onChange={(e) => {
                                  setPlayerStats({
                                    ...playerStats,
                                    [player.id]: {
                                      ...stats,
                                      goals: parseInt(e.target.value) || 0,
                                    },
                                  });
                                }}
                                className="w-20 text-center"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={stats.assists}
                                onChange={(e) => {
                                  setPlayerStats({
                                    ...playerStats,
                                    [player.id]: {
                                      ...stats,
                                      assists: parseInt(e.target.value) || 0,
                                    },
                                  });
                                }}
                                className="w-20 text-center"
                              />
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {stats.goals + stats.assists}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Goalie Stats */}
              {goalies.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4">Goalie Stats</h3>
                  <div className="space-y-4">
                    {goalies.map((goalie) => {
                      const stats = goalieStats[goalie.id] || { goalsAgainst: 0, saves: 0, shutout: false };
                      return (
                        <Card key={goalie.id}>
                          <CardContent className="p-4">
                            <div className="space-y-4">
                              <div>
                                <Label className="font-medium">
                                  <Link 
                                    href={`/stats/${goalie.id}`}
                                    className="hover:underline"
                                  >
                                    {goalie.full_name || "Unknown"}
                                  </Link>
                                  {goalie.jersey_number !== null && (
                                    <span className="text-muted-foreground ml-2">
                                      #{goalie.jersey_number}
                                    </span>
                                  )}
                                </Label>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <Label htmlFor={`ga-${goalie.id}`}>Goals Against</Label>
                                  <Input
                                    id={`ga-${goalie.id}`}
                                    type="number"
                                    min="0"
                                    value={stats.goalsAgainst}
                                    onChange={(e) => {
                                      setGoalieStats({
                                        ...goalieStats,
                                        [goalie.id]: {
                                          ...stats,
                                          goalsAgainst: parseInt(e.target.value) || 0,
                                          shutout: parseInt(e.target.value) === 0,
                                        },
                                      });
                                    }}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`saves-${goalie.id}`}>Saves</Label>
                                  <Input
                                    id={`saves-${goalie.id}`}
                                    type="number"
                                    min="0"
                                    value={stats.saves}
                                    onChange={(e) => {
                                      setGoalieStats({
                                        ...goalieStats,
                                        [goalie.id]: {
                                          ...stats,
                                          saves: parseInt(e.target.value) || 0,
                                        },
                                      });
                                    }}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`shutout-${goalie.id}`}
                                      checked={stats.shutout}
                                      onChange={(e) => {
                                        setGoalieStats({
                                          ...goalieStats,
                                          [goalie.id]: {
                                            ...stats,
                                            shutout: e.target.checked,
                                            goalsAgainst: e.target.checked ? 0 : stats.goalsAgainst,
                                          },
                                        });
                                      }}
                                      className="rounded"
                                    />
                                    <Label htmlFor={`shutout-${goalie.id}`} className="cursor-pointer">
                                      Shutout
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === "verify" && selectedGame && (
            <div className="py-4">
              <p className="text-muted-foreground mb-4">
                Review the opponent&apos;s submitted stats. If they look correct, click Verify to confirm.
              </p>
              <div className="space-y-4">
                {/* Show opponent's stats here - would need to fetch them */}
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Opponent stats will be displayed here for review.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedGame(null)}>
              Cancel
            </Button>
            {viewMode === "enter" ? (
              <Button
                onClick={handleSaveStats}
                disabled={isSaving}
                className="bg-canada-red hover:bg-canada-red-dark"
              >
                {isSaving ? "Saving..." : "Save Stats"}
              </Button>
            ) : (
              <Button
                onClick={handleVerify}
                className="bg-green-600 hover:bg-green-700"
              >
                ✓ Verify Stats
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
