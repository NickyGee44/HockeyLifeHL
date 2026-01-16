"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamLogo } from "@/components/ui/team-logo";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getPendingVerificationsCount, getTeamStatsSummary } from "@/lib/captain/stats-queries";

type TeamData = {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

type RosterPlayer = {
  id: string;
  is_goalie: boolean;
  player: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    jersey_number: number | null;
    position: string | null;
  };
};

type SeasonData = {
  id: string;
  name: string;
  status: string | null;
};

export default function CaptainDashboardPage() {
  const { user, profile, loading: authLoading, isCaptain } = useAuth();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [pendingStats, setPendingStats] = useState<number>(0);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // If no user, stop loading
    if (!user) {
      setLoading(false);
      return;
    }

    // If profile is still loading, wait
    if (!profile && !authLoading) {
      // Profile might be loading, give it a moment
      return;
    }

    // Check if user is captain
    if (user && isCaptain) {
      loadCaptainData();
    } else if (!authLoading) {
      // Not a captain or profile failed to load
      setLoading(false);
    }
  }, [user, profile, isCaptain, authLoading]);

  async function loadCaptainData() {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    const supabase = createClient();
    
    try {
      // Get team and season in parallel
      const [teamResult, seasonResult] = await Promise.all([
        supabase
          .from("teams")
          .select("id, name, short_name, logo_url, primary_color, secondary_color")
          .eq("captain_id", user.id)
          .single(),
        supabase
          .from("seasons")
          .select("id, name, status")
          .in("status", ["active", "playoffs"])
          .order("start_date", { ascending: false })
          .limit(1)
          .single()
      ]);

      const teamData = teamResult.data;
      const seasonData = seasonResult.data;

      if (!teamData) {
        setLoading(false);
        return;
      }

      setTeam(teamData);
      setSeason(seasonData);

      // Get roster, pending stats, and team stats in parallel
      if (seasonData) {
        const [rosterResult, pendingResult, statsResult] = await Promise.all([
          supabase
            .from("team_rosters")
            .select(`
              id,
              is_goalie,
              player:profiles!team_rosters_player_id_fkey(id, full_name, avatar_url, jersey_number, position)
            `)
            .eq("team_id", teamData.id)
            .eq("season_id", seasonData.id),
          getPendingVerificationsCount(teamData.id, seasonData.id),
          getTeamStatsSummary(teamData.id, seasonData.id)
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRoster((rosterResult.data || []) as any as RosterPlayer[]);
        setPendingStats(pendingResult.count);
        setTeamStats(statsResult);
      }
    } catch (error) {
      console.error("Captain data error:", error);
    }

    setLoading(false);
  }

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!isCaptain) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You are not currently a team captain.
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              You haven&apos;t been assigned to a team yet. Contact the league owner.
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort roster: goalies first, then by jersey number
  const sortedRoster = [...roster].sort((a, b) => {
    if (a.is_goalie && !b.is_goalie) return -1;
    if (!a.is_goalie && b.is_goalie) return 1;
    const aNum = a.player.jersey_number ?? 999;
    const bNum = b.player.jersey_number ?? 999;
    return aNum - bNum;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <TeamLogo team={team} size="xl" />
        <div>
          <Link href={`/teams/${team.id}`}>
            <h1 className="text-3xl font-bold hover:underline cursor-pointer">{team.name}</h1>
          </Link>
          <p className="text-muted-foreground">
            Captain&apos;s Dashboard
            {season && <span className="ml-2">• {season.name}</span>}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Roster Size</CardDescription>
            <CardTitle className="text-3xl">{roster.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {roster.filter(r => r.is_goalie).length} goalies
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Season Status</CardDescription>
            <CardTitle className="text-xl">
              {season?.status === "playoffs" ? (
                <Badge className="bg-gold text-puck-black">🏆 Playoffs</Badge>
              ) : season?.status === "active" ? (
                <Badge className="bg-green-600">🏒 Active</Badge>
              ) : (
                <Badge variant="outline">No Season</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {season?.name || "No active season"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Stats</CardDescription>
            <CardTitle className="text-3xl text-yellow-500">{pendingStats}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Games to verify</p>
          </CardContent>
        </Card>
        {teamStats && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Team Record</CardDescription>
              <CardTitle className="text-xl">
                {teamStats.wins}-{teamStats.losses}-{teamStats.ties}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {teamStats.points} points • {teamStats.goalsFor} GF / {teamStats.goalsAgainst} GA
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team Page</CardDescription>
            <CardTitle className="text-lg">
              <Link href={`/teams/${team.id}`} className="text-canada-red hover:underline">
                View Public Page →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">See how fans see your team</p>
          </CardContent>
        </Card>
      </div>

      {/* Captain Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Captain Actions</CardTitle>
          <CardDescription>Manage your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button className="h-auto py-4 flex-col gap-2 bg-canada-red hover:bg-canada-red-dark" asChild>
              <Link href="/captain/stats">
                <span className="text-2xl">✏️</span>
                <span>Enter Game Stats</span>
              </Link>
            </Button>
            <Button className="h-auto py-4 flex-col gap-2" variant="outline" asChild>
              <Link href="/captain/stats">
                <span className="text-2xl">✓</span>
                <span>Verify Stats</span>
              </Link>
            </Button>
            <Button className="h-auto py-4 flex-col gap-2" variant="outline" asChild>
              <Link href={`/teams/${team.id}`}>
                <span className="text-2xl">👥</span>
                <span>View Full Roster</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Roster */}
      <Card>
        <CardHeader>
          <CardTitle>Your Roster</CardTitle>
          <CardDescription>
            {season?.name || "Current"} season roster
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No players on your roster yet. Contact the league owner to add players.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRoster.map((rosterEntry) => (
                    <TableRow key={rosterEntry.id}>
                      <TableCell className="font-mono font-bold">
                        {rosterEntry.player.jersey_number ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/stats/${rosterEntry.player.id}`}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={rosterEntry.player.avatar_url || ""} />
                            <AvatarFallback 
                              className="text-xs"
                              style={{ backgroundColor: team.primary_color || "#3b82f6", color: team.secondary_color || "#ffffff" }}
                            >
                              {getInitials(rosterEntry.player.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {rosterEntry.player.full_name || "Unknown"}
                          </span>
                          {rosterEntry.player.id === user?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {rosterEntry.is_goalie ? (
                          <Badge className="bg-rink-blue">G</Badge>
                        ) : rosterEntry.player.position ? (
                          <Badge variant="secondary">{rosterEntry.player.position}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
