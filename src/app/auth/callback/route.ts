import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Whitelist of allowed redirect paths to prevent open redirect vulnerability
const ALLOWED_REDIRECT_PATHS = [
  "/dashboard",
  "/dashboard/team",
  "/dashboard/stats",
  "/dashboard/schedule",
  "/dashboard/profile",
  "/captain",
  "/captain/team",
  "/captain/stats",
  "/captain/draft",
  "/admin",
  "/admin/seasons",
  "/admin/players",
  "/admin/teams",
  "/admin/games",
  "/admin/invites",
  "/admin/emails",
  "/standings",
  "/schedule",
  "/stats",
  "/teams",
  "/news",
  "/profile",
];

/**
 * Validates that a redirect path is safe and allowed
 * Prevents open redirect attacks by checking against whitelist
 */
function getSafeRedirectPath(path: string | null): string {
  if (!path) {
    return "/dashboard";
  }

  // Remove any query parameters and fragments for validation
  const cleanPath = path.split("?")[0].split("#")[0];

  // Check if path exactly matches or starts with an allowed path
  const isAllowed = ALLOWED_REDIRECT_PATHS.some(
    (allowedPath) =>
      cleanPath === allowedPath || cleanPath.startsWith(allowedPath + "/")
  );

  if (isAllowed) {
    return path; // Return original path with query params if it's safe
  }

  // Default to dashboard if path is not in whitelist
  console.warn(`Blocked redirect to unauthorized path: ${path}`);
  return "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Use safe redirect path to prevent open redirect vulnerability
      const safePath = getSafeRedirectPath(next);
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
