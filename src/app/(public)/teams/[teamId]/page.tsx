// @ts-nocheck
import Link from "next/link";
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
import { TeamLogo } from "@/components/ui/team-logo";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ teamId: string }>;
};

async function getTeamData(teamId: string) {
  const supabase = await createClient();
  
  // Get team with captain
  const { data: team, error } = await supabase
    .from("teams")
    .select(`
      *,
      captain:profiles!teams_captain_id_fkey(id, full_name, avatar_url, jersey_number, position, email)
    `)
    .eq("id", teamId)
    .single();

  if (error || !team) {
    return { team: null, roster: [], activeSeason: null };
  }

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name, status")
    .in("status", ["active", "playoffs"])
    .order("start_date", { ascending: false })
    .limit(1)
    .single();

  // Get roster for active season
  let roster: Array<{
    id: string;
    is_goalie: boolean;
    player: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      jersey_number: number | null;
      position: string | null;
    };
  }> = [];

  if (activeSeason) {
    const { data: rosterData } = await supabase
      .from("team_rosters")
      .select(`
        id,
        is_goalie,
        player:profiles!team_rosters_player_id_fkey(id, full_name, avatar_url, jersey_number, position)
      `)
      .eq("team_id", teamId)
      .eq("season_id", activeSeason.id);

    roster = (rosterData || []) as typeof roster;
  }

  return { team, roster, activeSeason };
}

export default async function TeamDetailPage({ params }: Props) {
  const { teamId } = await params;
  const { team, roster, activeSeason } = await getTeamData(teamId);

  if (!team) {
    notFound();
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

  const getPositionBadge = (position: string | null, isGoalie: boolean) => {
    if (isGoalie) return <Badge className="bg-rink-blue">G</Badge>;
    if (!position) return null;
    
    const colors: Record<string, string> = {
      C: "bg-canada-red",
      LW: "bg-green-600",
      RW: "bg-green-600",
      D: "bg-gold text-puck-black",
      G: "bg-rink-blue",
    };
    
    return <Badge className={colors[position] || ""}>{position}</Badge>;
  };

  // Sort roster: captain first, then goalies, then by jersey number
  const sortedRoster = [...roster].sort((a, b) => {
    // Captain first
    if (a.player.id === team.captain_id) return -1;
    if (b.player.id === team.captain_id) return 1;
    // Goalies next
    if (a.is_goalie && !b.is_goalie) return -1;
    if (!a.is_goalie && b.is_goalie) return 1;
    // Then by jersey number
    const aNum = a.player.jersey_number ?? 999;
    const bNum = b.player.jersey_number ?? 999;
    return aNum - bNum;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Link */}
      <Link href="/teams" className="text-muted-foreground hover:text-foreground mb-6 inline-block">
        ← Back to Teams
      </Link>

      {/* Team Header */}
      <Card className="overflow-hidden mb-8">
        <div 
          className="h-4"
          style={{ backgroundColor: team.primary_color }}
        />
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <TeamLogo 
              team={team} 
              size="xl" 
              clickable={false} 
              className="w-24 h-24 rounded-xl shadow-lg text-3xl"
            />
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{team.name}</CardTitle>
              <CardDescription className="text-base">
                {activeSeason ? (
                  <span>{activeSeason.name} Season</span>
                ) : (
                  <span>No active season</span>
                )}
              </CardDescription>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline">{roster.length} Players</Badge>
                <Badge variant="outline">{roster.filter(r => r.is_goalie).length} Goalies</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Captain Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Captain</CardTitle>
            </CardHeader>
            <CardContent>
              {team.captain ? (
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
                    <div className="flex items-center gap-2 mt-1">
                      {team.captain.jersey_number !== null && (
                        <Badge variant="outline" className="font-mono">
                          #{team.captain.jersey_number}
                        </Badge>
                      )}
                      {team.captain.position && (
                        <Badge variant="secondary">{team.captain.position}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No captain assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Team Colors */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Team Colors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="text-center">
                  <div 
                    className="w-12 h-12 rounded-lg border shadow-sm"
                    style={{ backgroundColor: team.primary_color }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Primary</p>
                </div>
                <div className="text-center">
                  <div 
                    className="w-12 h-12 rounded-lg border shadow-sm"
                    style={{ backgroundColor: team.secondary_color }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Secondary</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roster Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Current Roster</CardTitle>
              <CardDescription>
                {activeSeason?.name || "No active season"} roster
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
                              <span className="font-medium">
                                {rosterEntry.player.full_name || "Unknown"}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            {getPositionBadge(rosterEntry.player.position, rosterEntry.is_goalie)}
                          </TableCell>
                          <TableCell>
                            {rosterEntry.player.id === team.captain_id && (
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
      </div>
    </div>
  );
}
