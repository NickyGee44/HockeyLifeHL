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
  
  client = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
  
  return client
}
