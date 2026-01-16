"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getPlayerStats } from "@/lib/stats/queries";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";

export default function DashboardPage() {
  const { user, profile, loading: authLoading, error: authError } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [nextGame, setNextGame] = useState<any>(null);
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
          supabase
            .from("team_rosters")
            .select("team_id")
            .eq("player_id", user?.id)
            .eq("season_id", activeSeason.id)
            .single()
            .catch(err => {
              console.error("Roster query error:", err);
              return { data: null, error: err };
            })
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
                  vs {nextGame.home_team?.name || nextGame.away_team?.name}
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
