import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Singleton pattern - only create one client instance
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

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

  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined'

  client = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      // Cookie handling for browser client (required by @supabase/ssr)
      cookies: {
        get(name: string) {
          if (!isBrowser) return undefined
          // Read cookie from document.cookie
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) {
            return parts.pop()?.split(';').shift();
          }
        },
        set(name: string, value: string, options: any) {
          if (!isBrowser) return
          // Write cookie to document.cookie
          let cookie = `${name}=${value}`;
          if (options?.maxAge) {
            cookie += `; max-age=${options.maxAge}`;
          }
          if (options?.path) {
            cookie += `; path=${options.path}`;
          }
          if (options?.domain) {
            cookie += `; domain=${options.domain}`;
          }
          if (options?.sameSite) {
            cookie += `; samesite=${options.sameSite}`;
          }
          if (options?.secure) {
            cookie += '; secure';
          }
          document.cookie = cookie;
        },
        remove(name: string, options: any) {
          if (!isBrowser) return
          // Remove cookie by setting expiry to past
          this.set(name, '', {
            ...options,
            maxAge: 0,
          });
        },
      },
      auth: {
        // Persist auth session in localStorage (default, but being explicit)
        persistSession: true,
        // Automatically detect storage from environment
        detectSessionInUrl: true,
        // Auto refresh token before it expires
        autoRefreshToken: true,
        // Storage key for the session
        storageKey: 'hockeylifehl-auth-token',
        // Flow type for PKCE (more secure)
        flowType: 'pkce',
      },
    }
  )

  return client
}

// Reset the client instance (useful after sign out to clear singleton state)
export function resetClient() {
  client = null
}
