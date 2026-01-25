"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getPendingVerificationsCount, getTeamStatsSummary, getRosterWithStats, setPlayerAvailabilityAsCaptain } from "@/lib/captain/stats-queries";
import { getGamesNeedingStats } from "@/lib/stats/actions";
import { requestSubsForGame } from "@/lib/players/availability-actions";
import { CaptainDashboardView } from "@/components/captain/CaptainDashboardView";
import { GameStatEntryModal } from "@/components/captain/GameStatEntryModal";
import { toast } from "sonner";

export default function CaptainDashboardPage() {
  const { user, profile, loading: authLoading, isCaptain } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [season, setSeason] = useState<any>(null);
  const [pendingStats, setPendingStats] = useState<number>(0);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [activeDraft, setActiveDraft] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [requestingSubs, setRequestingSubs] = useState<string | null>(null);
  const [upcomingGame, setUpcomingGame] = useState<any>(null);
  const [updatingAvailability, setUpdatingAvailability] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isCaptain) {
      setLoading(false);
      return;
    }
    loadCaptainData();
  }, [user, profile, isCaptain, authLoading]);

  async function loadCaptainData() {
    if (!user?.id) return;
    const supabase = createClient();
    try {
      const [teamResult, seasonResult] = await Promise.all([
        supabase.from("teams").select("*").eq("captain_id", user.id).single(),
        supabase.from("seasons").select("*").in("status", ["active", "playoffs"]).order("start_date", { ascending: false }).limit(1).single()
      ]);

      if (teamResult.data) {
        setTeam(teamResult.data);
        const sData = seasonResult.data;
        setSeason(sData);

        if (sData) {
          const [rosterResult, pendingResult, statsResult, gamesResult, draftResult] = await Promise.all([
            getRosterWithStats(teamResult.data.id, sData.id),
            getPendingVerificationsCount(teamResult.data.id, sData.id),
            getTeamStatsSummary(teamResult.data.id, sData.id),
            getGamesNeedingStats(teamResult.data.id),
            supabase.from("drafts").select("*, season:seasons(name, status)").in("status", ["pending", "in_progress"]).order("created_at", { ascending: false })
          ]);

          setRoster(rosterResult.roster || []);
          setUpcomingGame(rosterResult.upcomingGame || null);
          setPendingStats(pendingResult.count);
          setTeamStats(statsResult);
          setGames(gamesResult.games || []);
          
          const activeDrafts = (draftResult.data || []).filter((d: any) => 
            ["active", "draft", "playoffs"].includes(d.season?.status)
          );
          if (activeDrafts.length > 0) setActiveDraft(activeDrafts[0]);
        }
      }
    } catch (error) {
      console.error("Captain data error:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateAvailability = async (playerId: string, status: "available" | "unavailable" | "maybe") => {
    if (!upcomingGame || !team) return;
    setUpdatingAvailability(playerId);
    const result = await setPlayerAvailabilityAsCaptain(upcomingGame.id, playerId, team.id, status);
    setUpdatingAvailability(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Attendance updated");
      loadCaptainData();
    }
  };

  const handleRequestSubs = async (gameId: string) => {
    setRequestingSubs(gameId);
    const result = await requestSubsForGame(gameId);
    setRequestingSubs(null);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Sub players can now check in!");
      loadCaptainData();
    }
  };

  return (
    <>
      <CaptainDashboardView 
        team={team}
        season={season}
        roster={roster}
        pendingStats={pendingStats}
        teamStats={teamStats}
        activeDraft={activeDraft}
        games={games}
        onEnterStats={(id) => setSelectedGameId(id)}
        onRequestSubs={handleRequestSubs}
        requestingSubs={requestingSubs}
        onUpdateAvailability={handleUpdateAvailability}
        updatingAvailability={updatingAvailability}
        upcomingGame={upcomingGame}
        loading={authLoading || loading}
        user={user}
      />

      {selectedGameId && (
        <GameStatEntryModal
          gameId={selectedGameId}
          isOpen={!!selectedGameId}
          onClose={() => setSelectedGameId(null)}
          onSuccess={() => {
            setSelectedGameId(null);
            loadCaptainData();
          }}
        />
      )}
    </>
  );
}