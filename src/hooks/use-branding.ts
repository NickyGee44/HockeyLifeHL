"use client";

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
 * Platform default branding
 */
const PLATFORM_BRANDING: SimpleBranding = {
  logo: "/BLH-Logo.png",
  name: "Beer League Hockey",
  primaryColor: "#1F4FD8",
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
 * @param leagueId - Optional league ID (currently unused, reserved for future)
 * @returns SimpleBranding object with logo and name
 */
export function useBranding(leagueId?: string | null): SimpleBranding {
  // For now, always return platform branding for auth pages
  // Auth pages are shown on the platform domain
  // League-specific auth would redirect to platform first
  return PLATFORM_BRANDING;
}
