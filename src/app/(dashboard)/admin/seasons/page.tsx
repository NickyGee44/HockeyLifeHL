"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  fixMultipleActiveSeasons,
  endSeason,
  getSeasonEndStatus,
  archiveSeason,
  unarchiveSeason,
} from "@/lib/seasons/actions";
import { generateSeasonSchedule } from "@/lib/seasons/schedule-generator";
import {
  getPreviousSeasonPlayerCount,
  bulkOptInPreviousSeasonPlayers,
  sendSeasonInviteEmails,
} from "@/lib/seasons/season-invite-actions";
import { startPlayoffs } from "@/lib/seasons/playoff-generator";
import { getCurrentDraft } from "@/lib/draft/actions";
import { toast } from "sonner";
import type { Season, SeasonStatus } from "@/types/database";

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // End season dialog state
  const [endSeasonConfirm, setEndSeasonConfirm] = useState<Season | null>(null);
  const [endSeasonStatus, setEndSeasonStatus] = useState<{
    totalGames: number;
    completedGames: number;
    verifiedGames: number;
    incompleteGames: number;
    unverifiedGames: number;
    canEnd: boolean;
  } | null>(null);
  const [loadingEndStatus, setLoadingEndStatus] = useState(false);
  
  // Playoff dialog state
  const [playoffConfirm, setPlayoffConfirm] = useState<Season | null>(null);
  const [playoffTeamCount, setPlayoffTeamCount] = useState<string>("all");
  
  // Previous season player info
  const [previousSeasonInfo, setPreviousSeasonInfo] = useState<{
    count: number;
    seasonName: string | null;
  }>({ count: 0, seasonName: null });
  
  // Active draft state
  const [activeDraft, setActiveDraft] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    gamesPerCycle: "13",
    totalGames: "",
    playoffFormat: "round_robin", // Default to round_robin per user preference
    draftScheduledAt: "",
    setActive: false,
    playerInviteOption: "none" as "none" | "email" | "bulk", // New field
  });

  useEffect(() => {
    loadSeasons();
    loadPreviousSeasonInfo();
  }, []);

  async function loadPreviousSeasonInfo() {
    const info = await getPreviousSeasonPlayerCount();
    setPreviousSeasonInfo(info);
  }

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
      
      // Check for active draft
      const draftSeason = result.seasons.find((s: Season) => 
        s.status === "draft" || s.status === "active" || s.status === "playoffs"
      );
      if (draftSeason) {
        const draftResult = await getCurrentDraft(draftSeason.id);
        if (draftResult.draft && (draftResult.draft.status === "pending" || draftResult.draft.status === "in_progress")) {
          setActiveDraft(draftResult.draft);
        } else {
          setActiveDraft(null);
        }
      } else {
        setActiveDraft(null);
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
      playoffFormat: "round_robin",
      draftScheduledAt: "",
      setActive: false,
      playerInviteOption: "none",
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
      playoffFormat: season.playoff_format || "round_robin",
      draftScheduledAt: season.draft_scheduled_at || "",
      setActive: false,
      playerInviteOption: "none",
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
      setIsSaving(false);
      return;
    }
    
    toast.success("Season created successfully!");
    
    // Handle player invitation based on selected option
    if (result.season && formData.playerInviteOption !== "none") {
      const seasonId = result.season.id;
      
      if (formData.playerInviteOption === "bulk") {
        // Bulk opt-in all previous season players
        const bulkResult = await bulkOptInPreviousSeasonPlayers(seasonId);
        if (bulkResult.error) {
          toast.error(`Failed to bulk opt-in players: ${bulkResult.error}`);
        } else {
          toast.success(bulkResult.message || `Opted in ${bulkResult.count} players`);
        }
      } else if (formData.playerInviteOption === "email") {
        // Send email invites to previous season players
        const emailResult = await sendSeasonInviteEmails(seasonId);
        if (emailResult.error) {
          toast.error(`Failed to send invites: ${emailResult.error}`);
        } else {
          toast.success(emailResult.message || `Sent invites to ${emailResult.count} players`);
        }
      }
    }
    
    setIsCreateOpen(false);
    resetForm();
    loadSeasons();
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

  async function openEndSeasonDialog(season: Season) {
    setEndSeasonConfirm(season);
    setLoadingEndStatus(true);
    const status = await getSeasonEndStatus(season.id);
    setEndSeasonStatus(status);
    setLoadingEndStatus(false);
  }

  async function handleEndSeason(forceEnd: boolean = false) {
    if (!endSeasonConfirm) return;
    
    setIsSaving(true);
    const result = await endSeason(endSeasonConfirm.id, forceEnd);
    
    if (result.error && !result.warnings) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success(result.message || "Season ended successfully!");
      setEndSeasonConfirm(null);
      setEndSeasonStatus(null);
      loadSeasons();
    }
    setIsSaving(false);
  }

  async function handleStartPlayoffs() {
    if (!playoffConfirm) return;
    
    setIsSaving(true);
    const teamsToInclude = playoffTeamCount === "all" ? undefined : parseInt(playoffTeamCount);
    const result = await startPlayoffs(playoffConfirm.id, teamsToInclude);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Playoffs started! ${result.gamesCreated} games created.`);
      setPlayoffConfirm(null);
      loadSeasons();
    }
    setIsSaving(false);
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

  async function handleArchiveSeason(seasonId: string) {
    if (!confirm("Archive this season? It will be hidden from normal views but can be restored later.")) return;
    
    setIsSaving(true);
    const result = await archiveSeason(seasonId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || "Season archived");
      loadSeasons();
    }
    setIsSaving(false);
  }

  async function handleUnarchiveSeason(seasonId: string) {
    setIsSaving(true);
    const result = await unarchiveSeason(seasonId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message || "Season restored");
      loadSeasons();
    }
    setIsSaving(false);
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
      case "archived":
        return <Badge variant="secondary" className="opacity-60">📦 Archived</Badge>;
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
      {/* Active Draft Banner */}
      {activeDraft && (
        <Card className="border-2 border-rink-blue bg-gradient-to-r from-rink-blue/10 to-canada-red/10">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🎯</div>
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Draft {activeDraft.status === "in_progress" ? "In Progress" : "Ready to Start"}
                    {activeDraft.status === "in_progress" && (
                      <Badge className="bg-green-600 animate-pulse">LIVE</Badge>
                    )}
                  </h3>
                  <p className="text-muted-foreground">
                    {activeDraft.status === "in_progress" 
                      ? `Pick #${activeDraft.current_pick} • Cycle ${activeDraft.cycle_number}`
                      : "Click below to manage the draft"}
                  </p>
                </div>
              </div>
              <Button 
                asChild
                size="lg"
                className="bg-rink-blue hover:bg-rink-blue/90 text-white font-bold"
              >
                <Link href="/admin/draft">
                  🎯 Go to Draft Board →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              
              {/* Player Invitation Options */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <Label className="text-base font-semibold">Player Invitations</Label>
                {previousSeasonInfo.seasonName ? (
                  <p className="text-sm text-muted-foreground">
                    {previousSeasonInfo.count} players from &quot;{previousSeasonInfo.seasonName}&quot; can be invited
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No previous season found
                  </p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="invite-none"
                      name="playerInvite"
                      checked={formData.playerInviteOption === "none"}
                      onChange={() => setFormData({ ...formData, playerInviteOption: "none" })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="invite-none" className="text-sm font-normal cursor-pointer">
                      Start fresh (players opt in manually)
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="invite-email"
                      name="playerInvite"
                      checked={formData.playerInviteOption === "email"}
                      onChange={() => setFormData({ ...formData, playerInviteOption: "email" })}
                      disabled={!previousSeasonInfo.seasonName}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="invite-email" className="text-sm font-normal cursor-pointer">
                      📧 Send email invites to previous season players
                      <span className="block text-xs text-muted-foreground">
                        Players receive an email and must click to opt in
                      </span>
                    </Label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="invite-bulk"
                      name="playerInvite"
                      checked={formData.playerInviteOption === "bulk"}
                      onChange={() => setFormData({ ...formData, playerInviteOption: "bulk" })}
                      disabled={!previousSeasonInfo.seasonName}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="invite-bulk" className="text-sm font-normal cursor-pointer">
                      ⚡ Bulk opt-in all previous season players
                      <span className="block text-xs text-muted-foreground">
                        All players are immediately added (admin override)
                      </span>
                    </Label>
                  </div>
                </div>
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
              <div className="grid gap-4 md:grid-cols-2">
                {/* Progress */}
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
                
                {/* Schedule Status */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Schedule Status</span>
                    {activeSeason.schedule_generated ? (
                      <Badge className="bg-green-600">✓ Generated</Badge>
                    ) : activeSeason.total_games ? (
                      <Badge className="bg-yellow-600">⏳ Ready to Generate</Badge>
                    ) : (
                      <Badge variant="destructive">❌ Set Total Games First</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeSeason.total_games 
                      ? `${activeSeason.total_games} total games configured`
                      : "Configure total games in season settings"
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {activeSeason.schedule_generated && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    asChild
                  >
                    <a href="/admin/games">📅 View Schedule</a>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPlayoffConfirm(activeSeason)}
                  disabled={activeSeason.status === "playoffs" || activeSeason.playoff_format === "none"}
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
                    variant="default"
                    size="sm"
                    className="bg-rink-blue hover:bg-rink-blue/90"
                    onClick={async () => {
                      setIsSaving(true);
                      const result = await generateSeasonSchedule(activeSeason.id, "random");
                      setIsSaving(false);
                      if (result.error) {
                        toast.error(result.error);
                      } else {
                        toast.success(`Schedule generated! ${result.gamesCreated} games created.`);
                        loadSeasons();
                      }
                    }}
                    disabled={isSaving}
                  >
                    📅 Generate Full Season Schedule
                  </Button>
                )}
                {activeSeason.schedule_generated && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      if (!confirm("This will delete all SCHEDULED games and regenerate the schedule. Games that are completed or in progress will not be affected. Continue?")) return;
                      setIsSaving(true);
                      const result = await generateSeasonSchedule(activeSeason.id, "random", undefined, true);
                      setIsSaving(false);
                      if (result.error) {
                        toast.error(result.error);
                      } else {
                        toast.success(`Schedule regenerated! ${result.gamesCreated} games created.`);
                        loadSeasons();
                      }
                    }}
                    disabled={isSaving}
                  >
                    🔄 Regenerate Schedule
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openEndSeasonDialog(activeSeason)}
                >
                  ✓ End Season
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Draft/Upcoming Seasons */}
      {seasons.filter(s => s.status === "draft").length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">🎯 Seasons in Draft</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {seasons.filter(s => s.status === "draft").map((season) => (
              <Card key={season.id} className="border-rink-blue/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{season.name}</CardTitle>
                    {getStatusBadge(season.status || "draft")}
                  </div>
                  <CardDescription>
                    {new Date(season.start_date).toLocaleDateString("en-CA", { 
                      year: "numeric", month: "short", day: "numeric" 
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(season)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <a href="/admin/draft">Go to Draft →</a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Seasons */}
      <div>
        <h2 className="text-xl font-semibold mb-4">📜 Past Seasons</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {seasons.filter(s => s.status === "completed").length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No completed seasons yet</p>
              </CardContent>
            </Card>
          ) : (
            seasons.filter(s => s.status === "completed").map((season) => (
              <Card key={season.id} className="opacity-80 hover:opacity-100 transition-opacity">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{season.name}</CardTitle>
                    {getStatusBadge(season.status || "completed")}
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
                      <span className="text-muted-foreground">Playoff format:</span>
                      <span className="font-medium capitalize">
                        {(season.playoff_format || "none").replace("_", " ")}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <a href={`/standings?season=${season.id}`}>View Standings</a>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <a href={`/stats?season=${season.id}`}>View Stats</a>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleStatusChange(season.id, "active")}
                      >
                        Reactivate
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleArchiveSeason(season.id)}
                        disabled={isSaving}
                      >
                        📦 Archive
                      </Button>
                      <Dialog open={deleteConfirm === season.id} onOpenChange={(open) => setDeleteConfirm(open ? season.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
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

      {/* Archived Seasons */}
      {seasons.filter(s => s.status === "archived").length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-muted-foreground">📦 Archived Seasons</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {seasons.filter(s => s.status === "archived").map((season) => (
              <Card key={season.id} className="opacity-50 hover:opacity-80 transition-opacity border-dashed">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{season.name}</CardTitle>
                    {getStatusBadge(season.status || "archived")}
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
                    <Separator />
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <a href={`/standings?season=${season.id}`}>View Standings</a>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleUnarchiveSeason(season.id)}
                        disabled={isSaving}
                      >
                        ↩ Restore
                      </Button>
                      <Dialog open={deleteConfirm === season.id} onOpenChange={(open) => setDeleteConfirm(open ? season.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
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
            ))}
          </div>
        </div>
      )}

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

      {/* Start Playoffs Dialog */}
      <Dialog open={!!playoffConfirm} onOpenChange={() => setPlayoffConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🏆 Start Playoffs</DialogTitle>
            <DialogDescription>
              Generate playoff bracket for {playoffConfirm?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Playoff Format:</span>
                <Badge variant="outline">
                  {playoffConfirm?.playoff_format === "round_robin" && "Round Robin"}
                  {playoffConfirm?.playoff_format === "single_elimination" && "Single Elimination"}
                  {playoffConfirm?.playoff_format === "double_elimination" && "Double Elimination"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="playoff-teams">Teams to Include</Label>
              <Select value={playoffTeamCount} onValueChange={setPlayoffTeamCount}>
                <SelectTrigger id="playoff-teams">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="8">Top 8 Teams</SelectItem>
                  <SelectItem value="6">Top 6 Teams</SelectItem>
                  <SelectItem value="4">Top 4 Teams</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Teams are seeded based on current standings
              </p>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ Starting playoffs will:
              </p>
              <ul className="text-sm text-yellow-600 dark:text-yellow-500 list-disc pl-5 mt-2">
                <li>Change season status to &quot;Playoffs&quot;</li>
                <li>Generate playoff games based on standings</li>
                <li>Regular season standings will be locked</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlayoffConfirm(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartPlayoffs}
              disabled={isSaving}
              className="bg-gold text-puck-black hover:bg-gold/90"
            >
              {isSaving ? "Starting..." : "🏆 Start Playoffs"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Season Dialog */}
      <Dialog open={!!endSeasonConfirm} onOpenChange={() => { setEndSeasonConfirm(null); setEndSeasonStatus(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>End Season: {endSeasonConfirm?.name}</DialogTitle>
            <DialogDescription>
              Review the season status before ending
            </DialogDescription>
          </DialogHeader>
          
          {loadingEndStatus ? (
            <div className="py-8 text-center">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </div>
          ) : endSeasonStatus && (
            <div className="space-y-4 py-4">
              {/* Status Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold">{endSeasonStatus.totalGames}</div>
                  <div className="text-sm text-muted-foreground">Total Games</div>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{endSeasonStatus.verifiedGames}</div>
                  <div className="text-sm text-muted-foreground">Verified</div>
                </div>
              </div>

              {/* Warnings */}
              {endSeasonStatus.incompleteGames > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
                  <span className="text-yellow-600">⚠️</span>
                  <div>
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">
                      {endSeasonStatus.incompleteGames} incomplete game(s)
                    </p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-500">
                      These games are still scheduled or in progress
                    </p>
                  </div>
                </div>
              )}

              {endSeasonStatus.unverifiedGames > 0 && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-2">
                  <span className="text-orange-600">⚠️</span>
                  <div>
                    <p className="font-medium text-orange-700 dark:text-orange-400">
                      {endSeasonStatus.unverifiedGames} unverified game(s)
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-500">
                      Completed games with stats not verified by both captains
                    </p>
                  </div>
                </div>
              )}

              {endSeasonStatus.canEnd && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Ready to end
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      All games are complete and verified
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <p className="text-sm text-muted-foreground">
                Ending the season will:
              </p>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Lock in final standings and stats</li>
                <li>Set the end date to today</li>
                <li>Mark the season as completed</li>
                <li>Make the season available for archiving</li>
              </ul>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setEndSeasonConfirm(null); setEndSeasonStatus(null); }}>
              Cancel
            </Button>
            {endSeasonStatus && !endSeasonStatus.canEnd && (
              <Button 
                variant="destructive"
                onClick={() => handleEndSeason(true)}
                disabled={isSaving}
              >
                {isSaving ? "Ending..." : "Force End Season"}
              </Button>
            )}
            {endSeasonStatus?.canEnd && (
              <Button 
                onClick={() => handleEndSeason(false)}
                disabled={isSaving}
                className="bg-canada-red hover:bg-canada-red-dark"
              >
                {isSaving ? "Ending..." : "End Season"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
