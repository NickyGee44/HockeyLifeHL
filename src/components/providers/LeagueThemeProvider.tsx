"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { LeagueBranding } from "@/lib/context/league-context";
import type { SiteTemplate, TemplateCustomization } from "@/types/site-templates";
import { generateCssVariables, applyCssVariables, removeCssVariables } from "@/lib/templates/template-applier";

/**
 * League Theme Provider
 *
 * Client-side provider that:
 * 1. Sets CSS variables on document root for league branding
 * 2. Injects custom CSS if provided by league
 * 3. Provides league branding data to child components via context
 *
 * Usage in Server Components:
 * ```tsx
 * const league = await getLeagueFromHostname();
 * return (
 *   <LeagueThemeProvider league={league}>
 *     {children}
 *   </LeagueThemeProvider>
 * );
 * ```
 *
 * Usage in Client Components:
 * ```tsx
 * const league = useLeagueBranding();
 * return <div style={{ color: league.primaryColor }}>...</div>
 * ```
 */

// Context for league branding data
const LeagueBrandingContext = createContext<LeagueBranding | null>(null);

/**
 * Hook to access league branding in client components
 * Throws error if used outside of LeagueThemeProvider
 */
export function useLeagueBranding(): LeagueBranding {
  const context = useContext(LeagueBrandingContext);
  if (!context) {
    throw new Error(
      "useLeagueBranding must be used within LeagueThemeProvider. " +
      "This hook is only available in league contexts (subdomains and custom domains)."
    );
  }
  return context;
}

interface LeagueThemeProviderProps {
  league: LeagueBranding;
  children: ReactNode;
  /** Optional site template (enhances league branding) */
  template?: SiteTemplate | null;
  /** Optional template customizations */
  customizations?: TemplateCustomization | null;
  /** Selected color preset index (if using template) */
  presetIndex?: number;
}

/**
 * Provider component that sets CSS variables and provides league context
 */
export function LeagueThemeProvider({
  league,
  children,
  template,
  customizations,
  presetIndex,
}: LeagueThemeProviderProps) {
  // Apply template CSS variables if template is provided
  useEffect(() => {
    if (!template) {
      return;
    }

    console.log("[LeagueThemeProvider] Applying template:", template.slug);

    const templateVars = generateCssVariables(template, customizations || undefined, presetIndex);
    applyCssVariables(templateVars);

    // Cleanup: Remove template CSS variables on unmount or template change
    return () => {
      removeCssVariables(templateVars);
      console.log("[LeagueThemeProvider] Removed template CSS variables");
    };
  }, [template, customizations, presetIndex]);

  // Set CSS variables on document root when branding changes (legacy support)
  useEffect(() => {
    const root = document.documentElement;

    // Set CSS custom properties for use in Tailwind classes
    // Example: className="bg-[var(--league-primary-color)]"
    root.style.setProperty("--league-primary-color", league.primaryColor);
    root.style.setProperty("--league-secondary-color", league.secondaryColor);
    root.style.setProperty("--league-accent-color", league.accentColor);
    root.style.setProperty("--league-font-family", league.fontFamily);

    // Also set shorter aliases for convenience
    root.style.setProperty("--primary-color", league.primaryColor);
    root.style.setProperty("--secondary-color", league.secondaryColor);
    root.style.setProperty("--accent-color", league.accentColor);

    console.log("[LeagueThemeProvider] CSS variables set:", {
      primary: league.primaryColor,
      secondary: league.secondaryColor,
      accent: league.accentColor,
      font: league.fontFamily,
    });

    // Cleanup: Remove custom properties on unmount (though unlikely to unmount)
    return () => {
      root.style.removeProperty("--league-primary-color");
      root.style.removeProperty("--league-secondary-color");
      root.style.removeProperty("--league-accent-color");
      root.style.removeProperty("--league-font-family");
      root.style.removeProperty("--primary-color");
      root.style.removeProperty("--secondary-color");
      root.style.removeProperty("--accent-color");
    };
  }, [league.primaryColor, league.secondaryColor, league.accentColor, league.fontFamily]);

  // Inject custom CSS if provided by league
  useEffect(() => {
    if (!league.customCss) {
      return;
    }

    console.log("[LeagueThemeProvider] Injecting custom CSS:", league.customCss.substring(0, 100) + "...");

    // Create a style element for custom CSS
    const styleElement = document.createElement("style");
    styleElement.id = "league-custom-css";
    styleElement.textContent = league.customCss;
    document.head.appendChild(styleElement);

    // Cleanup: Remove custom CSS on unmount or when CSS changes
    return () => {
      const existingStyle = document.getElementById("league-custom-css");
      if (existingStyle) {
        existingStyle.remove();
        console.log("[LeagueThemeProvider] Removed custom CSS");
      }
    };
  }, [league.customCss]);

  return (
    <LeagueBrandingContext.Provider value={league}>
      {children}
    </LeagueBrandingContext.Provider>
  );
}

/**
 * Optional hook that returns league branding or null if not in league context
 * Useful for components that need to work in both platform and league contexts
 */
export function useLeagueBrandingOptional(): LeagueBranding | null {
  return useContext(LeagueBrandingContext);
}
