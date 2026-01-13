"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

type TeamData = {
  id: string;
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
  captain: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    jersey_number: number | null;
  } | null;
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
  status: string;
};

export default function MyTeamPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTeamData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  async function loadTeamData() {
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
      .select(`
        team_id,
        team:teams!team_rosters_team_id_fkey(
          id,
          name,
          short_name,
          primary_color,
          secondary_color,
          captain:profiles!teams_captain_id_fkey(id, full_name, avatar_url, jersey_number)
        )
      `)
      .eq("player_id", user?.id)
      .eq("season_id", activeSeason.id)
      .single();

    if (!rosterEntry || !rosterEntry.team) {
      setLoading(false);
      return;
    }

    setTeam(rosterEntry.team as TeamData);

    // Get full roster
    const { data: rosterData } = await supabase
      .from("team_rosters")
      .select(`
        id,
        is_goalie,
        player:profiles!team_rosters_player_id_fkey(id, full_name, avatar_url, jersey_number, position)
      `)
      .eq("team_id", rosterEntry.team_id)
      .eq("season_id", activeSeason.id);

    setRoster((rosterData || []) as RosterPlayer[]);
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">My Team</h1>
          <p className="text-muted-foreground mt-2">
            Your team information
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

  // Sort roster: captain first, then goalies, then by jersey number
  const sortedRoster = [...roster].sort((a, b) => {
    if (a.player.id === team.captain?.id) return -1;
    if (b.player.id === team.captain?.id) return 1;
    if (a.is_goalie && !b.is_goalie) return -1;
    if (!a.is_goalie && b.is_goalie) return 1;
    const aNum = a.player.jersey_number ?? 999;
    const bNum = b.player.jersey_number ?? 999;
    return aNum - bNum;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Team</h1>
        <p className="text-muted-foreground mt-2">
          {season?.name} Season
        </p>
      </div>

      {/* Team Header */}
      <Card className="overflow-hidden">
        <div 
          className="h-4"
          style={{ backgroundColor: team.primary_color }}
        />
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div 
              className="w-24 h-24 rounded-xl flex items-center justify-center font-bold text-3xl shadow-lg"
              style={{ 
                backgroundColor: team.primary_color,
                color: team.secondary_color,
              }}
            >
              {team.short_name}
            </div>
            <div className="flex-1">
              <Link href={`/teams/${team.id}`}>
                <CardTitle className="text-3xl mb-2 hover:underline cursor-pointer">{team.name}</CardTitle>
              </Link>
              <CardDescription className="text-base">
                {season?.name} Season
              </CardDescription>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline">{roster.length} Players</Badge>
                <Badge variant="outline">{roster.filter(r => r.is_goalie).length} Goalies</Badge>
                <Link href={`/teams/${team.id}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                    View Public Page →
                  </Badge>
                </Link>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Captain Info */}
      {team.captain && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Captain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={team.captain.avatar_url || ""} />
                <AvatarFallback 
                  className="text-xl"
                  style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
                >
                  {getInitials(team.captain.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Link 
                  href={`/stats/${team.captain.id}`}
                  className="font-semibold text-lg hover:underline"
                >
                  {team.captain.full_name}
                </Link>
                {team.captain.jersey_number !== null && (
                  <Badge variant="outline" className="font-mono mt-1">
                    #{team.captain.jersey_number}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roster */}
      <Card>
        <CardHeader>
          <CardTitle>Team Roster</CardTitle>
          <CardDescription>
            {season?.name} season roster
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No players on roster yet
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Role</TableHead>
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
                              style={{ backgroundColor: team.primary_color, color: team.secondary_color }}
                            >
                              {getInitials(rosterEntry.player.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">
                              {rosterEntry.player.full_name || "Unknown"}
                            </span>
                            {rosterEntry.player.id === user?.id && (
                              <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                            )}
                          </div>
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
                      <TableCell>
                        {rosterEntry.player.id === team.captain?.id && (
                          <Badge className="bg-gold text-puck-black">Captain</Badge>
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
