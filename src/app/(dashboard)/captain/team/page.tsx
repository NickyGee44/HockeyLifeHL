"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { 
  getRosterWithPlayerStats, 
  getPlayersNotOnTeam, 
  addPlayerToRoster, 
  removePlayerFromRoster, 
  updatePlayerGoalieStatus,
  sendTeamInvite,
  getTeamInvites,
  cancelTeamInvite,
  suspendPlayer,
  endSuspension,
} from "@/lib/teams/roster-actions";
import { updateTeamLogo, deleteTeamLogo } from "@/lib/teams/actions";
import { toast } from "sonner";
import { Upload, Trash2, Camera, Mail, UserPlus, Ban, Clock, AlertTriangle, X, Send } from "lucide-react";

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
    shot_hand: "left" | "right" | null;
    email: string | null;
  };
  stats: {
    goals: number;
    assists: number;
    points: number;
    gamesPlayed: number;
    attendanceRate: number;
  };
  goalieStats: {
    saves: number;
    goalsAgainst: number;
    gamesPlayed: number;
  } | null;
  suspension: {
    reason: string;
    gamesRemaining: number;
  } | null;
};

type SeasonData = {
  id: string;
  name: string;
  status: string | null;
};

type TeamInvite = {
  id: string;
  email: string;
  invite_type: string;
  status: string;
  message: string | null;
  expires_at: string;
  created_at: string;
  inviter: { full_name: string | null } | null;
};

