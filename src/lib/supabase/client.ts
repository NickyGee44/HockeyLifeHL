import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Singleton pattern - only create one client instance
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

// Helper to get/set cookies on the client-side
function getCookies() {
  if (typeof document === 'undefined') return {}

  return document.cookie.split('; ').reduce((acc, cookie) => {
    const [name, value] = cookie.split('=')
    if (name && value) {
      acc[name] = decodeURIComponent(value)
    }
    return acc
  }, {} as Record<string, string>)
}

function setCookie(name: string, value: string, options: any = {}) {
  if (typeof document === 'undefined') return

  const {
    maxAge = 60 * 60 * 24 * 14, // 14 days
    path = '/',
    sameSite = 'lax',
    secure = process.env.NODE_ENV === 'production',
  } = options

  let cookieString = `${name}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`

  if (secure) {
    cookieString += '; secure'
  }

  document.cookie = cookieString
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return

  document.cookie = `${name}=; path=/; max-age=0`
}

export function createClient() {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Require env vars at runtime (client-side only runs at runtime)
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error(
      'Missing Supabase environment variables. Please check your configuration.'
    )
  }

  // Browser client uses cookies for session management (same as server)
  // This allows the client to read sessions created by the server
  client = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          const cookies = getCookies()
          return Object.entries(cookies).map(([name, value]) => ({ name, value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, options)
          })
        },
      },
    }
  )

  return client
}

// Reset the client instance (useful after sign out to clear singleton state)
export function resetClient() {
  client = null
}
