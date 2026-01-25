"use client";

import { useEffect } from "react";
import { currentLeague } from "@/lib/league-config";

export function ThemeColorManager() {
  useEffect(() => {
    const root = document.documentElement;
    
    // Inject colors from league config into CSS variables
    if (currentLeague.colors.primary) {
      root.style.setProperty("--primary", currentLeague.colors.primary);
      root.style.setProperty("--canada-red", currentLeague.colors.primary);
    }
    
    if (currentLeague.colors.secondary) {
      root.style.setProperty("--secondary", currentLeague.colors.secondary);
      root.style.setProperty("--rink-blue", currentLeague.colors.secondary);
    }
    
    if (currentLeague.colors.accent) {
      root.style.setProperty("--accent", currentLeague.colors.accent);
      root.style.setProperty("--gold-accent", currentLeague.colors.accent);
    }

    // You could also derive darker/lighter shades here if needed
  }, []);

  return null; // This component doesn't render anything
}