export default function CaptainTeamPage() {
  const { user, loading: authLoading, isCaptain } = useAuth();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [totalTeamGames, setTotalTeamGames] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isLogoDialogOpen, setIsLogoDialogOpen] = useState(false);
  
  // Form states
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("none");
  const [isGoalie, setIsGoalie] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteType, setInviteType] = useState<"full_time" | "sub">("sub");
  const [inviteMessage, setInviteMessage] = useState("");
  const [suspendPlayerId, setSuspendPlayerId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendGames, setSuspendGames] = useState(1);
  
  // Loading states
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && isCaptain) {
      loadTeamData();
    } else if (!authLoading && !isCaptain) {
      setLoading(false);
    }
  }, [user, isCaptain, authLoading]);

  async function loadTeamData() {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    const supabase = createClient();

    // Get team where user is captain
    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name, short_name, logo_url, primary_color, secondary_color")
      .eq("captain_id", user.id)
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

    // Load roster with stats, available players, and invites in parallel
    const [rosterResult, playersResult, invitesResult] = await Promise.all([
      getRosterWithPlayerStats(teamData.id, seasonData.id),
      getPlayersNotOnTeam(teamData.id, seasonData.id),
      getTeamInvites(teamData.id, seasonData.id),
    ]);

    if (rosterResult.roster) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRoster(rosterResult.roster as any as RosterPlayer[]);
      setTotalTeamGames(rosterResult.totalTeamGames || 0);
    }

    if (playersResult.players) {
      setAvailablePlayers(playersResult.players);
    }

    if (invitesResult.invites) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setInvites(invitesResult.invites as any as TeamInvite[]);
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

  async function handleSendInvite() {
    if (!team || !season || !inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSendingInvite(true);
    const result = await sendTeamInvite(
      team.id,
      season.id,
      inviteEmail.trim(),
      inviteType,
      inviteMessage.trim() || undefined
    );
    setIsSendingInvite(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Invite sent to ${inviteEmail}`);
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteType("sub");
      setInviteMessage("");
      loadTeamData();
    }
  }

  async function handleCancelInvite(inviteId: string) {
    if (!confirm("Cancel this invite?")) return;

    const result = await cancelTeamInvite(inviteId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Invite cancelled");
      loadTeamData();
    }
  }

  async function handleSuspendPlayer() {
    if (!team || !suspendPlayerId || !suspendReason.trim()) {
      toast.error("Please provide a reason for the suspension");
      return;
    }

    setIsSuspending(true);
    const result = await suspendPlayer(
      team.id,
      suspendPlayerId,
      suspendReason.trim(),
      suspendGames
    );
    setIsSuspending(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Player suspended");
      setIsSuspendOpen(false);
      setSuspendPlayerId(null);
      setSuspendReason("");
      setSuspendGames(1);
      loadTeamData();
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !team) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, GIF, WebP, or SVG)");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploadingLogo(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${team.id}-${Date.now()}.${fileExt}`;
      const filePath = `team-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("public").getPublicUrl(filePath);
      const result = await updateTeamLogo(team.id, publicUrl);
      
      if (result.error) throw new Error(result.error);

      toast.success("Team logo updated successfully!");
      setIsLogoDialogOpen(false);
      loadTeamData();
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteLogo() {
    if (!team) return;
    if (!confirm("Are you sure you want to remove the team logo?")) return;

    setIsUploadingLogo(true);
    try {
      const result = await deleteTeamLogo(team.id);
      if (result.error) throw new Error(result.error);
      toast.success("Team logo removed successfully!");
      setIsLogoDialogOpen(false);
      loadTeamData();
    } catch (error: any) {
      console.error("Error deleting logo:", error);
      toast.error(error.message || "Failed to remove logo");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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
            <p className="text-muted-foreground mb-4">You are not currently a team captain.</p>
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
            <p className="text-muted-foreground mb-4">You haven&apos;t been assigned to a team yet.</p>
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

  const pendingInvites = invites.filter(i => i.status === "pending");
  const suspendedPlayers = roster.filter(r => r.suspension);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* Team Logo */}
          <Dialog open={isLogoDialogOpen} onOpenChange={setIsLogoDialogOpen}>
            <DialogTrigger asChild>
              <button className="relative group cursor-pointer" title="Click to change team logo">
                {team.logo_url ? (
                  <Image src={team.logo_url} alt={team.name} width={64} height={64} className="w-16 h-16 rounded-lg object-contain shadow-lg" />
                ) : (
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-2xl shadow-lg"
                    style={{ backgroundColor: team.primary_color || "#3b82f6", color: team.secondary_color || "#ffffff" }}>
                    {team.short_name}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Team Logo</DialogTitle>
                <DialogDescription>Upload a custom logo for your team. Recommended size: 256x256 pixels.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  {team.logo_url ? (
                    <Image src={team.logo_url} alt={team.name} width={128} height={128} className="w-32 h-32 rounded-lg object-contain border-2 border-muted" />
                  ) : (
                    <div className="w-32 h-32 rounded-lg flex items-center justify-center font-bold text-4xl border-2 border-muted"
                      style={{ backgroundColor: team.primary_color || "#3b82f6", color: team.secondary_color || "#ffffff" }}>
                      {team.short_name}
                    </div>
                  )}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  <p>Supported formats: JPEG, PNG, GIF, WebP, SVG</p>
                  <p>Maximum file size: 2MB</p>
                </div>
                <div className="flex flex-col gap-3">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isUploadingLogo} className="w-full bg-canada-red hover:bg-canada-red-dark">
                    {isUploadingLogo ? "Uploading..." : <><Upload className="w-4 h-4 mr-2" />{team.logo_url ? "Upload New Logo" : "Upload Logo"}</>}
                  </Button>
                  {team.logo_url && (
                    <Button variant="outline" onClick={handleDeleteLogo} disabled={isUploadingLogo} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-2" />Remove Logo
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsLogoDialogOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div>
            <Link href={`/teams/${team.id}`}>
              <h1 className="text-3xl font-bold hover:underline cursor-pointer">{team.name}</h1>
            </Link>
            <p className="text-muted-foreground">Team Management {season && `• ${season.name}`}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Mail className="w-4 h-4 mr-2" />Invite Spare
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invite Player to Team</DialogTitle>
                <DialogDescription>Send an email invite to a spare or sub player to join your team.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" placeholder="player@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Invite Type</Label>
                  <Select value={inviteType} onValueChange={(v) => setInviteType(v as "full_time" | "sub")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sub">Sub / Spare (Call-up only)</SelectItem>
                      <SelectItem value="full_time">Full-Time Player</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Personal Message (optional)</Label>
                  <Textarea placeholder="Hey! We'd love to have you join our team..." value={inviteMessage} onChange={(e) => setInviteMessage(e.target.value)} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                <Button onClick={handleSendInvite} disabled={isSendingInvite || !inviteEmail.trim()} className="bg-canada-red hover:bg-canada-red-dark">
                  {isSendingInvite ? "Sending..." : <><Send className="w-4 h-4 mr-2" />Send Invite</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-canada-red hover:bg-canada-red-dark">
                <UserPlus className="w-4 h-4 mr-2" />Add Player
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Player to Roster</DialogTitle>
                <DialogDescription>Add a registered player to your team for {season?.name}</DialogDescription>
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
                  <input type="checkbox" id="isGoalie" checked={isGoalie} onChange={(e) => setIsGoalie(e.target.checked)} />
                  <Label htmlFor="isGoalie">Mark as goalie</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAddPlayer} className="bg-canada-red hover:bg-canada-red-dark">Add Player</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardDescription>Games Played</CardDescription>
            <CardTitle className="text-3xl">{totalTeamGames}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Invites</CardDescription>
            <CardTitle className="text-3xl">{pendingInvites.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Suspended Players Alert */}
      {suspendedPlayers.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Suspended Players ({suspendedPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suspendedPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={player.player.avatar_url || ""} />
                      <AvatarFallback className="text-xs">{getInitials(player.player.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{player.player.full_name}</p>
                      <p className="text-xs text-red-600">{player.suspension?.reason} - {player.suspension?.gamesRemaining} game(s) remaining</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Roster and Invites */}
      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roster">Roster ({roster.length})</TabsTrigger>
          <TabsTrigger value="invites">
            Invites {pendingInvites.length > 0 && <Badge variant="secondary" className="ml-2">{pendingInvites.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Roster Tab */}
        <TabsContent value="roster">
          <Card>
            <CardHeader>
              <CardTitle>Team Roster</CardTitle>
              <CardDescription>Manage your team roster for {season?.name || "current season"}</CardDescription>
            </CardHeader>
            <CardContent>
              {roster.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No players on your roster yet. Add players to get started.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-center">Pos</TableHead>
                        <TableHead className="text-center">Hand</TableHead>
                        <TableHead className="text-center">GP</TableHead>
                        <TableHead className="text-center">G</TableHead>
                        <TableHead className="text-center">A</TableHead>
                        <TableHead className="text-center">Pts</TableHead>
                        <TableHead className="text-center">Att%</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRoster.map((rosterEntry) => (
                        <TableRow key={rosterEntry.id} className={rosterEntry.suspension ? "bg-red-50" : ""}>
                          <TableCell className="font-mono font-bold">{rosterEntry.player.jersey_number ?? "-"}</TableCell>
                          <TableCell>
                            <Link href={`/stats/${rosterEntry.player.id}`} className="flex items-center gap-3 hover:underline">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={rosterEntry.player.avatar_url || ""} />
                                <AvatarFallback className="text-xs" style={{ backgroundColor: team.primary_color || "#3b82f6", color: team.secondary_color || "#ffffff" }}>
                                  {getInitials(rosterEntry.player.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{rosterEntry.player.full_name || "Unknown"}</p>
                                {rosterEntry.suspension && (
                                  <Badge variant="destructive" className="text-xs"><Ban className="w-3 h-3 mr-1" />Suspended</Badge>
                                )}
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="text-center">
                            {rosterEntry.is_goalie ? (
                              <Badge className="bg-rink-blue">G</Badge>
                            ) : rosterEntry.player.position ? (
                              <Badge variant="secondary">{rosterEntry.player.position}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {rosterEntry.player.shot_hand ? (
                              <span className="text-sm">{rosterEntry.player.shot_hand === "left" ? "L" : "R"}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-mono">{rosterEntry.stats.gamesPlayed}</TableCell>
                          <TableCell className="text-center font-mono">{rosterEntry.is_goalie ? "-" : rosterEntry.stats.goals}</TableCell>
                          <TableCell className="text-center font-mono">{rosterEntry.is_goalie ? "-" : rosterEntry.stats.assists}</TableCell>
                          <TableCell className="text-center font-mono font-bold">{rosterEntry.is_goalie ? "-" : rosterEntry.stats.points}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-mono ${
                              rosterEntry.stats.attendanceRate >= 80 ? "text-green-600" :
                              rosterEntry.stats.attendanceRate >= 50 ? "text-yellow-600" : "text-red-600"
                            }`}>
                              {rosterEntry.stats.attendanceRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleToggleGoalie(rosterEntry.player.id, rosterEntry.is_goalie)}
                                title={rosterEntry.is_goalie ? "Mark as player" : "Mark as goalie"}>
                                {rosterEntry.is_goalie ? "P" : "G"}
                              </Button>
                              {!rosterEntry.suspension && (
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setSuspendPlayerId(rosterEntry.player.id);
                                  setIsSuspendOpen(true);
                                }} title="Suspend player">
                                  <Ban className="w-4 h-4 text-orange-500" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleRemovePlayer(rosterEntry.player.id)} title="Remove from roster">
                                <X className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <CardTitle>Team Invites</CardTitle>
              <CardDescription>Pending and past invites sent to spare players</CardDescription>
            </CardHeader>
            <CardContent>
              {invites.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No invites sent yet.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsInviteOpen(true)}>
                    <Mail className="w-4 h-4 mr-2" />Send First Invite
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div key={invite.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                      invite.status === "pending" ? "bg-yellow-50 border-yellow-200" :
                      invite.status === "accepted" ? "bg-green-50 border-green-200" :
                      "bg-gray-50 border-gray-200"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          invite.status === "pending" ? "bg-yellow-100" :
                          invite.status === "accepted" ? "bg-green-100" : "bg-gray-100"
                        }`}>
                          <Mail className={`w-5 h-5 ${
                            invite.status === "pending" ? "text-yellow-600" :
                            invite.status === "accepted" ? "text-green-600" : "text-gray-600"
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant={invite.invite_type === "sub" ? "secondary" : "default"} className="text-xs">
                              {invite.invite_type === "sub" ? "Sub/Spare" : "Full-Time"}
                            </Badge>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>{new Date(invite.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          invite.status === "pending" ? "outline" :
                          invite.status === "accepted" ? "default" : "secondary"
                        }>
                          {invite.status}
                        </Badge>
                        {invite.status === "pending" && (
                          <Button variant="ghost" size="sm" onClick={() => handleCancelInvite(invite.id)}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Player Dialog */}
      <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suspend Player</DialogTitle>
            <DialogDescription>
              Suspend a player from your team for a specified number of games.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Suspension</Label>
              <Textarea placeholder="Describe the reason for suspension..." value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Number of Games</Label>
              <Input type="number" min={1} max={99} value={suspendGames} onChange={(e) => setSuspendGames(parseInt(e.target.value) || 1)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsSuspendOpen(false); setSuspendPlayerId(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspendPlayer} disabled={isSuspending || !suspendReason.trim()}>
              {isSuspending ? "Suspending..." : "Suspend Player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note */}
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Only players not on another team for this season can be added directly.
            Use &quot;Invite Spare&quot; to send email invitations to players who haven&apos;t registered yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
