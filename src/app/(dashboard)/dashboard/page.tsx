"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getPlayerStats } from "@/lib/stats/queries";
import { getUpcomingGameForCheckIn, checkInToGame } from "@/lib/players/availability-actions";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { toast } from "sonner";

export default function DashboardPage() {
  const { user, profile, loading: authLoading, error: authError } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [nextGame, setNextGame] = useState<any>(null);
  const [checkInData, setCheckInData] = useState<any>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // If no user, stop loading
    if (!user) {
      setLoading(false);
      return;
    }

    // If we have a user, load dashboard data
    // Don't wait for profile - it's not critical for basic dashboard
    if (user) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  async function loadDashboardData() {
    const supabase = createClient();

    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 30000) // 30 second timeout
      );

      const dataPromise = (async () => {
        // Get active season first (needed for other queries)
        const { data: activeSeason, error: seasonError } = await supabase
          .from("seasons")
          .select("id, name, status")
          .in("status", ["active", "playoffs"])
          .order("start_date", { ascending: false })
          .limit(1)
          .single();

        if (seasonError || !activeSeason) {
          console.warn("No active season found:", seasonError);
          setLoading(false);
          return;
        }

        // Run stats and roster queries in parallel with timeout
        const [statsResult, rosterResult] = await Promise.all([
          getPlayerStats(user?.id || "", activeSeason.id).catch(err => {
            console.error("Stats query error:", err);
            return { error: err.message, stats: [], totals: null };
          }),
          (async () => {
            try {
              const result = await supabase
                .from("team_rosters")
                .select("team_id")
                .eq("player_id", user?.id)
                .eq("season_id", activeSeason.id)
                .single();
              return result;
            } catch (err) {
              console.error("Roster query error:", err);
              return { data: null, error: err };
            }
          })()
        ]);

        if (statsResult?.totals) {
          setStats(statsResult.totals);
        } else if (statsResult?.error) {
          console.error("Failed to load stats:", statsResult.error);
          // Set empty stats so page still renders
          setStats({ games: 0, goals: 0, assists: 0, points: 0 });
        }

        // If player has a team, get next game
        if (rosterResult.data) {
          const now = new Date().toISOString();
          const { data: nextGameData, error: gameError } = await supabase
            .from("games")
            .select(`
              id,
              scheduled_at,
              location,
              home_team:teams!games_home_team_id_fkey(name, short_name),
              away_team:teams!games_away_team_id_fkey(name, short_name)
            `)
            .eq("season_id", activeSeason.id)
            .or(`home_team_id.eq.${rosterResult.data.team_id},away_team_id.eq.${rosterResult.data.team_id}`)
            .gte("scheduled_at", now)
            .in("status", ["scheduled", "in_progress"])
            .order("scheduled_at", { ascending: true })
            .limit(1)
            .single();

          if (!gameError && nextGameData) {
            setNextGame(nextGameData);
          }
        }

        // Get check-in data for upcoming game
        const checkIn = await getUpcomingGameForCheckIn();
        setCheckInData(checkIn);
      })();

      // Race between data loading and timeout
      await Promise.race([dataPromise, timeoutPromise]);
    } catch (error: any) {
      console.error("Dashboard data error:", error);
      setError(error.message || "Failed to load dashboard data");
      // Set empty stats so page still renders even on error
      setStats({ games: 0, goals: 0, assists: 0, points: 0 });
    } finally {
      // Always set loading to false, even on error or timeout
      setLoading(false);
    }
  }

  // Show error if auth failed
  if (authError) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {authError}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-canada-red text-white rounded-md hover:bg-canada-red-dark"
            >
              Refresh Page
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const playerRating = stats?.games_played >= 5 ? "A" : stats?.games_played >= 3 ? "B" : stats?.games_played >= 1 ? "C" : "D";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {profile?.full_name?.split(" ")[0] || "Player"}! 🏒
        </h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s what&apos;s happening in the league.
        </p>
        {error && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ {error}. Some data may not be available.
            </p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your Goals</CardDescription>
            <CardTitle className="text-3xl text-gold">{stats?.goals || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats?.games_played > 0 
                ? `${(stats.goals / stats.games_played).toFixed(2)} per game`
                : "No games played"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your Assists</CardDescription>
            <CardTitle className="text-3xl text-gold">{stats?.assists || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats?.games_played > 0 
                ? `${(stats.assists / stats.games_played).toFixed(2)} per game`
                : "No games played"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Games Played</CardDescription>
            <CardTitle className="text-3xl">{stats?.games_played || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats?.points || 0} total points
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your Rating</CardDescription>
            <CardTitle className="text-3xl">
              <span className={`rating-${playerRating.toLowerCase()} px-3 py-1 rounded-full text-xl`}>
                {stats?.games_played > 0 ? playerRating : "-"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats?.games_played > 0 
                ? "Based on performance"
                : "Play to earn a rating"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>Your player information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{profile?.full_name || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jersey Number</p>
              <p className="font-medium jersey-number text-xl">
                #{profile?.jersey_number ?? "--"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Position</p>
              <p className="font-medium">{profile?.position || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{profile?.role || "Player"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Check-In Card */}
      {checkInData?.game && (
        <GameCheckInCard 
          checkInData={checkInData}
          isCheckingIn={isCheckingIn}
          onCheckIn={async (status) => {
            setIsCheckingIn(true);
            try {
              const result = await checkInToGame(checkInData.game.id, status);
              if (result.error) {
                toast.error(result.error);
              } else {
                toast.success(`Checked in as ${status}!`);
                // Refresh check-in data
                const newCheckIn = await getUpcomingGameForCheckIn();
                setCheckInData(newCheckIn);
              }
            } catch (err: any) {
              toast.error(err.message || "Failed to check in");
            } finally {
              setIsCheckingIn(false);
            }
          }}
        />
      )}

      {/* Next Game */}
      {nextGame ? (
        <Card>
          <CardHeader>
            <CardTitle>Next Game</CardTitle>
            <CardDescription>Your upcoming game</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg mb-1">
                  {nextGame.home_team?.name || "Home"} vs {nextGame.away_team?.name || "Away"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(nextGame.scheduled_at).toLocaleDateString("en-CA", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(nextGame.scheduled_at).toLocaleTimeString("en-CA", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {nextGame.location && (
                  <p className="text-sm text-muted-foreground mt-1">
                    📍 {nextGame.location}
                  </p>
                )}
              </div>
              <Link href="/dashboard/schedule">
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  View Schedule →
                </Badge>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Next Game</CardTitle>
            <CardDescription>Your upcoming match</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-4xl mb-4">📅</p>
              <p>No upcoming games scheduled.</p>
              <p className="text-sm">Check back once the season starts!</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates from the league</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentActivityFeed userId={user?.id || ""} />
        </CardContent>
      </Card>
    </div>
  );
}

// Game Check-In Card Component
function GameCheckInCard({ 
  checkInData, 
  isCheckingIn, 
  onCheckIn 
}: { 
  checkInData: any;
  isCheckingIn: boolean;
  onCheckIn: (status: "available" | "unavailable" | "maybe") => Promise<void>;
}) {
  const { game, availability, canCheckIn, isCallUp } = checkInData;
  
  if (!game) return null;

  const gameDate = new Date(game.scheduled_at);
  const isToday = gameDate.toDateString() === new Date().toDateString();
  const isTomorrow = gameDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
  
  const opponent = game.home_team?.name !== checkInData.teamId 
    ? game.home_team 
    : game.away_team;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-600">✓ Playing</Badge>;
      case "unavailable":
        return <Badge variant="destructive">✗ Not Playing</Badge>;
      case "maybe":
        return <Badge className="bg-yellow-600">? Maybe</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className={`border-2 ${isToday ? "border-canada-red animate-pulse-slow" : isTomorrow ? "border-rink-blue" : "border-border"}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🏒 Game Check-In
              {isToday && <Badge className="bg-canada-red">TODAY</Badge>}
              {isTomorrow && <Badge className="bg-rink-blue">TOMORROW</Badge>}
            </CardTitle>
            <CardDescription>
              Let your captain know if you can make it
            </CardDescription>
          </div>
          {availability?.status && getStatusBadge(availability.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Game Info */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {gameDate.toLocaleDateString("en-CA", { weekday: "short" })}
              </p>
              <p className="text-3xl font-bold text-canada-red">
                {gameDate.getDate()}
              </p>
              <p className="text-sm text-muted-foreground">
                {gameDate.toLocaleDateString("en-CA", { month: "short" })}
              </p>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">
                {game.home_team?.name || "Home"} vs {game.away_team?.name || "Away"}
              </p>
              <p className="text-sm text-muted-foreground">
                {gameDate.toLocaleTimeString("en-CA", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              {game.location && (
                <p className="text-sm text-muted-foreground">
                  📍 {game.location}
                </p>
              )}
            </div>
          </div>

          {/* Call-up Notice */}
          {isCallUp && !canCheckIn && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⏳ As a call-up player, you can check in once a team captain requests subs for this game.
              </p>
            </div>
          )}

          {/* Already Checked In */}
          {availability?.checked_in_at && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Checked in {new Date(availability.checked_in_at).toLocaleDateString("en-CA", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          {/* Check-In Buttons */}
          {canCheckIn && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => onCheckIn("available")}
                disabled={isCheckingIn}
                className={`flex-1 ${availability?.status === "available" ? "bg-green-600 hover:bg-green-700" : "bg-green-600/80 hover:bg-green-600"}`}
              >
                {isCheckingIn ? "..." : "✓ I'm In"}
              </Button>
              <Button
                onClick={() => onCheckIn("maybe")}
                disabled={isCheckingIn}
                variant="outline"
                className={`flex-1 ${availability?.status === "maybe" ? "border-yellow-500 bg-yellow-500/20" : ""}`}
              >
                {isCheckingIn ? "..." : "? Maybe"}
              </Button>
              <Button
                onClick={() => onCheckIn("unavailable")}
                disabled={isCheckingIn}
                variant="outline"
                className={`flex-1 ${availability?.status === "unavailable" ? "border-red-500 bg-red-500/20" : ""}`}
              >
                {isCheckingIn ? "..." : "✗ Can't Make It"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
