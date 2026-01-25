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

  // Browser client should use localStorage for session management
  // Cookies are managed server-side with HttpOnly flag for security
  client = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        // Persist auth session in localStorage (secure client-side storage)
        persistSession: true,
        // Automatically detect session from URL (OAuth callbacks)
        detectSessionInUrl: true,
        // Auto refresh token before it expires
        autoRefreshToken: true,
        // Custom storage key to avoid conflicts
        storageKey: 'hockeylifehl-auth-token',
        // Use PKCE flow for enhanced security
        flowType: 'pkce',
        // Store in localStorage, not cookies (cookies are HttpOnly server-side)
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    }
  )

  return client
}

// Reset the client instance (useful after sign out to clear singleton state)
export function resetClient() {
  client = null
}
