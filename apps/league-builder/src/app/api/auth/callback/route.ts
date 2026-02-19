import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Auth Callback Route
 *
 * Handles the PKCE code exchange for Supabase Auth flows:
 * - Password reset email links
 * - Email verification links
 * - Magic link sign-ins
 *
 * Supabase sends the user to: /api/auth/callback?code=...&next=...
 * This route exchanges the code for a session and redirects.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/en/dashboard';
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Handle PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Auth Callback] Code exchange error:', error.message);
      // Redirect to reset-password with error for recovery flows
      if (type === 'recovery') {
        return NextResponse.redirect(
          new URL('/en/reset-password?error=Invalid or expired link', request.url)
        );
      }
      return NextResponse.redirect(
        new URL('/en/login?error=auth_error', request.url)
      );
    }

    // For recovery type, redirect to reset-password page
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/en/reset-password', request.url));
    }

    // For OAuth users, check if they need to complete org setup
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const isOAuthUser = user.app_metadata?.providers?.some(
        (p: string) => p === 'google' || p === 'apple'
      ) || user.app_metadata?.provider === 'google' || user.app_metadata?.provider === 'apple';

      if (isOAuthUser) {
        // Use service role to check org ownership (bypasses RLS that may
        // block the anon client for brand-new users)
        const serviceSupabase = createServiceRoleClient();

        const { data: ownedOrgs } = await serviceSupabase
          .from('organizations')
          .select('id')
          .eq('owner_user_id', user.id)
          .limit(1);

        const { data: memberships } = await serviceSupabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        const hasOrg = (ownedOrgs && ownedOrgs.length > 0) || (memberships && memberships.length > 0);

        if (!hasOrg) {
          // Detect locale from the `next` param or default to 'en'
          const locale = next.startsWith('/fr') ? 'fr' : 'en';
          const setupPath = `/${locale}/setup-organization`;
          return NextResponse.redirect(new URL(setupPath, request.url));
        }
      }
    }

    // Check for legacy profile matches requiring disambiguation
    try {
      const serviceSupabase = createServiceRoleClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await serviceSupabase
          .from('profiles')
          .select('pending_legacy_match_ids')
          .eq('id', authUser.id)
          .single();
        const matchIds = (profile as any)?.pending_legacy_match_ids as string[] | null;
        if (Array.isArray(matchIds) && matchIds.length > 1) {
          return NextResponse.redirect(new URL('/en/claim-history', request.url));
        }
      }
    } catch {
      // Non-blocking — proceed with normal redirect
    }

    return NextResponse.redirect(new URL(next, request.url));
  }

  // Handle token_hash verification (older flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'signup' | 'email',
    });

    if (error) {
      console.error('[Auth Callback] OTP verification error:', error.message);
      if (type === 'recovery') {
        return NextResponse.redirect(
          new URL('/en/reset-password?error=Invalid or expired link', request.url)
        );
      }
      return NextResponse.redirect(
        new URL('/en/login?error=auth_error', request.url)
      );
    }

    // For recovery type, redirect to reset-password page
    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/en/reset-password', request.url));
    }

    return NextResponse.redirect(new URL(next, request.url));
  }

  // No code or token_hash provided
  return NextResponse.redirect(new URL('/en/login', request.url));
}
