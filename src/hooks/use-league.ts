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

        // 2. Check if we're on a league subdomain (e.g., pilot.beerleaguehockey.ca)
        let isPlatformDomain = false;
        try {
          const response = await fetch('/api/league/context');
          if (response.ok) {
            const data = await response.json();

            // If we detected a league from subdomain/custom domain, use it
            if (data.league && data.league.id) {
              console.log('[useActiveLeague] Detected league from subdomain:', data.league.name);
              setLeagueId(data.league.id);
              setIsLoading(false);
              return;
            }

            // If we're on platform domain (no league detected), DON'T auto-select
            if (data.isPlatform) {
              console.log('[useActiveLeague] On platform domain - no league context');
              isPlatformDomain = true;
              setLeagueId(null);
              setIsLoading(false);
              return;
            }
          }
        } catch (apiError) {
          console.warn('[useActiveLeague] Failed to fetch league context from API:', apiError);
          // Continue with other methods if API fails
        }

        // If we're on platform domain, stop here (don't auto-select a league)
        if (isPlatformDomain) {
          setIsLoading(false);
          return;
        }

        // 3. Get active league from server cookie (only if NOT on platform domain)
        const activeId = await getActiveLeagueId();

        if (activeId) {
          setLeagueId(activeId);
        } else {
          // No active league set - on platform domain, leave as null
          // User can select a league via LeagueSelector dropdown
          console.log('[useActiveLeague] No active league - user should select one');
          setLeagueId(null);
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
