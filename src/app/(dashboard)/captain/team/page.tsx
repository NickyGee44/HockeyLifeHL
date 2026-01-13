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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getTeamRoster, getPlayersNotOnTeam, addPlayerToRoster, removePlayerFromRoster, updatePlayerGoalieStatus } from "@/lib/teams/roster-actions";
import { toast } from "sonner";

type TeamData = {
  id: string;
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
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
    email: string | null;
  };
};

type SeasonData = {
  id: string;
  name: string;
  status: string;
};

export default function CaptainTeamPage() {
  const { user, loading: authLoading, isCaptain } = useAuth();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("none");
  const [isGoalie, setIsGoalie] = useState(false);

  useEffect(() => {
    if (user && isCaptain) {
      loadTeamData();
    } else if (!authLoading && !isCaptain) {
      setLoading(false);
    }
  }, [user, isCaptain, authLoading]);

  async function loadTeamData() {
    const supabase = createClient();

    // Get team where user is captain
    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name, short_name, primary_color, secondary_color")
      .eq("captain_id", user?.id)
      .single();

    if (!teamData) {
      setLoading(false);
      return;
    }

    setTeam(teamData);

    // Get active season
    const { data: seasonData } = await supabase
      .from("seasons")
      .select("id, name, status")
      .in("status", ["active", "playoffs"])
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (!seasonData) {
      setLoading(false);
      return;
    }

    setSeason(seasonData);

    // Load roster
    const rosterResult = await getTeamRoster(teamData.id, seasonData.id);
    if (rosterResult.roster) {
      setRoster(rosterResult.roster as RosterPlayer[]);
    }

    // Load available players
    const playersResult = await getPlayersNotOnTeam(teamData.id, seasonData.id);
    if (playersResult.players) {
      setAvailablePlayers(playersResult.players);
    }

    setLoading(false);
  }

  async function handleAddPlayer() {
    if (!team || !season || selectedPlayerId === "none") {
      toast.error("Please select a player");
      return;
    }

    const result = await addPlayerToRoster(team.id, selectedPlayerId, season.id, isGoalie);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Player added to roster");
      setIsAddOpen(false);
      setSelectedPlayerId("none");
      setIsGoalie(false);
      loadTeamData();
    }
  }

  async function handleRemovePlayer(playerId: string) {
    if (!team || !season) return;
    if (!confirm("Are you sure you want to remove this player from your roster?")) return;

    const result = await removePlayerFromRoster(team.id, playerId, season.id);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Player removed from roster");
      loadTeamData();
    }
  }

  async function handleToggleGoalie(playerId: string, currentStatus: boolean) {
    if (!team || !season) return;

    const result = await updatePlayerGoalieStatus(team.id, playerId, season.id, !currentStatus);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Player marked as ${!currentStatus ? "goalie" : "player"}`);
      loadTeamData();
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-2xl shadow-lg"
            style={{ 
              backgroundColor: team.primary_color,
              color: team.secondary_color,
            }}
          >
            {team.short_name}
          </div>
          <div>
            <Link href={`/teams/${team.id}`}>
              <h1 className="text-3xl font-bold hover:underline cursor-pointer">{team.name}</h1>
            </Link>
            <p className="text-muted-foreground">
              Team Management {season && `• ${season.name}`}
            </p>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-canada-red hover:bg-canada-red-dark">
              + Add Player
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Player to Roster</DialogTitle>
              <DialogDescription>
                Add a player to your team for {season?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Player</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a player</SelectItem>
                    {availablePlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name || player.email} {player.jersey_number ? `#${player.jersey_number}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isGoalie"
                  checked={isGoalie}
                  onChange={(e) => setIsGoalie(e.target.checked)}
                />
                <Label htmlFor="isGoalie">Mark as goalie</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddPlayer} className="bg-canada-red hover:bg-canada-red-dark">
                Add Player
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roster Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Players</CardDescription>
            <CardTitle className="text-3xl">{roster.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Goalies</CardDescription>
            <CardTitle className="text-3xl">{roster.filter(r => r.is_goalie).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Regular Players</CardDescription>
            <CardTitle className="text-3xl">{roster.filter(r => !r.is_goalie).length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Roster Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Roster</CardTitle>
          <CardDescription>
            Manage your team roster for {season?.name || "current season"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No players on your roster yet. Add players to get started.
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
                    <TableHead className="text-right">Actions</TableHead>
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
                            <p className="font-medium">
                              {rosterEntry.player.full_name || "Unknown"}
                            </p>
                            {rosterEntry.player.email && (
                              <p className="text-xs text-muted-foreground">
                                {rosterEntry.player.email}
                              </p>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleGoalie(rosterEntry.player.id, rosterEntry.is_goalie)}
                        >
                          {rosterEntry.is_goalie ? "Goalie" : "Player"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemovePlayer(rosterEntry.player.id)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Only players not on another team for this season can be added. 
            Contact the league owner to move players between teams.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
