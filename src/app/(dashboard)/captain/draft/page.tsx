"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getCurrentDraft, getAvailableDraftPlayers, makeDraftPick } from "@/lib/draft/actions";
import { getAllSeasons } from "@/lib/seasons/actions";
import { useDraftRealtime } from "@/hooks/useDraftRealtime";
import { LiveDraftBoard } from "@/components/draft/LiveDraftBoard";
import { DraftBoardHeader } from "@/components/draft/DraftBoardHeader";
import { PreDraftScreen } from "@/components/draft/PreDraftScreen";
import { MyTeamRoster } from "@/components/draft/MyTeamRoster";
import { getDraftOrder } from "@/lib/draft/draft-order";
import { getLastPickedPlayer } from "@/lib/draft/actions";
import { toast } from "sonner";

export default function CaptainDraftPage() {
  const { user, loading: authLoading, isCaptain } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [season, setSeason] = useState<any>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [draftOrder, setDraftOrder] = useState<any[]>([]);
  const [lastPickedPlayer, setLastPickedPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMyTurn, setIsMyTurn] = useState(false);

  // Use real-time hook for draft updates
  const { draft, picks, isConnected } = useDraftRealtime(draftId);

  useEffect(() => {
    if (user && isCaptain) {
      loadData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, isCaptain, authLoading]);

  // Load available players periodically (they don't change during draft)
  useEffect(() => {
    if (draftId) {
      loadAvailablePlayers();
      const interval = setInterval(loadAvailablePlayers, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [draftId]);

  async function loadData() {
    try {
      const supabase = createClient();
      
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      // Get team
      const { data: teamData } = await supabase
        .from("teams")
        .select("*")
        .eq("captain_id", user.id)
        .single();

      if (!teamData) {
        setLoading(false);
        return;
      }

      setTeam(teamData);

      // Get season (check for active, playoffs, or draft status)
      // Check for draft link in URL params
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const draftLinkParam = urlParams?.get("draft") || null;

      const seasonsResult = await getAllSeasons();
      const activeSeason = seasonsResult.seasons?.find((s: any) => 
        s.status === "active" || s.status === "playoffs" || s.status === "draft"
      );

      if (activeSeason) {
        setSeason(activeSeason);
        // Use draft link if provided, otherwise use season ID
        const draftResult = await getCurrentDraft(activeSeason.id, draftLinkParam || undefined);
        if (draftResult.draft) {
          const newDraftId = draftResult.draft.id;
          setDraftId(newDraftId);
          // Pass draftId directly to avoid race condition
          await loadDraftData(newDraftId);
        } else {
          setDraftId(null);
        }
      } else {
        setDraftId(null);
      }
    } catch (error) {
      console.error("Error loading draft data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDraftData(draftIdParam?: string) {
    const id = draftIdParam || draftId;
    if (!id) return;
    
    try {
      await Promise.all([
        loadAvailablePlayers(id),
        loadDraftOrder(id),
        loadLastPickedPlayer(id),
      ]);
    } catch (error) {
      console.error("Error loading draft data:", error);
    }
  }

  async function loadDraftOrder(draftIdParam?: string) {
    const id = draftIdParam || draftId;
    if (!id) return;
    try {
      const result = await getDraftOrder(id);
      if (result.order) {
        setDraftOrder(result.order);
      }
    } catch (error) {
      console.error("Error loading draft order:", error);
    }
  }

  async function loadLastPickedPlayer(draftIdParam?: string) {
    const id = draftIdParam || draftId;
    if (!id) return;
    try {
      const result = await getLastPickedPlayer(id);
      if (result.player) {
        setLastPickedPlayer(result.player);
      }
    } catch (error) {
      console.error("Error loading last picked player:", error);
    }
  }

  async function loadAvailablePlayers(draftIdParam?: string) {
    const id = draftIdParam || draftId;
    if (!id) return;
    try {
      const playersResult = await getAvailableDraftPlayers(id);
      setAvailablePlayers(playersResult.players || []);
    } catch (error) {
      console.error("Error loading available players:", error);
    }
  }

  // Load draft order when draft changes
  useEffect(() => {
    if (draftId && draft?.status === "in_progress") {
      loadDraftOrder(draftId);
      loadLastPickedPlayer(draftId);
    }
  }, [draftId, draft?.status, picks.length]);

  // Calculate if it's this team's turn (using draft order)
  useEffect(() => {
    if (draft && team && draftOrder.length > 0 && draft.status === "in_progress") {
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

      const expectedTeam = draftOrder.find(
        (order) => order.pick_position === expectedTeamPosition
      );

      setIsMyTurn(expectedTeam?.team_id === team.id);
    } else {
      setIsMyTurn(false);
    }
  }, [draft, team, draftOrder]);

  async function handlePick(playerId: string) {
    if (!draft || !team) return;

    const result = await makeDraftPick(draft.id, team.id, playerId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Player drafted! 🎉");
      // Real-time hook will update automatically
    }
  }

  // Calculate current team turn using draft order
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

  // Calculate draft info
  const totalTeams = draftOrder.length || 1;
  const round = totalTeams > 0 ? Math.ceil((draft?.current_pick || 1) / totalTeams) : 1;
  const totalRounds = 10; // Assuming 10 rounds
  const progress = totalTeams > 0 ? ((draft?.current_pick || 0) / (totalTeams * totalRounds)) * 100 : 0;

  if (loading || authLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!isCaptain || !team) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">You must be a team captain to access the draft.</p>
        </CardContent>
      </Card>
    );
  }

  // Only show "Draft Not Started" if we've finished loading and there's no draftId
  if (!loading && !draftId && !draft) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏒</div>
          <h1 className="text-3xl font-bold mb-2">Draft Not Started</h1>
          <p className="text-muted-foreground">
            The league owner will start the draft soon. You'll receive an email notification when it begins!
          </p>
        </div>
      </div>
    );
  }

  // If we have a draftId but draft hasn't loaded yet from real-time hook, show loading
  if (draftId && !draft && !loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  // If we still don't have a draft after loading, show not started
  if (!draft) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏒</div>
          <h1 className="text-3xl font-bold mb-2">Draft Not Started</h1>
          <p className="text-muted-foreground">
            The league owner will start the draft soon. You'll receive an email notification when it begins!
          </p>
        </div>
      </div>
    );
  }

  // Show pre-draft screen if draft is pending
  if (draft.status === "pending") {
    return (
      <PreDraftScreen
        draftId={draft.id}
        seasonName={season?.name || "Season"}
        isOwner={false}
        onDraftActivated={async () => {
          // Wait a moment for the database to update
          await new Promise(resolve => setTimeout(resolve, 500));
          await loadData();
        }}
      />
    );
  }


  return (
    <div className="space-y-4">
      {/* Compact Draft Board Header */}
      {teamsInOrder.length > 0 && (
        <DraftBoardHeader
          teams={teamsInOrder}
          currentPick={draft?.current_pick || 1}
          totalTeams={totalTeams}
          lastPickedPlayer={lastPickedPlayer}
          lastPickedTeam={lastPickedPlayer?.team}
        />
      )}

      {/* Main Draft Layout - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar - My Team Roster */}
        {team && (
          <div className="lg:col-span-1">
            <MyTeamRoster
              teamId={team.id}
              picks={picks}
              availablePlayers={availablePlayers}
              draftId={draftId || undefined}
              seasonId={season?.id}
            />
          </div>
        )}

        {/* Main Content - Draft Board */}
        <div className="lg:col-span-3 space-y-4">
          {/* Compact Draft Header */}
          <div className="relative overflow-hidden rounded-lg border bg-gradient-to-r from-canada-red via-rink-blue to-gold p-4 text-white">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-2xl font-bold">🎯 LIVE DRAFT</h1>
                  <p className="text-sm opacity-90">{season?.name} Season</p>
                  {isConnected && (
                    <Badge className="mt-1 bg-green-600 text-xs">
                      <span className="w-2 h-2 bg-white rounded-full inline-block mr-1 animate-pulse" />
                      Live
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">Round {round}</div>
                  <div className="text-xs opacity-75">Pick #{draft?.current_pick || 0}</div>
                </div>
              </div>
              
              {/* Compact Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Compact Turn Indicator */}
              {isMyTurn && draft?.status === "in_progress" ? (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 border-2 border-white animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">⏰</div>
                    <div>
                      <p className="font-bold text-sm">IT'S YOUR TURN TO PICK!</p>
                      <p className="text-xs opacity-90">Select a player below</p>
                    </div>
                  </div>
                </div>
              ) : draft?.status === "in_progress" && currentTeamTurn ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                  <p className="text-xs">
                    ⏳ <strong>{currentTeamTurn.name}</strong> is on the clock...
                  </p>
                </div>
              ) : draft?.status === "completed" ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                  <p className="text-xs">✅ Draft completed</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Live Draft Board - Compact */}
          <LiveDraftBoard
            draft={draft}
            availablePlayers={availablePlayers}
            picks={picks}
            isMyTurn={isMyTurn}
            currentTeamTurn={currentTeamTurn}
            onPick={handlePick}
          />
        </div>
      </div>
    </div>
  );
}
