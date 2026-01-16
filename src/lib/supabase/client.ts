import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Use placeholder values during build time to prevent build errors
// These will never be used at runtime since env vars will be set
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Singleton pattern - only create one client instance
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client
  
  client = createBrowserClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )
  
  return client
}
