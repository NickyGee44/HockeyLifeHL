"use client";

import { platformConfig } from "@/lib/league-config";

/**
 * Simple branding object with logo and name
 * Used for components that need basic branding in both platform and league contexts
 */
export interface SimpleBranding {
  logo: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
}

/**
 * Platform default branding (from league-config for consistency)
 */
const PLATFORM_BRANDING: SimpleBranding = {
  logo: platformConfig.icon,
  name: platformConfig.name,
  primaryColor: platformConfig.brandColor,
  secondaryColor: "#D72638",
};

/**
 * Hook that provides branding for both platform and league contexts
 *
 * - On platform domain (no leagueId): Returns Beer League Hockey branding
 * - On league subdomain (with leagueId): Returns platform branding for now
 *   (league branding will be fetched via LeagueThemeProvider in league routes)
 *
 * This is a simple hook for auth pages that need basic branding without
 * complex league context.
 *
 * NO LEAGUE CONTEXT REQUIRED: This hook works on the platform domain
 * even when the user has no league selected or is not a member of any league.
 *
 * @param leagueId - Optional league ID (currently unused, reserved for future)
 * @returns SimpleBranding object with logo and name
 */
export function useBranding(leagueId?: string | null): SimpleBranding {
  // Always return platform branding for auth pages
  // This works without any league context - platform domain users, free agents, etc.
  return PLATFORM_BRANDING;
}
