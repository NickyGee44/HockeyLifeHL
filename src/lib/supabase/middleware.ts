import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Whitelist of allowed redirect paths to prevent open redirect vulnerability
const ALLOWED_REDIRECT_PATHS = [
  '/dashboard',
  '/admin',
  '/captain',
];

/**
 * Validates that a redirect path is safe and allowed
 * Only allows paths that start with whitelisted prefixes
 */
function isValidRedirectPath(path: string): boolean {
  if (!path || !path.startsWith('/')) {
    return false;
  }

  // Remove query parameters and fragments
  const cleanPath = path.split('?')[0].split('#')[0];

  // Check if path starts with an allowed prefix
  return ALLOWED_REDIRECT_PATHS.some(
    (allowedPath) => cleanPath === allowedPath || cleanPath.startsWith(allowedPath + '/')
  );
}

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip middleware if env vars are missing (during build)
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Enhanced cookie options for security and mobile support
            const enhancedOptions = {
              ...options,
              // Prevent client-side JavaScript access (XSS protection)
              httpOnly: true,
              // Ensure cookies work on mobile browsers
              sameSite: 'lax' as const,
              // Use secure cookies in production
              secure: process.env.NODE_ENV === 'production',
              // Session lifetime: 14 days (reduced from 30 for better security)
              maxAge: 60 * 60 * 24 * 14, // 14 days
            }
            supabaseResponse.cookies.set(name, value, enhancedOptions)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your app very slow!

  // This will refresh the session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/admin', '/captain']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'

    // Only set redirect parameter if it's a valid, safe path
    const requestedPath = request.nextUrl.pathname;
    if (isValidRedirectPath(requestedPath)) {
      url.searchParams.set('redirect', requestedPath)
    }
    // If invalid, user will be redirected to /dashboard after login (default behavior)

    return NextResponse.redirect(url)
  }

  // Role-based access control for admin and captain routes
  if (user) {
    const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
    const isCaptainPath = request.nextUrl.pathname.startsWith('/captain')

    if (isAdminPath || isCaptainPath) {
      // Fetch user's role from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // Admin routes require owner role
      if (isAdminPath && profile?.role !== 'owner') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }

      // Captain routes require captain or owner role
      if (isCaptainPath && profile?.role !== 'captain' && profile?.role !== 'owner') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  // If user is logged in and tries to access login/register, redirect to dashboard
  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthPath && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
