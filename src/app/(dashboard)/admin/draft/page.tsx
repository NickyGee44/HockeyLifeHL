"use client";

import { useEffect, useState, useMemo } from "react";
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
    const targetTeamId = teamId || selectedTeamId;
    const targetPlayerId = playerId || selectedPlayerId;
    
    if (!draft || !targetTeamId || !targetPlayerId) {
      toast.error("Please select both a team and a player");
      return;
    }

    setIsMakingPick(true);
    const result = await makeDraftPick(draft.id, targetTeamId, targetPlayerId);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Pick made successfully!");
      setIsPickDialogOpen(false);
      setSelectedTeamId("");
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
            {/* Left Sidebar - Team Roster */}
            <div className="lg:col-span-1 space-y-4">
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
                    <Button onClick={handleCompleteDraft} className="mt-2 bg-green-600 hover:bg-green-700 text-sm">
                      Complete Draft & Assign Players
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Live Draft Board for Owner */}
              {draft?.status === "in_progress" && (
                <Card className="border-2 border-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">🎮 Owner Draft Control Panel</CardTitle>
                    <CardDescription className="text-xs">
                      Make picks for any team
                      {isConnected && (
                        <Badge className="ml-2 bg-green-600 text-xs">
                          <span className="w-2 h-2 bg-white rounded-full inline-block mr-1 animate-pulse" />
                          Live
                        </Badge>
                      )}
                      {currentTeamTurn && (
                        <span className="block mt-1 text-xs font-medium">
                          Current turn: <span className="text-blue-600">{currentTeamTurn.name}</span>
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LiveDraftBoard
                      draft={draft}
                      availablePlayers={availablePlayers}
                      picks={picks}
                      isMyTurn={true}
                      currentTeamTurn={currentTeamTurn}
                      onPick={(playerId) => {
                        // For owner, show team selector dialog
                        setSelectedPlayerId(playerId);
                        setIsPickDialogOpen(true);
                      }}
                      isOwner={true}
                      selectedTeamId={selectedTeamId}
                    />
                    
                    {/* Team Selector Dialog for Owner */}
                    <Dialog open={isPickDialogOpen} onOpenChange={setIsPickDialogOpen}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Select Team</DialogTitle>
                          <DialogDescription>
                            Which team should draft this player?
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
