"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { startDraft, getCurrentDraft, completeDraft, getDraftPicks, getAvailableDraftPlayers, makeDraftPick } from "@/lib/draft/actions";
import { getAllSeasons } from "@/lib/seasons/actions";
import { getAllTeams } from "@/lib/teams/actions";
import { useDraftRealtime } from "@/hooks/useDraftRealtime";
import { LiveDraftBoard } from "@/components/draft/LiveDraftBoard";
import { DraftBoardHeader } from "@/components/draft/DraftBoardHeader";
import { PreDraftScreen } from "@/components/draft/PreDraftScreen";
import { MyTeamRoster } from "@/components/draft/MyTeamRoster";
import { getDraftOrder, assignDraftOrder } from "@/lib/draft/draft-order";
import { activateDraft, getLastPickedPlayer } from "@/lib/draft/actions";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";

export default function AdminDraftPage() {
  const router = useRouter();
  const [season, setSeason] = useState<any>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [draftOrder, setDraftOrder] = useState<any[]>([]);
  const [lastPickedPlayer, setLastPickedPlayer] = useState<any>(null);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPickDialogOpen, setIsPickDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [isMakingPick, setIsMakingPick] = useState(false);
  const [localDraft, setLocalDraft] = useState<any>(null); // Local draft state to avoid timing issues
  
  // Autodraft state - tracks which teams have autodraft enabled
  const [autodraftTeams, setAutodraftTeams] = useState<Record<string, boolean>>({});
  const [isAutodrafting, setIsAutodrafting] = useState(false);
  
  // Ref to prevent duplicate autodrafts (more reliable than state for async operations)
  const autodraftInProgress = useRef(false);
  const lastAutodraftPick = useRef<number | null>(null);
  const lastPickedPlayerId = useRef<string | null>(null);

  // Use real-time hook for draft updates
  const { draft: realtimeDraft, picks, isConnected } = useDraftRealtime(draftId);
  
  // Use realtime draft if available, otherwise use local draft
  const draft = realtimeDraft || localDraft;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Get season - check for active, playoffs, or draft status
      const seasonsResult = await getAllSeasons();
      const activeSeason = seasonsResult.seasons?.find((s: any) => 
        s.status === "active" || s.status === "playoffs" || s.status === "draft"
      );
      
      if (activeSeason) {
        setSeason(activeSeason);
        const draftResult = await getCurrentDraft(activeSeason.id);
        if (draftResult.draft) {
          const newDraftId = draftResult.draft.id;
          setDraftId(newDraftId);
          setLocalDraft(draftResult.draft); // Set local draft
          await loadDraftData(newDraftId);
        } else {
          setDraftId(null);
          setLocalDraft(null); // Clear local draft
          setAvailablePlayers([]);
          const teamsResult = await getAllTeams();
          setTeams(teamsResult.teams || []);
        }
      } else {
        setSeason(null);
        setDraftId(null);
        setTeams([]);
        setAvailablePlayers([]);
      }
    } catch (error) {
      console.error("Error loading draft data:", error);
      toast.error("Failed to load draft data");
    } finally {
      setLoading(false);
    }
  }

  // Load available players periodically
  useEffect(() => {
    if (draftId) {
      loadAvailablePlayers();
      const interval = setInterval(loadAvailablePlayers, 10000);
      return () => clearInterval(interval);
    }
  }, [draftId]);

  async function loadDraftData(draftIdParam?: string) {
    const id = draftIdParam || draftId;
    if (!id) return;
    try {
      const [teamsResult, playersResult, orderResult, lastPickResult] = await Promise.all([
        getAllTeams(),
        getAvailableDraftPlayers(id),
        getDraftOrder(id),
        getLastPickedPlayer(id),
      ]);
      setTeams(teamsResult.teams || []);
      setAvailablePlayers(playersResult.players || []);
      if (orderResult.order) {
        setDraftOrder(orderResult.order);
      }
      if (lastPickResult.player) {
        setLastPickedPlayer(lastPickResult.player);
      }
    } catch (error) {
      console.error("Error loading draft data:", error);
      toast.error("Failed to load draft data");
    }
  }

  async function loadAvailablePlayers() {
    if (!draftId) return;
    const playersResult = await getAvailableDraftPlayers(draftId);
    setAvailablePlayers(playersResult.players || []);
  }

  // Update local draft when realtime draft loads
  useEffect(() => {
    if (realtimeDraft) {
      setLocalDraft(realtimeDraft);
    }
  }, [realtimeDraft]);

  // Load draft data when picks change
  useEffect(() => {
    if (draftId && draft?.status === "in_progress") {
      loadDraftData(draftId);
    }
  }, [draftId, draft?.status, picks.length]);

  async function handleStartDraft() {
    if (!season) return;
    
    try {
      const result = await startDraft(season.id, 1);
      if (result.error) {
        toast.error(result.error);
      } else if (result.draft) {
        // Directly set the draft ID and local draft from the result
        const newDraftId = result.draft.id;
        setDraftId(newDraftId);
        setLocalDraft(result.draft); // Set local draft immediately to avoid timing issues
        toast.success("Draft started! Email notifications sent to all captains.");
        // Small delay to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 500));
        // Load draft data with the new draft ID (pass it directly to avoid state timing issues)
        await loadDraftData(newDraftId);
        // Don't refresh router immediately - let the real-time hook update naturally
      } else {
        // Fallback: reload all data if draft not in result
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadData();
        setTimeout(() => {
          router.refresh();
        }, 500);
      }
    } catch (error: any) {
      console.error("Error starting draft:", error);
      toast.error(error.message || "Failed to start draft");
    }
  }

  async function handleCompleteDraft() {
    if (!draft) return;
    
    const result = await completeDraft(draft.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Draft completed! Players assigned to teams.");
      loadData();
    }
  }

  async function handleMakePick(playerId?: string, teamId?: string) {
    // Auto-use current team on clock if no team specified
    const targetTeamId = teamId || currentTeamTurn?.id;
    const targetPlayerId = playerId || selectedPlayerId;
    
    if (!draft || !targetTeamId || !targetPlayerId) {
      toast.error("No team on the clock or no player selected");
      return;
    }

    setIsMakingPick(true);
    const result = await makeDraftPick(draft.id, targetTeamId, targetPlayerId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      const teamName = currentTeamTurn?.name || "Team";
      toast.success(`Pick made for ${teamName}!`);
      setIsPickDialogOpen(false);
      setSelectedPlayerId("");
      // Real-time hook will update automatically
    }
    setIsMakingPick(false);
  }

  // Calculate which team is up to pick using draft order
  const currentTeamTurn = useMemo(() => {
    if (!draft || !draftOrder.length) return null;
    const totalTeams = draftOrder.length;
    const round = Math.ceil(draft.current_pick / totalTeams);
    const isOddRound = round % 2 === 1;
    const positionInRound = ((draft.current_pick - 1) % totalTeams) + 1;
    let expectedTeamPosition: number;
    if (isOddRound) {
      expectedTeamPosition = positionInRound;
    } else {
      expectedTeamPosition = totalTeams - positionInRound + 1;
    }
    const expectedOrder = draftOrder.find(
      (order) => order.pick_position === expectedTeamPosition
    );
    return expectedOrder?.team || null;
  }, [draft, draftOrder]);

  // Get teams in draft order
  const teamsInOrder = useMemo(() => {
    return draftOrder
      .sort((a, b) => a.pick_position - b.pick_position)
      .map((order) => order.team);
  }, [draftOrder]);

  // Toggle autodraft for a team
  function toggleAutodraft(teamId: string) {
    setAutodraftTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
    const team = teams.find(t => t.id === teamId);
    if (team) {
      const newState = !autodraftTeams[teamId];
      toast.success(`Autodraft ${newState ? "enabled" : "disabled"} for ${team.name}`);
    }
  }

  // Get the best available player (highest rated, or first alphabetically if no ratings)
  const getBestAvailablePlayer = useCallback(() => {
    if (!availablePlayers || availablePlayers.length === 0) return null;
    
    // Sort by rating (A+ is best, D- is worst), then by name
    const ratingOrder = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-"];
    
    const sorted = [...availablePlayers].sort((a, b) => {
      const aRatingIndex = ratingOrder.indexOf(a.rating || "C");
      const bRatingIndex = ratingOrder.indexOf(b.rating || "C");
      
      if (aRatingIndex !== bRatingIndex) {
        return aRatingIndex - bRatingIndex; // Lower index = better rating
      }
      
      // If same rating, sort alphabetically
      const aName = a.player?.full_name || a.full_name || "";
      const bName = b.player?.full_name || b.full_name || "";
      return aName.localeCompare(bName);
    });
    
    const best = sorted[0];
    if (!best) return null;
    
    // Return a normalized player object with the correct ID
    // availablePlayers can have player_id (from ratings) or player.id (nested)
    const playerId = best.player_id || best.player?.id || best.id;
    const playerName = best.player?.full_name || best.full_name || "Unknown";
    const playerRating = best.rating || "C";
    
    if (!playerId) {
      console.error("Could not determine player ID from:", best);
      return null;
    }
    
    return {
      id: playerId,
      full_name: playerName,
      rating: playerRating,
    };
  }, [availablePlayers]);

  // Clear lastPickedPlayerId when availablePlayers updates (realtime propagated)
  useEffect(() => {
    // If the last picked player is no longer in the available list, clear the ref
    if (lastPickedPlayerId.current) {
      const stillAvailable = availablePlayers.some(p => {
        const playerId = p.player_id || p.player?.id || p.id;
        return playerId === lastPickedPlayerId.current;
      });
      if (!stillAvailable) {
        lastPickedPlayerId.current = null;
      }
    }
  }, [availablePlayers]);

  // Autodraft effect - triggers when it's an autodraft team's turn
  useEffect(() => {
    async function performAutodraft() {
      // Guard conditions
      if (!draft || draft.status !== "in_progress") return;
      if (!currentTeamTurn) return;
      if (!autodraftTeams[currentTeamTurn.id]) return;
      if (availablePlayers.length === 0) return;
      
      // Prevent duplicate autodrafts using ref (more reliable than state)
      if (autodraftInProgress.current) return;
      if (lastAutodraftPick.current === draft.current_pick) return;
      
      const bestPlayer = getBestAvailablePlayer();
      if (!bestPlayer) return;
      
      // Skip if this player was just picked (realtime hasn't updated yet)
      if (lastPickedPlayerId.current === bestPlayer.id) {
        console.log("Skipping autodraft - waiting for available players to update");
        return;
      }
      
      // Mark as in progress
      autodraftInProgress.current = true;
      lastAutodraftPick.current = draft.current_pick;
      setIsAutodrafting(true);
      
      try {
        // Small delay to make it visible that autodraft is happening
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        toast.info(`🤖 Autodrafting for ${currentTeamTurn.name}...`);
        
        const result = await makeDraftPick(draft.id, currentTeamTurn.id, bestPlayer.id);
        
        if (result.error) {
          toast.error(`Autodraft failed: ${result.error}`);
          // Reset so it can retry
          lastAutodraftPick.current = null;
          lastPickedPlayerId.current = null;
        } else {
          toast.success(`🤖 ${currentTeamTurn.name} autodrafted ${bestPlayer.full_name} (${bestPlayer.rating || "Unrated"})`);
          // Track the picked player to avoid duplicate attempts
          lastPickedPlayerId.current = bestPlayer.id;
          
          // Wait for realtime to propagate before allowing next autodraft
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error("Autodraft error:", error);
        toast.error("Autodraft failed unexpectedly");
        lastAutodraftPick.current = null;
        lastPickedPlayerId.current = null;
      } finally {
        setIsAutodrafting(false);
        autodraftInProgress.current = false;
      }
    }
    
    performAutodraft();
  }, [currentTeamTurn, draft, autodraftTeams, availablePlayers.length, getBestAvailablePlayer]);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!season) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No active season found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Draft Management 🎯</h1>
        <p className="text-muted-foreground mt-2">
          Manage league drafts and player assignments
        </p>
      </div>

      {!draftId || !draft ? (
        <Card>
          <CardHeader>
            <CardTitle>Start New Draft</CardTitle>
            <CardDescription>
              Begin a new draft cycle for {season.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Starting a draft will:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Calculate player ratings (A+ through D- based on performance)</li>
                <li>Send email notifications to all team captains</li>
                <li>Begin the snake draft process</li>
                <li>Allow captains to make picks in order</li>
              </ul>
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>📧 Email Notifications:</strong> All team captains will receive an email with draft rules and a link to the draft board.
                </p>
              </div>
              <Button onClick={handleStartDraft} className="bg-canada-red hover:bg-canada-red-dark w-full">
                🎯 Start Draft & Send Notifications
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : draft?.status === "pending" ? (
        <PreDraftScreen
          draftId={draft.id}
          seasonName={season?.name || "Season"}
          isOwner={true}
          onDraftActivated={async () => {
            // Wait a moment for the database to update
            await new Promise(resolve => setTimeout(resolve, 500));
            router.refresh();
            await loadData();
          }}
        />
      ) : (
        <>
          {/* Compact Draft Board Header */}
          {teamsInOrder.length > 0 && (
            <DraftBoardHeader
              teams={teamsInOrder}
              currentPick={draft?.current_pick || 1}
              totalTeams={draftOrder.length || teams.length}
              lastPickedPlayer={lastPickedPlayer}
              lastPickedTeam={lastPickedPlayer?.team}
            />
          )}

          {/* Main Draft Layout - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Left Sidebar - Team Roster & Autodraft */}
            <div className="lg:col-span-1 space-y-4">
              {/* Autodraft Controls */}
              {draft?.status === "in_progress" && (
                <Card className="border-orange-500/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      🤖 Autodraft Settings
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Enable for absent captains
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {teamsInOrder.map((team) => {
                        const isOnClock = currentTeamTurn?.id === team.id;
                        const isAutodraftEnabled = autodraftTeams[team.id] || false;
                        
                        return (
                          <div 
                            key={team.id}
                            className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                              isOnClock 
                                ? "border-2 bg-yellow-500/10" 
                                : "border-muted"
                            }`}
                            style={isOnClock ? { borderColor: team.primary_color } : {}}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: team.primary_color }}
                              >
                                {team.short_name?.slice(0, 2) || team.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-medium truncate max-w-[100px]">
                                  {team.name}
                                </span>
                                {isOnClock && (
                                  <span className="text-[10px] text-orange-600 font-semibold">
                                    ON CLOCK
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {isAutodraftEnabled && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-orange-500/10 text-orange-600 border-orange-500/30">
                                  AUTO
                                </Badge>
                              )}
                              <Switch
                                checked={isAutodraftEnabled}
                                onCheckedChange={() => toggleAutodraft(team.id)}
                                className="scale-75"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {Object.values(autodraftTeams).some(v => v) && (
                      <div className="mt-3 p-2 bg-orange-500/10 rounded-lg border border-orange-500/30">
                        <p className="text-xs text-orange-700 dark:text-orange-400">
                          🤖 Autodraft will pick the <strong>best available player</strong> (by rating) when it&apos;s an enabled team&apos;s turn.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Team Selector for Admin */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">View Team Roster</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: team.primary_color }}
                            />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              
              {/* Team Roster */}
              {selectedTeamId && (
                <MyTeamRoster
                  teamId={selectedTeamId}
                  picks={picks}
                  availablePlayers={availablePlayers}
                  draftId={draftId || undefined}
                  seasonId={season?.id}
                />
              )}
            </div>

            {/* Main Content - Draft Board */}
            <div className="lg:col-span-3 space-y-4">
              {/* Compact Draft Info */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Current Draft</CardTitle>
                      <CardDescription className="text-xs">
                        Cycle {draft.cycle_number} • Pick {draft.current_pick}
                        {isConnected && (
                          <Badge className="ml-2 bg-green-600 text-xs">
                            <span className="w-2 h-2 bg-white rounded-full inline-block mr-1 animate-pulse" />
                            Live
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <Badge className={draft.status === "completed" ? "bg-green-600" : "bg-yellow-600"}>
                      {draft.status === "completed" ? "Completed" : "In Progress"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {picks.length} players drafted
                    {currentTeamTurn && draft.status === "in_progress" && (
                      <span className="ml-2 font-medium">
                        • <span className="text-blue-600">{currentTeamTurn.name}</span> is on the clock
                      </span>
                    )}
                  </p>
                  {draft.status === "completed" && (
                    <div className="mt-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-green-700 dark:text-green-300 font-medium mb-2">
                        ✅ Draft Complete! Players have been assigned to rosters.
                      </p>
                      <div className="flex gap-2">
                        <Button asChild size="sm" className="bg-green-600 hover:bg-green-700">
                          <Link href="/admin/seasons">← Back to Seasons</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href="/teams">View Teams</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Live Draft Board for Owner */}
              {draft?.status === "in_progress" && (
                <Card className="border-2 border-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">🎮 Owner Draft Control Panel</CardTitle>
                    <CardDescription className="text-xs">
                      Click a player to draft them for the team on the clock
                      {isConnected && (
                        <Badge className="ml-2 bg-green-600 text-xs">
                          <span className="w-2 h-2 bg-white rounded-full inline-block mr-1 animate-pulse" />
                          Live
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Prominent Team On Clock Indicator */}
                    {currentTeamTurn && (
                      <div 
                        className={`p-4 rounded-lg border-2 flex items-center justify-between ${
                          isAutodrafting ? "animate-pulse" : ""
                        }`}
                        style={{ 
                          backgroundColor: `${currentTeamTurn.primary_color}15`,
                          borderColor: currentTeamTurn.primary_color 
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                            style={{ backgroundColor: currentTeamTurn.primary_color }}
                          >
                            {currentTeamTurn.short_name || currentTeamTurn.name?.slice(0, 3).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Drafting for:</div>
                            <div className="text-xl font-bold">{currentTeamTurn.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Pick #{draft.current_pick}</div>
                          {isAutodrafting ? (
                            <div className="text-lg font-semibold text-orange-600 flex items-center gap-2">
                              <span className="inline-block w-3 h-3 bg-orange-600 rounded-full animate-bounce" />
                              AUTODRAFTING...
                            </div>
                          ) : autodraftTeams[currentTeamTurn.id] ? (
                            <div className="text-lg font-semibold text-orange-600">
                              🤖 AUTODRAFT ON
                            </div>
                          ) : (
                            <div className="text-lg font-semibold" style={{ color: currentTeamTurn.primary_color }}>
                              ON THE CLOCK
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <LiveDraftBoard
                      draft={draft}
                      availablePlayers={availablePlayers}
                      picks={picks}
                      isMyTurn={true}
                      currentTeamTurn={currentTeamTurn}
                      onPick={(playerId) => {
                        // Auto-pick for current team on clock
                        handleMakePick(playerId, currentTeamTurn?.id);
                      }}
                      isOwner={true}
                      selectedTeamId={currentTeamTurn?.id || selectedTeamId}
                    />
                    
                    {/* Confirmation Dialog (only shown if needed) */}
                    <Dialog open={isPickDialogOpen} onOpenChange={setIsPickDialogOpen}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Confirm Pick</DialogTitle>
                          <DialogDescription>
                            Draft this player for a different team?
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Team</label>
                            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a team" />
                              </SelectTrigger>
                              <SelectContent>
                                {teams.map((team) => (
                                  <SelectItem key={team.id} value={team.id}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded"
                                        style={{ backgroundColor: team.primary_color }}
                                      />
                                      {team.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsPickDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={() => handleMakePick(selectedPlayerId, selectedTeamId)}
                            disabled={!selectedTeamId || !selectedPlayerId || isMakingPick}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isMakingPick ? "Making Pick..." : "Make Pick"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
