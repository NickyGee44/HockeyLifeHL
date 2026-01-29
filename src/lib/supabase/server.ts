import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Check if we're in build/prerender phase
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build, use placeholder values (won't actually be called)
  // At runtime, require real values
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isBuildPhase) {
      // Return a dummy client that won't be used during static generation
      return createServerClient<Database>(
        'https://placeholder.supabase.co',
        'placeholder-key',
        {
          cookies: {
            getAll() { return [] },
            setAll() {},
          },
        }
      )
    }
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel project settings.'
    )
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Enhanced cookie options for security and mobile support
              const enhancedOptions = {
                ...options,
                // Allow client-side JavaScript access for session sync
                // Note: While this reduces XSS protection, it's required for
                // Supabase SSR to work properly with client-side auth state
                httpOnly: false,
                sameSite: 'lax' as const,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 14, // 14 days (reduced from 30 for better security)
              }
              cookieStore.set(name, value, enhancedOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
