"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getPlayerStats } from "@/lib/stats/queries";
import { getUpcomingGameForCheckIn, checkInToGame } from "@/lib/players/availability-actions";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { useActiveLeague } from "@/hooks/use-league";
import { currentLeague } from "@/lib/league-config";

export default function DashboardPage() {
  const { user, profile, loading: authLoading, error: authError } = useAuth();
  const { leagueId, isLoading: leagueLoading } = useActiveLeague();
  const [stats, setStats] = useState<any>(null);
  const [nextGame, setNextGame] = useState<any>(null);
  const [checkInData, setCheckInData] = useState<any>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || leagueLoading) return;
    if (!user || !leagueId) {
      setLoading(false);
      return;
    }
    loadDashboardData();
  }, [user, authLoading, leagueId, leagueLoading]);

  async function loadDashboardData() {
    if (!leagueId) return;
    const supabase = createClient();
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timeout")), 30000)
      );

      const dataPromise = (async () => {
        const { data: activeSeason } = await supabase
          .from("seasons")
          .select("id, name, status")
          .eq("league_id", leagueId)
          .in("status", ["active", "playoffs"])
          .order("start_date", { ascending: false })
          .limit(1)
          .single();

        if (!activeSeason) {
          setLoading(false);
          return;
        }

        const [statsResult, rosterResult] = await Promise.all([
          getPlayerStats(user?.id || "", activeSeason.id).catch(() => ({ totals: null })),
          supabase
            .from("team_rosters")
            .select("team_id")
            .eq("player_id", user?.id)
            .eq("season_id", activeSeason.id)
            .single()
        ]);

        if (statsResult?.totals) setStats(statsResult.totals);

        if (rosterResult.data) {
          const now = new Date().toISOString();
          const { data: nextGameData } = await supabase
            .from("games")
            .select(`
              id,
              scheduled_at,
              location,
              home_team:teams!games_home_team_id_fkey(name, short_name),
              away_team:teams!games_away_team_id_fkey(name, short_name)
            `)
            .eq("season_id", activeSeason.id)
            .or(`home_team_id.eq.${rosterResult.data.team_id},away_team_id.eq.${rosterResult.data.team_id}`)
            .gte("scheduled_at", now)
            .in("status", ["scheduled", "in_progress"])
            .order("scheduled_at", { ascending: true })
            .limit(1)
            .single();

          if (nextGameData) setNextGame(nextGameData);
        }

        const checkIn = await getUpcomingGameForCheckIn();
        setCheckInData(checkIn);
      })();

      await Promise.race([dataPromise, timeoutPromise]);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const handleCheckIn = async (status: "available" | "unavailable" | "maybe") => {
    setIsCheckingIn(true);
    try {
      const result = await checkInToGame(checkInData.game.id, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Checked in as ${status}!`);
        const newCheckIn = await getUpcomingGameForCheckIn();
        setCheckInData(newCheckIn);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to check in");
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (authError) {
    return (
      <div className="py-12 text-center">
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground mb-4">{authError}</p>
            <button onClick={() => window.location.reload()} className="btn-hockey-primary">Refresh</button>
          </CardContent>
        </Card>
      </div>
    );
  }

    return (

      <DashboardView 

        profile={profile}

        stats={stats}

        nextGame={nextGame}

        checkInData={checkInData}

        isCheckingIn={isCheckingIn}

        onCheckIn={handleCheckIn}

        loading={authLoading || loading || leagueLoading}

        error={error}

        activeLeague={leagueId ? { id: leagueId, name: currentLeague.name } : undefined}

      />

    );

  }

  