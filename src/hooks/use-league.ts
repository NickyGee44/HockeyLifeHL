"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getActiveLeagueId, setActiveLeagueId, getUserLeagues } from "@/lib/auth/league-context";
import type { LeagueMembership } from "@/lib/auth/league-context";

export function useActiveLeague() {
  const params = useParams();
  const router = useRouter();
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [leagueSlug, setLeagueSlug] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<LeagueMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeagueContext() {
      try {
        setIsLoading(true);

        // 1. Check URL params for [league] (for dynamic routes)
        if (params?.league) {
          const id = params.league as string;
          setLeagueId(id);
          await fetchLeagueDetails(id);
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
              setLeagueSlug(data.league.slug);
              setLeagueName(data.league.name);
              setIsLoading(false);
              return;
            }

            // If we're on platform domain (no league detected), continue to check cookie
            if (data.isPlatform) {
              console.log('[useActiveLeague] On platform domain - checking cookie for active league');
              isPlatformDomain = true;
              // Don't return early - let it check the cookie below
            }
          }
        } catch (apiError) {
          console.warn('[useActiveLeague] Failed to fetch league context from API:', apiError);
          // Continue with other methods if API fails
        }

        // 3. Get active league from server cookie (works on both platform and league domains)
        const activeId = await getActiveLeagueId();

        if (activeId) {
          setLeagueId(activeId);
          await fetchLeagueDetails(activeId);
        } else {
          // No active league set - on platform domain, leave as null
          // User can select a league via LeagueSelector dropdown
          console.log('[useActiveLeague] No active league - user should select one');
          setLeagueId(null);
          setLeagueSlug(null);
          setLeagueName(null);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error("Error loading league context:", err);
        setError(err.message || "Failed to load league context");
        setIsLoading(false);
      }
    }

    async function fetchLeagueDetails(id: string) {
      try {
        // Fetch league details from user's leagues
        const userLeagues = await getUserLeagues();
        const league = userLeagues.leagues.find((l: LeagueMembership) => l.league_id === id);

        if (league && league.league) {
          setLeagueSlug(league.league.slug);
          setLeagueName(league.league.name);
        }
      } catch (err) {
        console.error('[useActiveLeague] Error fetching league details:', err);
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
    leagueSlug,
    leagueName,
    leagues,
    isLoading,
    error,
    switchLeague,
  };
}
