"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { cache } from "react";

/**
 * League Context Provider
 *
 * Server-side utilities for retrieving league branding and context
 * from the current request hostname. Uses React's cache() for
 * request-level memoization to prevent duplicate database queries.
 *
 * Performance targets:
 * - Cached lookup: < 5ms
 * - Uncached lookup: < 50ms
 */

/**
 * League branding data structure
 * Maps database columns to camelCase TypeScript interface
 */
export type LeagueBranding = {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  logoUrl: string | null;
  bannerUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCss: string | null;
  tagline: string | null;
  status: string;
};

/**
 * Database row type returned by get_league_by_hostname RPC function
 */
type LeagueFromHostnameRow = {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  custom_css: string | null;
  status: string;
  // Note: banner_url and tagline may not be in RPC return - we handle this gracefully
};

/**
 * Map database row to LeagueBranding interface
 */
function mapToLeagueBranding(data: LeagueFromHostnameRow): LeagueBranding {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    subdomain: data.subdomain,
    customDomain: data.custom_domain,
    customDomainVerified: data.custom_domain_verified ?? false,
    logoUrl: data.logo_url,
    bannerUrl: null, // May need to add to RPC if needed
    faviconUrl: data.favicon_url,
    primaryColor: data.primary_color || '#1F4FD8',
    secondaryColor: data.secondary_color || '#D72638',
    accentColor: data.accent_color || '#FFD700',
    fontFamily: data.font_family || 'Inter, system-ui, sans-serif',
    customCss: data.custom_css,
    tagline: null, // May need to add to RPC if needed
    status: data.status || 'active',
  };
}

/**
 * Get league branding from the current request hostname
 *
 * Uses React's cache() to memoize the result within a single request,
 * preventing duplicate database queries when multiple components
 * call this function in the same render.
 *
 * @returns LeagueBranding if a league is found, null for platform context
 */
export const getLeagueFromHostname = cache(async (): Promise<LeagueBranding | null> => {
  try {
    const headersList = await headers();
    const hostname = headersList.get('x-league-hostname');
    const subdomain = headersList.get('x-league-subdomain');

    // No league headers = platform context (not a league instance)
    if (!hostname) {
      console.log('[League Context] No hostname header - platform context');
      return null;
    }

    console.log('[League Context] Looking up league for hostname:', hostname, 'subdomain:', subdomain);

    const supabase = await createClient();

    // Call the database function to get league by hostname
    // This function handles both subdomains and custom domains
    // Note: Using type assertion because get_league_by_hostname was added by Agent 1's migration
    // and the database types may not be regenerated yet
    const { data, error } = await (supabase as any)
      .rpc('get_league_by_hostname', { hostname })
      .maybeSingle() as { data: LeagueFromHostnameRow | null; error: any };

    if (error) {
      console.error('[League Context] Database error:', { hostname, error: error.message });
      return null;
    }

    if (!data) {
      console.warn('[League Context] No league found for hostname:', hostname);
      return null;
    }

    console.log('[League Context] Found league:', data.name, 'id:', data.id);

    return mapToLeagueBranding(data);
  } catch (err) {
    console.error('[League Context] Unexpected error:', err);
    return null;
  }
});

/**
 * Get the current league hostname from request headers
 * Useful for client-side code that needs to know the hostname
 *
 * @returns hostname string or null if not in league context
 */
export async function getLeagueHostname(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('x-league-hostname');
  } catch {
    return null;
  }
}

/**
 * Get the current league subdomain from request headers
 * Returns null for custom domains (they don't have a subdomain)
 *
 * @returns subdomain string or null
 */
export async function getLeagueSubdomain(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get('x-league-subdomain');
  } catch {
    return null;
  }
}

/**
 * Check if the current request is in a league context
 * (as opposed to the platform marketing site)
 *
 * @returns true if in league context, false for platform
 */
