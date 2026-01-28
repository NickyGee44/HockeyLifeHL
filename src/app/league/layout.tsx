import { getLeagueFromHostname } from "@/lib/context/league-context";
import { LeagueThemeProvider } from "@/components/providers/LeagueThemeProvider";
import { LeagueHeader } from "@/components/layout/LeagueHeader";
import { LeagueFooter } from "@/components/layout/LeagueFooter";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

// Force dynamic rendering (uses headers())
export const dynamic = 'force-dynamic';

/**
 * League Layout Wrapper
 *
 * This layout wraps all league-specific pages when accessed via
 * subdomain (pilot.beerleaguehockey.ca) or custom domain.
 *
 * Responsibilities:
 * 1. Fetch league branding from hostname
 * 2. Redirect to platform if no league found
 * 3. Pass branding data to LeagueThemeProvider
 * 4. Provide league context to all child components
 */

export default async function LeagueLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Get league branding from the hostname header set by middleware
  const league = await getLeagueFromHostname();

  // If no league found, redirect to platform root
  // This handles cases where:
  // - Invalid subdomain
  // - Custom domain not configured
  // - Custom domain not verified
  if (!league) {
    console.warn('[League Layout] No league found - redirecting to platform');
    redirect('/');
  }

  // Log for debugging
  console.log('[League Layout] Rendering league:', league.name, 'with branding:', {
    primaryColor: league.primaryColor,
    secondaryColor: league.secondaryColor,
    accentColor: league.accentColor,
  });

  return (
    <LeagueThemeProvider league={league}>
      <div
        className="min-h-screen flex flex-col"
        style={{
          fontFamily: league.fontFamily,
        }}
      >
        <LeagueHeader league={league} />
        <main className="flex-1">{children}</main>
        <LeagueFooter league={league} />
      </div>
    </LeagueThemeProvider>
  );
}

/**
 * Generate metadata for league pages
 */
export async function generateMetadata() {
  const league = await getLeagueFromHostname();

  if (!league) {
    return {
      title: 'League Not Found',
    };
  }

  return {
    title: {
      template: `%s | ${league.name}`,
      default: league.name,
    },
    description: league.tagline || `Welcome to ${league.name}`,
    icons: league.faviconUrl
      ? {
          icon: league.faviconUrl,
        }
      : undefined,
  };
}
