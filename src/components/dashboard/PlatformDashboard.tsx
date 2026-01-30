"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Users, Calendar, Shield } from "lucide-react";
import Link from "next/link";

interface LeagueMembership {
  id: string;
  league_id: string;
  role: string;
  status: string;
  league: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string;
    subdomain: string | null;
  };
}

interface UserStats {
  totalLeagues: number;
  totalGamesPlayed: number;
  totalGoals: number;
  totalAssists: number;
  leaguesAsOwner: number;
  leaguesAsAdmin: number;
}

/**
 * Platform Dashboard Component
 *
 * Displays cross-league overview for users on the platform domain
 * Shows all leagues the user is a member of and aggregate stats
 */
export function PlatformDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<LeagueMembership[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadPlatformData();
  }, [user, authLoading]);

  async function loadPlatformData() {
    if (!user) return;

    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch user's league memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from("league_memberships")
        .select(`
          id,
          league_id,
          role,
          status,
          league:leagues (
            id,
            name,
            slug,
            logo_url,
            primary_color,
            subdomain
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (membershipError) throw membershipError;

      setMemberships(membershipData || []);

      // Calculate aggregate stats across all leagues
      const leagueIds = (membershipData || []).map(m => m.league_id);

      if (leagueIds.length > 0) {
        // Get total games played
        const { data: gamesData } = await supabase
          .from("player_stats")
          .select("game_id", { count: "exact", head: true })
          .eq("player_id", user.id)
          .in("league_id", leagueIds);

        // Get total goals and assists
        const { data: statsData } = await supabase
          .from("player_stats")
          .select("goals, assists")
          .eq("player_id", user.id)
          .in("league_id", leagueIds);

        const totalGoals = statsData?.reduce((sum, s) => sum + (s.goals || 0), 0) || 0;
        const totalAssists = statsData?.reduce((sum, s) => sum + (s.assists || 0), 0) || 0;

        const leaguesAsOwner = membershipData?.filter(m => m.role === "owner").length || 0;
        const leaguesAsAdmin = membershipData?.filter(m => m.role === "admin").length || 0;

        setStats({
          totalLeagues: leagueIds.length,
          totalGamesPlayed: gamesData?.length || 0,
          totalGoals,
          totalAssists,
          leaguesAsOwner,
          leaguesAsAdmin,
        });
      }
    } catch (error) {
      console.error("[PlatformDashboard] Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Please log in to view your dashboard</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          Welcome back, {profile?.full_name || user.email}!
        </h1>
        <p className="text-muted-foreground">
          Manage your leagues and view your cross-league stats
        </p>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Leagues</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeagues}</div>
              <p className="text-xs text-muted-foreground">
                {stats.leaguesAsOwner > 0 && `${stats.leaguesAsOwner} as owner`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Games Played</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGamesPlayed}</div>
              <p className="text-xs text-muted-foreground">Across all leagues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGoals}</div>
              <p className="text-xs text-muted-foreground">Career total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assists</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssists}</div>
              <p className="text-xs text-muted-foreground">Career total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* My Leagues */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Leagues</CardTitle>
              <CardDescription>
                Select a league to view its dashboard or create a new one
              </CardDescription>
            </div>
            <Link href="/admin/leagues/create">
              <Button>Create League</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">
                You're not a member of any leagues yet
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/discover">
                  <Button variant="outline">Browse Leagues</Button>
                </Link>
                <Link href="/admin/leagues/create">
                  <Button>Create a League</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {memberships.map((membership) => (
                <Card key={membership.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div
                    className="h-2"
                    style={{ backgroundColor: membership.league.primary_color }}
                  />
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{membership.league.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {membership.league.subdomain}.beerleaguehockey.ca
                          </p>
                        </div>
                        {(membership.role === "owner" || membership.role === "admin") && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {membership.role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`https://${membership.league.subdomain}.beerleaguehockey.ca/dashboard`}
                          className="flex-1"
                        >
                          <Button size="sm" className="w-full" variant="outline">
                            View Dashboard
                          </Button>
                        </Link>
                        {(membership.role === "owner" || membership.role === "admin") && (
                          <Link href={`/admin/leagues/${membership.league_id}`}>
                            <Button size="sm" variant="ghost">
                              Manage
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/discover">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Browse Leagues
              </Button>
            </Link>
            <Link href="/dashboard/profile">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
            <Link href="/dashboard/profile/sessions">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Sessions
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
