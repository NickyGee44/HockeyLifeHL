"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllPlayers, updatePlayerRole, updatePlayerProfile } from "@/lib/admin/actions";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Profile, UserRole } from "@/types/database";

export default function AdminPlayersPage() {
  const { profile: currentUser } = useAuth();
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  // Edit dialog state
  const [editingPlayer, setEditingPlayer] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    jersey_number: "",
    position: "",
    role: "" as UserRole,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, []);

  async function loadPlayers() {
    setLoading(true);
    const result = await getAllPlayers();
    if (result.error) {
      toast.error(result.error);
    } else {
      setPlayers(result.players);
    }
    setLoading(false);
  }

  function openEditDialog(player: Profile) {
    setEditingPlayer(player);
    setEditForm({
      full_name: player.full_name || "",
      jersey_number: player.jersey_number?.toString() || "",
      position: player.position || "",
      role: player.role,
    });
  }

  async function handleSaveEdit() {
    if (!editingPlayer) return;
    
    setIsSaving(true);
    
    // Update profile info
    const profileResult = await updatePlayerProfile(editingPlayer.id, {
      full_name: editForm.full_name,
      jersey_number: editForm.jersey_number ? parseInt(editForm.jersey_number) : null,
      position: editForm.position || null,
    });

    if (profileResult.error) {
      toast.error(profileResult.error);
      setIsSaving(false);
      return;
    }

    // Update role if changed
    if (editForm.role !== editingPlayer.role) {
      const roleResult = await updatePlayerRole(editingPlayer.id, editForm.role);
      if (roleResult.error) {
        toast.error(roleResult.error);
        setIsSaving(false);
        return;
      }
    }

    toast.success("Player updated successfully!");
    setEditingPlayer(null);
    setIsSaving(false);
    loadPlayers();
  }

  async function handleQuickRoleChange(playerId: string, newRole: UserRole) {
    const result = await updatePlayerRole(playerId, newRole);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Role updated!");
      loadPlayers();
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

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-gold text-puck-black">👑 Owner</Badge>;
      case "captain":
        return <Badge className="bg-canada-red">🏒 Captain</Badge>;
      default:
        return <Badge variant="outline">⛸️ Player</Badge>;
    }
  };

  // Filter players
  const filteredPlayers = players.filter((player) => {
    const matchesSearch = 
      player.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || player.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Manage Players 👥</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all players in the league
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Players</CardDescription>
            <CardTitle className="text-3xl">{players.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Owners</CardDescription>
            <CardTitle className="text-3xl text-gold">
              {players.filter(p => p.role === "owner").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Captains</CardDescription>
            <CardTitle className="text-3xl text-canada-red">
              {players.filter(p => p.role === "captain").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Players</CardDescription>
            <CardTitle className="text-3xl">
              {players.filter(p => p.role === "player").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
          <CardDescription>
            Click on a player to edit their profile and role
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owners</SelectItem>
                <SelectItem value="captain">Captains</SelectItem>
                <SelectItem value="player">Players</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Jersey #</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No players found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <Link 
                          href={`/stats/${player.id}`}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={player.avatar_url || ""} />
                            <AvatarFallback className="bg-canada-red text-white text-xs">
                              {getInitials(player.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{player.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{player.email}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {player.position ? (
                          <Badge variant="outline">{player.position}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {player.jersey_number !== null ? (
                          <span className="font-mono">#{player.jersey_number}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getRoleBadge(player.role)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Select
                            value={player.role}
                            onValueChange={(value) => handleQuickRoleChange(player.id, value as UserRole)}
                            disabled={player.id === currentUser?.id}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="player">Player</SelectItem>
                              <SelectItem value="captain">Captain</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(player)}
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>
              Update player information and role
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-jersey">Jersey Number</Label>
                <Input
                  id="edit-jersey"
                  type="number"
                  min="0"
                  max="99"
                  value={editForm.jersey_number}
                  onChange={(e) => setEditForm({ ...editForm, jersey_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">Position</Label>
                <Select
                  value={editForm.position}
                  onValueChange={(value) => setEditForm({ ...editForm, position: value })}
                >
                  <SelectTrigger id="edit-position">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">Center (C)</SelectItem>
                    <SelectItem value="LW">Left Wing (LW)</SelectItem>
                    <SelectItem value="RW">Right Wing (RW)</SelectItem>
                    <SelectItem value="D">Defense (D)</SelectItem>
                    <SelectItem value="G">Goalie (G)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value as UserRole })}
                disabled={editingPlayer?.id === currentUser?.id}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">⛸️ Player</SelectItem>
                  <SelectItem value="captain">🏒 Captain</SelectItem>
                  <SelectItem value="owner">👑 Owner</SelectItem>
                </SelectContent>
              </Select>
              {editingPlayer?.id === currentUser?.id && (
                <p className="text-xs text-muted-foreground">
                  You cannot change your own role
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlayer(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={isSaving}
              className="bg-canada-red hover:bg-canada-red-dark"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