export async function isLeagueContext(): Promise<boolean> {
  const hostname = await getLeagueHostname();
  return hostname !== null;
}

/**
 * Get league by ID (useful for admin pages where you know the ID)
 *
 * @param leagueId - The UUID of the league
 * @returns LeagueBranding if found, null otherwise
 */
/**
 * Full league row type including branding columns from Agent 1's migration
 * Used for type assertions until database types are regenerated
 */
type LeagueFullRow = {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  logo_url: string | null;
  banner_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  custom_css: string | null;
  tagline: string | null;
  status: string;
};

export async function getLeagueById(leagueId: string): Promise<LeagueBranding | null> {
  try {
    const supabase = await createClient();

    // Note: Using type assertion because branding columns were added by Agent 1's migration
    // and the database types may not be regenerated yet
    const { data, error } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        slug,
        subdomain,
        custom_domain,
        custom_domain_verified,
        logo_url,
        banner_url,
        favicon_url,
        primary_color,
        secondary_color,
        accent_color,
        font_family,
        custom_css,
        tagline,
        status
      `)
      .eq('id', leagueId)
      .single() as unknown as { data: LeagueFullRow | null; error: any };

    if (error) {
      console.error('[League Context] Error fetching league by ID:', { leagueId, error: error.message });
      return null;
    }

    if (!data) {
      console.warn('[League Context] No league found with ID:', leagueId);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      subdomain: data.subdomain,
      customDomain: data.custom_domain,
      customDomainVerified: data.custom_domain_verified ?? false,
      logoUrl: data.logo_url,
      bannerUrl: data.banner_url,
      faviconUrl: data.favicon_url,
      primaryColor: data.primary_color || '#1F4FD8',
      secondaryColor: data.secondary_color || '#D72638',
      accentColor: data.accent_color || '#FFD700',
      fontFamily: data.font_family || 'Inter, system-ui, sans-serif',
      customCss: data.custom_css,
      tagline: data.tagline,
      status: data.status || 'active',
    };
  } catch (err) {
    console.error('[League Context] Unexpected error fetching league by ID:', err);
    return null;
  }
}

/**
 * Get league by slug (useful for URL-based routing)
 *
 * @param slug - The URL slug of the league
 * @returns LeagueBranding if found, null otherwise
 */
export async function getLeagueBySlug(slug: string): Promise<LeagueBranding | null> {
  try {
    const supabase = await createClient();

    // Note: Using type assertion because branding columns were added by Agent 1's migration
    // and the database types may not be regenerated yet
    const { data, error } = await supabase
      .from('leagues')
      .select(`
        id,
        name,
        slug,
        subdomain,
        custom_domain,
        custom_domain_verified,
        logo_url,
        banner_url,
        favicon_url,
        primary_color,
        secondary_color,
        accent_color,
        font_family,
        custom_css,
        tagline,
        status
      `)
      .eq('slug', slug)
      .eq('status', 'active')
      .single() as unknown as { data: LeagueFullRow | null; error: any };

    if (error) {
      console.error('[League Context] Error fetching league by slug:', { slug, error: error.message });
      return null;
    }

    if (!data) {
      console.warn('[League Context] No league found with slug:', slug);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      subdomain: data.subdomain,
      customDomain: data.custom_domain,
      customDomainVerified: data.custom_domain_verified ?? false,
      logoUrl: data.logo_url,
      bannerUrl: data.banner_url,
      faviconUrl: data.favicon_url,
      primaryColor: data.primary_color || '#1F4FD8',
      secondaryColor: data.secondary_color || '#D72638',
      accentColor: data.accent_color || '#FFD700',
      fontFamily: data.font_family || 'Inter, system-ui, sans-serif',
      customCss: data.custom_css,
      tagline: data.tagline,
      status: data.status || 'active',
    };
  } catch (err) {
    console.error('[League Context] Unexpected error fetching league by slug:', err);
    return null;
  }
}
