/**
 * API Authentication Utilities
 *
 * Auth helpers for API route handlers.
 */

import { createClient } from "@/lib/supabase/server";
import { ApiError, ErrorResponses } from "./error-handling";

/**
 * Require authentication and return user ID
 *
 * @throws ApiError if not authenticated
 * @returns User ID
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw ErrorResponses.unauthorized();
  }

  return { userId: user.id };
}

/**
 * Require that the authenticated user is a league admin or owner
 *
 * @param leagueId - League UUID
 * @throws ApiError if not authenticated or not an admin
 * @returns User ID and role
 */
export async function requireLeagueAdmin(
  leagueId: string
): Promise<{ userId: string; role: string }> {
  const { userId } = await requireAuth();

  const supabase = await createClient();
  const { data: membership, error } = await supabase
    .from("league_memberships")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !membership) {
    throw ErrorResponses.forbidden();
  }

  if (!["owner", "admin"].includes(membership.role)) {
    throw ErrorResponses.forbidden();
  }

  return { userId, role: membership.role };
}
