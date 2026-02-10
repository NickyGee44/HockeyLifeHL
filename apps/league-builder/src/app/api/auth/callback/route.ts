import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

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
