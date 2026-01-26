"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// Mock implementation until Agent 2 provides real league context
export function useActiveLeague() {
  const params = useParams();
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check URL params for [league]
    if (params?.league) {
      setLeagueId(params.league as string);
    } 
    // 2. Check localStorage/cookies (mocking Agent 2 logic)
    else {
      const stored = typeof window !== "undefined" ? localStorage.getItem("activeLeagueId") : null;
      setLeagueId(stored || "aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"); // Default to League #1
    }
    setIsLoading(false);
  }, [params]);

  const switchLeague = (id: string) => {
    setLeagueId(id);
    localStorage.setItem("activeLeagueId", id);
    // In real app, this would update session/cookie
  };

  return { 
    leagueId, 
    isLoading, 
    switchLeague,
    // Add branding if needed
    branding: {
      name: "HockeyLifeHL",
      logo: "/logo.png"
    }
  };
}
