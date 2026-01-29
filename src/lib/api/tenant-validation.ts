/**
 * Tenant Validation Utilities
 *
 * Multi-tenant access control and validation helpers.
 * Ensures users can only access data within leagues they belong to.
 */

import { createClient } from "@/lib/supabase/server";
import { getLeagueBySlug } from "@/lib/context/league-context";

/**
 * Validate that a user has access to a tenant (league) and return the league ID
 *
 * @param tenantSlug - League slug from URL (e.g., "bmhl")
 * @param userId - Authenticated user ID
 * @param requiredRole - Optional role requirement ('owner' | 'admin')
 * @returns League ID if user has access, null otherwise
 */
export async function validateTenantAccess(
  tenantSlug: string,
  userId: string,
  requiredRole?: "owner" | "admin"
): Promise<{ leagueId: string; leagueName: string } | null> {
  try {
    // Get league by slug
    const league = await getLeagueBySlug(tenantSlug);

    if (!league) {
      console.warn(`[Tenant Validation] League not found: ${tenantSlug}`);
      return null;
    }

    if (league.status !== "active") {
      console.warn(
        `[Tenant Validation] League not active: ${tenantSlug} (status: ${league.status})`
      );
      return null;
    }

    // Check user membership
    const supabase = await createClient();
    const { data: membership, error } = await supabase
      .from("league_memberships")
      .select("role, status")
      .eq("league_id", league.id)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error || !membership) {
      console.warn(
        `[Tenant Validation] User ${userId} not a member of league ${tenantSlug}`
      );
      return null;
    }

    // Check role requirement if specified
    if (requiredRole) {
      const hasRole =
        requiredRole === "admin"
          ? ["owner", "admin"].includes(membership.role)
          : membership.role === requiredRole;

      if (!hasRole) {
        console.warn(
          `[Tenant Validation] User ${userId} does not have required role ${requiredRole} in league ${tenantSlug} (has: ${membership.role})`
        );
        return null;
      }
    }

    return {
      leagueId: league.id,
      leagueName: league.name,
    };
  } catch (error) {
    console.error("[Tenant Validation] Unexpected error:", error);
    return null;
  }
}

/**
 * Check if user is a league admin or owner
 *
 * @param leagueId - League UUID
 * @param userId - User UUID
 * @returns true if user is admin/owner, false otherwise
 */
export async function isLeagueAdmin(
  leagueId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("league_memberships")
      .select("role")
      .eq("league_id", leagueId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error || !data) {
      return false;
    }

    return ["owner", "admin"].includes(data.role);
  } catch {
    return false;
  }
}
