"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

type Game = {
  id: string;
  scheduled_at: string;
  location: string | null;
  status: string;
  home_score: number;
  away_score: number;
  home_team: {
    id: string;
    name: string;
    short_name: string;
    primary_color: string;
  };
  away_team: {
    id: string;
    name: string;
    short_name: string;
    primary_color: string;
  };
  home_captain_verified: boolean;
  away_captain_verified: boolean;
};

type SeasonData = {
  id: string;
  name: string;
  status: string;
};

export default function MySchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSchedule();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  async function loadSchedule() {
    const supabase = createClient();

    // Get active season
    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id, name, status")
      .in("status", ["active", "playoffs"])
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (!activeSeason) {
      setLoading(false);
      return;
    }

    setSeason(activeSeason);

    // Get player's team for this season
    const { data: rosterEntry } = await supabase
      .from("team_rosters")
      .select("team_id")
      .eq("player_id", user?.id)
      .eq("season_id", activeSeason.id)
      .single();

    if (!rosterEntry) {
      setLoading(false);
      return;
    }

    setTeamId(rosterEntry.team_id);

    // Get upcoming games (scheduled or in_progress)
    const now = new Date().toISOString();
    const { data: upcoming } = await supabase
      .from("games")
      .select(`
        id,
        scheduled_at,
        location,
        status,
        home_score,
        away_score,
        home_captain_verified,
        away_captain_verified,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color)
      `)
      .eq("season_id", activeSeason.id)
      .or(`home_team_id.eq.${rosterEntry.team_id},away_team_id.eq.${rosterEntry.team_id}`)
      .gte("scheduled_at", now)
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_at", { ascending: true })
      .limit(10);

    // Get recent games (completed)
    const { data: recent } = await supabase
      .from("games")
      .select(`
        id,
        scheduled_at,
        location,
        status,
        home_score,
        away_score,
        home_captain_verified,
        away_captain_verified,
        home_team:teams!games_home_team_id_fkey(id, name, short_name, primary_color),
        away_team:teams!games_away_team_id_fkey(id, name, short_name, primary_color)
      `)
      .eq("season_id", activeSeason.id)
      .or(`home_team_id.eq.${rosterEntry.team_id},away_team_id.eq.${rosterEntry.team_id}`)
      .eq("status", "completed")
      .order("scheduled_at", { ascending: false })
      .limit(10);

    setUpcomingGames((upcoming || []) as Game[]);
    setRecentGames((recent || []) as Game[]);
    setLoading(false);
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

  if (!teamId) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground mt-2">
            Your team's game schedule
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You are not currently on a team for this season.
            </p>
            <p className="text-sm text-muted-foreground">
              Contact the league owner to be assigned to a team.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Schedule</h1>
        <p className="text-muted-foreground mt-2">
          {season?.name} Season
        </p>
      </div>

      {/* Upcoming Games */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Games</CardTitle>
          <CardDescription>
            Your team's scheduled games
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingGames.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No upcoming games scheduled
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingGames.map((game) => {
                const isHome = game.home_team.id === teamId;
                const opponent = isHome ? game.away_team : game.home_team;
                const gameDate = new Date(game.scheduled_at);

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={isHome ? "default" : "outline"}>
                          {isHome ? "HOME" : "AWAY"}
                        </Badge>
                        <span className="font-semibold text-lg">vs {opponent.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {gameDate.toLocaleDateString("en-CA", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>
                          {gameDate.toLocaleTimeString("en-CA", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {game.location && (
                          <span>📍 {game.location}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {game.status === "in_progress" && (
                        <Badge className="bg-green-600">LIVE</Badge>
                      )}
                      <Link href={`/schedule`}>
                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                          View →
                        </Badge>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Games</CardTitle>
          <CardDescription>
            Your team's completed games
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentGames.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No recent games
            </p>
          ) : (
            <div className="space-y-4">
              {recentGames.map((game) => {
                const isHome = game.home_team.id === teamId;
                const opponent = isHome ? game.away_team : game.home_team;
                const myScore = isHome ? game.home_score : game.away_score;
                const oppScore = isHome ? game.away_score : game.home_score;
                const won = myScore > oppScore;
                const lost = myScore < oppScore;
                const verified = game.home_captain_verified && game.away_captain_verified;

                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={isHome ? "default" : "outline"}>
                          {isHome ? "HOME" : "AWAY"}
                        </Badge>
                        <span className="font-semibold">vs {opponent.name}</span>
                        <Badge variant={won ? "default" : lost ? "destructive" : "outline"}>
                          {myScore}-{oppScore}
                        </Badge>
                        {!verified && (
                          <Badge variant="outline" className="text-yellow-600">
                            Pending Verification
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(game.scheduled_at).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <Link href={`/schedule`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                        View →
                      </Badge>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link to Full Schedule */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              View full league schedule
            </p>
            <Link href="/schedule">
              <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                View Full Schedule →
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
