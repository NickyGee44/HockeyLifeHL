"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getActiveLeagueId, setActiveLeagueId, getUserLeagues } from "@/lib/auth/league-context";
import type { LeagueMembership } from "@/lib/auth/league-context";

export function useActiveLeague() {
  const params = useParams();
  const router = useRouter();
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<LeagueMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeagueContext() {
      try {
        setIsLoading(true);

        // 1. Check URL params for [league] (for dynamic routes)
        if (params?.league) {
          setLeagueId(params.league as string);
          setIsLoading(false);
          return;
        }

        // 2. Get active league from server cookie
        const activeId = await getActiveLeagueId();

        if (activeId) {
          setLeagueId(activeId);
        } else {
          // No active league set - fetch user's leagues and set the first one
          const { leagues: userLeagues, error: leaguesError } = await getUserLeagues();

          if (leaguesError) {
            setError(leaguesError);
          } else if (userLeagues && userLeagues.length > 0) {
            // Auto-select first league
            const firstLeague = userLeagues[0].league_id;
            await setActiveLeagueId(firstLeague);
            setLeagueId(firstLeague);
            setLeagues(userLeagues);
          } else {
            setError("No leagues found. Please contact support.");
          }
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error("Error loading league context:", err);
        setError(err.message || "Failed to load league context");
        setIsLoading(false);
      }
    }

    loadLeagueContext();
  }, [params]);

  const switchLeague = async (id: string) => {
    try {
      const result = await setActiveLeagueId(id);

      if (result.error) {
        console.error("Failed to switch league:", result.error);
        return;
      }

      setLeagueId(id);
      // Refresh the page to reload with new league context
      router.refresh();
    } catch (err: any) {
      console.error("Error switching league:", err);
    }
  };

  return {
    leagueId,
    leagues,
    isLoading,
    error,
    switchLeague,
  };
}
