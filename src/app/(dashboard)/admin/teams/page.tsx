"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamLogo } from "@/components/ui/team-logo";
import { 
  getAllTeams, 
  createTeam, 
  updateTeam, 
  deleteTeam,
  getAvailableCaptains 
} from "@/lib/teams/actions";
import { updateTeamLogoAdmin } from "@/lib/admin/actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Team, Profile } from "@/types/database";

type TeamWithCaptain = Team & {
  captain: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
};

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamWithCaptain[]>([]);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithCaptain | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    primaryColor: "#E31837",
    secondaryColor: "#FFFFFF",
    captainId: "none", // Use "none" instead of empty string for Select component
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [teamsResult, playersResult] = await Promise.all([
      getAllTeams(),
      getAvailableCaptains(),
    ]);
    
    if (teamsResult.error) {
      toast.error(teamsResult.error);
    } else {
      setTeams(teamsResult.teams as TeamWithCaptain[]);
    }
    
    if (playersResult.players) {
      setPlayers(playersResult.players as Profile[]);
    }
    
    setLoading(false);
  }

  function resetForm() {
    setFormData({
      name: "",
      shortName: "",
      primaryColor: "#E31837",
      secondaryColor: "#FFFFFF",
      captainId: "none",
    });
  }

  function openEditDialog(team: TeamWithCaptain) {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      shortName: team.short_name,
      primaryColor: team.primary_color || "#3b82f6",
      secondaryColor: team.secondary_color || "#ffffff",
      captainId: team.captain_id || "none",
    });
  }

  async function handleCreate() {
    setIsSaving(true);
    const form = new FormData();
    form.set("name", formData.name);
    form.set("shortName", formData.shortName);
    form.set("primaryColor", formData.primaryColor);
    form.set("secondaryColor", formData.secondaryColor);
    if (formData.captainId && formData.captainId !== "none") {
      form.set("captainId", formData.captainId);
    }

    const result = await createTeam(form);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Team created successfully!");
      setIsCreateOpen(false);
      resetForm();
      loadData();
    }
    setIsSaving(false);
  }

  async function handleUpdate() {
    if (!editingTeam) return;
    
    setIsSaving(true);
    const form = new FormData();
    form.set("name", formData.name);
    form.set("shortName", formData.shortName);
    form.set("primaryColor", formData.primaryColor);
    form.set("secondaryColor", formData.secondaryColor);
    if (formData.captainId && formData.captainId !== "none") {
      form.set("captainId", formData.captainId);
    }

    const result = await updateTeam(editingTeam.id, form);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Team updated successfully!");
      setEditingTeam(null);
      resetForm();
      loadData();
    }
    setIsSaving(false);
  }

  async function handleDelete(teamId: string) {
    const result = await deleteTeam(teamId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Team deleted successfully!");
      setDeleteConfirm(null);
      loadData();
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingTeam) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, GIF, WebP, or SVG image");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploadingLogo(true);
    console.log("Starting upload for file:", file.name, "size:", file.size, "type:", file.type);

    try {
      const supabase = createClient();
      
      // Generate unique filename
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
      const fileName = `${editingTeam.id}-${Date.now()}.${fileExt}`;
      const filePath = `team-logos/${fileName}`;
      
      console.log("Uploading to path:", filePath);
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

      // Upload to Supabase Storage with timeout
      const uploadPromise = supabase.storage
        .from("public")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      // Race between upload and timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Upload timed out after 60 seconds")), 60000);
      });

      const { error: uploadError, data: uploadData } = await Promise.race([
        uploadPromise,
        timeoutPromise
      ]) as Awaited<typeof uploadPromise>;

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        console.error("Error details:", JSON.stringify(uploadError, null, 2));
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new Error("Upload succeeded but no data returned");
      }

      console.log("Upload successful:", uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("public")
        .getPublicUrl(filePath);

      console.log("Public URL:", publicUrl);

      // Update team logo via admin action
      const result = await updateTeamLogoAdmin(editingTeam.id, publicUrl);
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state
      setEditingTeam({ ...editingTeam, logo_url: publicUrl });
      toast.success("Logo updated!");
      loadData();
    } catch (error: any) {
      console.error("Logo upload error:", error);
      console.error("Error stack:", error.stack);
      
      if (error.message?.includes("timed out")) {
        toast.error("Upload timed out. Check your Supabase storage configuration.");
      } else if (error.message?.includes("Bucket not found")) {
        toast.error("Storage bucket 'public' not found. Run the storage setup SQL.");
      } else if (error.message?.includes("not allowed") || error.message?.includes("policy")) {
        toast.error("Upload permission denied. Check storage policies in Supabase.");
      } else {
        toast.error(error.message || "Failed to upload logo.");
      }
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  }

  async function handleRemoveLogo() {
    if (!editingTeam) return;
    
    setIsUploadingLogo(true);
    
    try {
      const result = await updateTeamLogoAdmin(editingTeam.id, null);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setEditingTeam({ ...editingTeam, logo_url: null });
      toast.success("Logo removed");
      loadData();
    } catch (error) {
      console.error("Logo remove error:", error);
      toast.error("Failed to remove logo");
    } finally {
      setIsUploadingLogo(false);
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
              {[...Array(4)].map((_, i) => (
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Teams 🏆</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage league teams
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-canada-red hover:bg-canada-red-dark">
              + New Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Add a new team to the league
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Team Name</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Maple Leafs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-short">Short Name (2-5 chars)</Label>
                <Input
                  id="create-short"
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                  placeholder="TOR"
                  maxLength={5}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-primary">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="create-primary"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-secondary">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="create-secondary"
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-captain">Team Captain (Optional)</Label>
                <Select
                  value={formData.captainId}
                  onValueChange={(value) => setFormData({ ...formData, captainId: value })}
                >
                  <SelectTrigger id="create-captain">
                    <SelectValue placeholder="Select captain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Captain</SelectItem>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.full_name || player.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Color Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div 
                  className="h-16 rounded-lg flex items-center justify-center font-bold text-xl"
                  style={{ 
                    backgroundColor: formData.primaryColor,
                    color: formData.secondaryColor,
                  }}
                >
                  {formData.shortName || "TEAM"}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={isSaving}
                className="bg-canada-red hover:bg-canada-red-dark"
              >
                {isSaving ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Teams Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No teams yet. Create your first team!</p>
              <Button onClick={() => setIsCreateOpen(true)}>
                + Create Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          teams.map((team) => (
            <Card key={team.id} className="overflow-hidden">
              <div 
                className="h-2"
                style={{ backgroundColor: team.primary_color || "#3b82f6" }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TeamLogo team={team} size="lg" clickable={false} />
                    <div>
                      <Link href={`/teams/${team.id}`}>
                        <CardTitle className="text-lg hover:underline cursor-pointer">{team.name}</CardTitle>
                      </Link>
                      <CardDescription>{team.short_name}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Captain:</span>
                    {team.captain ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={team.captain.avatar_url || ""} />
                          <AvatarFallback className="text-xs">
                            {getInitials(team.captain.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{team.captain.full_name}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">No Captain</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditDialog(team)}
                    >
                      Edit
                    </Button>
                    <Dialog open={deleteConfirm === team.id} onOpenChange={(open) => setDeleteConfirm(open ? team.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Team?</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete <strong>{team.name}</strong>? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" onClick={() => handleDelete(team.id)}>
                            Delete Team
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingTeam} onOpenChange={() => { setEditingTeam(null); resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team information and logo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Logo Section */}
            <div className="space-y-2">
              <Label>Team Logo</Label>
              <div className="flex items-center gap-4">
                {editingTeam?.logo_url ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border">
                    <Image
                      src={editingTeam.logo_url}
                      alt={editingTeam.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div 
                    className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-xl"
                    style={{ 
                      backgroundColor: formData.primaryColor,
                      color: formData.secondaryColor,
                    }}
                  >
                    {formData.shortName || "TEAM"}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                  </Button>
                  {editingTeam?.logo_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={isUploadingLogo}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Max 2MB, JPEG/PNG/GIF/WebP/SVG
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-name">Team Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-short">Short Name (2-5 chars)</Label>
              <Input
                id="edit-short"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                maxLength={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-primary">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-primary"
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-secondary">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-secondary"
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-captain">Team Captain</Label>
              <Select
                value={formData.captainId}
                onValueChange={(value) => setFormData({ ...formData, captainId: value })}
              >
                <SelectTrigger id="edit-captain">
                  <SelectValue placeholder="Select captain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Captain</SelectItem>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.full_name || player.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Color Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div 
                className="h-16 rounded-lg flex items-center justify-center font-bold text-xl"
                style={{ 
                  backgroundColor: formData.primaryColor,
                  color: formData.secondaryColor,
                }}
              >
                {formData.shortName || "TEAM"}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingTeam(null); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
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
