import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './src/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

/**
 * Root Middleware - Multi-Tenant League Detection & Authentication
 *
 * This middleware:
 * 1. Detects league from hostname (subdomain or custom domain)
 * 2. Sets active league in cookies if detected
 * 3. Handles authentication via Supabase middleware
 * 4. Protects routes based on auth and league access
 */

// Helper function to get league from hostname
async function getLeagueFromHostname(hostname: string): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return null
    }

    // Create a minimal Supabase client for league lookup
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    })

    // Check if hostname is a subdomain
    const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'beerleaguehockey.ca'

    // Extract subdomain if it exists
    const subdomainMatch = hostname.match(/^([^.]+)\./)

    if (subdomainMatch && hostname.endsWith(platformDomain)) {
      const subdomain = subdomainMatch[1]

      // Skip www and platform root
      if (subdomain !== 'www' && hostname !== platformDomain) {
        // Look up league by subdomain
        const { data: league } = await supabase
          .from('leagues')
          .select('id')
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single()

        if (league) {
          return league.id
        }
      }
    }

    // Check if hostname is a custom domain
    const { data: league } = await supabase
      .from('leagues')
      .select('id')
      .eq('custom_domain', hostname)
      .eq('status', 'active')
      .single()

    if (league) {
      return league.id
    }

    return null
  } catch (error) {
    console.error('Error looking up league from hostname:', error)
    return null
  }
}

export async function middleware(request: NextRequest) {
  // First, run Supabase auth middleware
  let response = await updateSession(request)

  // Skip league detection for auth routes, API routes, and static files
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.includes('.')
  ) {
    return response
  }

  // Get hostname from request
  const hostname = request.headers.get('host') || request.nextUrl.hostname

  // Detect league from hostname
  const leagueIdFromHostname = await getLeagueFromHostname(hostname)

  if (leagueIdFromHostname) {
    // Create a new response with the league cookie set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30, // 30 days
              })
            })
          },
        },
      })

      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Only set active league if user is authenticated
      if (user) {
        // Verify user has access to this league
        const { data: membership } = await supabase
          .from('league_memberships')
          .select('league_id')
          .eq('user_id', user.id)
          .eq('league_id', leagueIdFromHostname)
          .eq('status', 'active')
          .single()

        if (membership) {
          // Set the active league cookie
          response.cookies.set('active_league_id', leagueIdFromHostname, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
          })

          console.log(`Set active league from hostname: ${leagueIdFromHostname}`)
        } else {
          console.log(`User does not have access to league: ${leagueIdFromHostname}`)
        }
      }
    }

    // Set header for downstream components to read
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-league-hostname', hostname)
    requestHeaders.set('x-league-id', leagueIdFromHostname)

    // Create new response with headers
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return response
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
