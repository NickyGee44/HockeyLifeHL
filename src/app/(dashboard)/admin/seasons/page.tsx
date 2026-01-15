"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { 
  getAllSeasons, 
  createSeason, 
  updateSeason, 
  updateSeasonStatus,
  deleteSeason,
  fixMultipleActiveSeasons
} from "@/lib/seasons/actions";
import { generateSeasonSchedule } from "@/lib/seasons/schedule-generator";
import { toast } from "sonner";
import type { Season, SeasonStatus } from "@/types/database";

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    gamesPerCycle: "13",
    totalGames: "",
    playoffFormat: "none",
    draftScheduledAt: "",
    setActive: false,
  });

  useEffect(() => {
    loadSeasons();
  }, []);

  async function loadSeasons() {
    setLoading(true);
    const result = await getAllSeasons();
    
    if (result.error) {
      toast.error(result.error);
    } else {
      setSeasons(result.seasons);
      
      // Check for multiple active seasons and auto-fix
      const activeSeasons = result.seasons.filter(s => s.status === "active" || s.status === "playoffs");
      if (activeSeasons.length > 1) {
        const fixResult = await fixMultipleActiveSeasons();
        if (fixResult.success) {
          toast.warning(fixResult.message || "Fixed multiple active seasons");
          // Reload to show updated state
          const reloadResult = await getAllSeasons();
          if (reloadResult.seasons) {
            setSeasons(reloadResult.seasons);
          }
        } else if (fixResult.error) {
          toast.error(fixResult.error);
        }
      }
    }
    
    setLoading(false);
  }

  async function handleFixMultipleActive() {
    setIsSaving(true);
    const result = await fixMultipleActiveSeasons();
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || "Fixed multiple active seasons");
      loadSeasons();
    }
    setIsSaving(false);
  }

  function resetForm() {
    setFormData({
      name: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      gamesPerCycle: "13",
      totalGames: "",
      playoffFormat: "none",
      draftScheduledAt: "",
      setActive: false,
    });
  }

  function openEditDialog(season: Season) {
    setEditingSeason(season);
    setFormData({
      name: season.name,
      startDate: season.start_date,
      endDate: season.end_date || "",
      gamesPerCycle: (season.games_per_cycle ?? 13).toString(),
      totalGames: (season.total_games ?? "").toString(),
      playoffFormat: season.playoff_format || "none",
      draftScheduledAt: season.draft_scheduled_at || "",
      setActive: false,
    });
  }

  async function handleCreate() {
    setIsSaving(true);
    const form = new FormData();
    form.set("name", formData.name);
    form.set("startDate", formData.startDate);
    form.set("gamesPerCycle", formData.gamesPerCycle);
    form.set("totalGames", formData.totalGames);
    form.set("playoffFormat", formData.playoffFormat);
    if (formData.draftScheduledAt) {
      form.set("draftScheduledAt", formData.draftScheduledAt);
    }
    form.set("setActive", formData.setActive.toString());

    const result = await createSeason(form);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Season created successfully!");
      setIsCreateOpen(false);
      resetForm();
      loadSeasons();
    }
    setIsSaving(false);
  }

  async function handleUpdate() {
    if (!editingSeason) return;
    
    setIsSaving(true);
    const form = new FormData();
    form.set("name", formData.name);
    form.set("startDate", formData.startDate);
    form.set("endDate", formData.endDate);
    form.set("gamesPerCycle", formData.gamesPerCycle);

    const result = await updateSeason(editingSeason.id, form);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Season updated successfully!");
      setEditingSeason(null);
      resetForm();
      loadSeasons();
    }
    setIsSaving(false);
  }

  async function handleStatusChange(seasonId: string, status: SeasonStatus) {
    const result = await updateSeasonStatus(seasonId, status);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Season ${status === "active" ? "activated" : status}!`);
      loadSeasons();
    }
  }

  async function handleDelete(seasonId: string) {
    const result = await deleteSeason(seasonId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Season deleted successfully!");
      setDeleteConfirm(null);
      loadSeasons();
    }
  }

  const getStatusBadge = (status: SeasonStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">🏒 Active</Badge>;
      case "playoffs":
        return <Badge className="bg-gold text-puck-black">🏆 Playoffs</Badge>;
      case "draft":
        return <Badge className="bg-rink-blue">🎯 Draft Mode</Badge>;
      case "completed":
        return <Badge variant="outline">✓ Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getGamesProgress = (season: Season) => {
    const current = season.current_game_count ?? 0;
    const total = season.games_per_cycle ?? 13;
    const percent = total > 0 ? (current / total) * 100 : 0;
    return {
      current,
      total,
      percent: Math.min(percent, 100),
      remaining: Math.max(0, total - current),
    };
  };

  const activeSeasons = seasons.filter(s => s.status === "active" || s.status === "playoffs");
  const activeSeason = activeSeasons[0]; // Get the first one (should only be one after fix)
  const hasMultipleActive = activeSeasons.length > 1;

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hasMultipleActive && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  ⚠️ Multiple Active Seasons Detected
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  There are {activeSeasons.length} active seasons. Only one season can be active at a time.
                </p>
              </div>
              <Button 
                onClick={handleFixMultipleActive}
                disabled={isSaving}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {isSaving ? "Fixing..." : "Fix Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Seasons 📆</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage league seasons
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-canada-red hover:bg-canada-red-dark">
              + New Season
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Season</DialogTitle>
              <DialogDescription>
                Start a new league season
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Season Name</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Winter 2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-start">Start Date</Label>
                <Input
                  id="create-start"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-games">Games Per Draft Cycle</Label>
                <Input
                  id="create-games"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.gamesPerCycle}
                  onChange={(e) => setFormData({ ...formData, gamesPerCycle: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Teams will be redrafted after this many games (default: 13)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-total-games">Total Games in Season</Label>
                <Input
                  id="create-total-games"
                  type="number"
                  min="1"
                  value={formData.totalGames}
                  onChange={(e) => setFormData({ ...formData, totalGames: e.target.value })}
                  placeholder="e.g., 20"
                />
                <p className="text-xs text-muted-foreground">
                  Total number of games to be played. Schedule will be auto-generated after draft.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-playoff-format">Playoff Format</Label>
                <Select
                  value={formData.playoffFormat}
                  onValueChange={(value) => setFormData({ ...formData, playoffFormat: value })}
                >
                  <SelectTrigger id="create-playoff-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Playoffs</SelectItem>
                    <SelectItem value="single_elimination">Single Elimination</SelectItem>
                    <SelectItem value="double_elimination">Double Elimination</SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-draft-date">Draft Date & Time (Optional)</Label>
                <Input
                  id="create-draft-date"
                  type="datetime-local"
                  value={formData.draftScheduledAt}
                  onChange={(e) => setFormData({ ...formData, draftScheduledAt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  When the draft will take place. Can be set later.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create-active"
                  checked={formData.setActive}
                  onChange={(e) => setFormData({ ...formData, setActive: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="create-active" className="text-sm font-normal cursor-pointer">
                  Set as active season immediately
                </Label>
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
                {isSaving ? "Creating..." : "Create Season"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Season Highlight */}
      {activeSeason && (
        <Card className="border-green-600/50 bg-green-600/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  🏒 Current Season: {activeSeason.name}
                </CardTitle>
                <CardDescription>
                  Started {new Date(activeSeason.start_date).toLocaleDateString("en-CA", { 
                    year: "numeric", month: "long", day: "numeric" 
                  })}
                </CardDescription>
              </div>
              {getStatusBadge(activeSeason.status || "active")}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Draft Cycle Progress</span>
                  <span className="font-medium">
                    {getGamesProgress(activeSeason).current} / {getGamesProgress(activeSeason).total} games
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-canada-red transition-all"
                    style={{ width: `${getGamesProgress(activeSeason).percent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getGamesProgress(activeSeason).remaining} games until next draft
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleStatusChange(activeSeason.id, "playoffs")}
                  disabled={activeSeason.status === "playoffs"}
                >
                  🏆 Start Playoffs
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleStatusChange(activeSeason.id, "draft")}
                >
                  🎯 Trigger Draft
                </Button>
                {activeSeason.total_games && !activeSeason.schedule_generated && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      const result = await generateSeasonSchedule(activeSeason.id, "random");
                      if (result.error) {
                        toast.error(result.error);
                      } else {
                        toast.success(`Schedule generated! ${result.gamesCreated} games created.`);
                        loadSeasons();
                      }
                    }}
                  >
                    📅 Generate Schedule
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleStatusChange(activeSeason.id, "completed")}
                >
                  ✓ End Season
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Seasons */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All Seasons</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {seasons.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No seasons yet. Create your first season!</p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  + Create Season
                </Button>
              </CardContent>
            </Card>
          ) : (
            seasons.map((season) => (
              <Card key={season.id} className={season.status === "active" || season.status === "playoffs" ? "border-green-600/30" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{season.name}</CardTitle>
                    {getStatusBadge(season.status || "active")}
                  </div>
                  <CardDescription>
                    {new Date(season.start_date).toLocaleDateString("en-CA", { 
                      year: "numeric", month: "short", day: "numeric" 
                    })}
                    {season.end_date && (
                      <> — {new Date(season.end_date).toLocaleDateString("en-CA", { 
                        year: "numeric", month: "short", day: "numeric" 
                      })}</>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Games per cycle:</span>
                      <span className="font-medium">{season.games_per_cycle}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current progress:</span>
                      <span className="font-medium">
                        {season.current_game_count} / {season.games_per_cycle}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex gap-2">
                      {season.status !== "active" && season.status !== "playoffs" && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStatusChange(season.id, "active")}
                        >
                          Activate
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(season)}
                      >
                        Edit
                      </Button>
                      <Dialog open={deleteConfirm === season.id} onOpenChange={(open) => setDeleteConfirm(open ? season.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Season?</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete <strong>{season.name}</strong>? 
                              This cannot be undone. Seasons with games cannot be deleted.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                              Cancel
                            </Button>
                            <Button variant="destructive" onClick={() => handleDelete(season.id)}>
                              Delete Season
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSeason} onOpenChange={() => { setEditingSeason(null); resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Season</DialogTitle>
            <DialogDescription>
              Update season information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Season Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Start Date</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end">End Date (Optional)</Label>
                <Input
                  id="edit-end"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-games">Games Per Draft Cycle</Label>
              <Input
                id="edit-games"
                type="number"
                min="1"
                max="50"
                value={formData.gamesPerCycle}
                onChange={(e) => setFormData({ ...formData, gamesPerCycle: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingSeason(null); resetForm(); }}>
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
