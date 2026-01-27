"use client";

import { useEffect } from "react";
import { platformConfig } from "@/lib/league-config";

export function ThemeColorManager() {
  useEffect(() => {
    const root = document.documentElement;

    // Inject platform colors from config into CSS variables
    // These are the Beer League Hockey platform colors
    if (platformConfig.colors.rinkBlue) {
      root.style.setProperty("--rink-blue", platformConfig.colors.rinkBlue);
      root.style.setProperty("--primary", platformConfig.colors.rinkBlue);
    }

    if (platformConfig.colors.goalRed) {
      root.style.setProperty("--canada-red", platformConfig.colors.goalRed);
      root.style.setProperty("--goal-light-red", platformConfig.colors.goalRed);
    }

    if (platformConfig.colors.midnight) {
      root.style.setProperty("--puck-black", platformConfig.colors.midnight);
    }

    // Note: League-specific pages (e.g., pilot.beerleaguehockey.ca)
    // use LeagueThemeProvider which overrides these with database branding
  }, []);

  return null; // This component doesn't render anything
}
