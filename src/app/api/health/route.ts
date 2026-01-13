import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test connection by getting the current time from Supabase
    const { data, error } = await supabase.rpc('now' as never)
    
    if (error) {
      // If 'now' RPC doesn't exist, try a simple auth check
      const { error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        return NextResponse.json(
          { 
            status: 'error', 
            message: 'Failed to connect to Supabase',
            error: authError.message 
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        status: 'ok',
        message: 'Supabase connected successfully',
        timestamp: new Date().toISOString(),
        note: 'Auth connection verified'
      })
    }
    
    return NextResponse.json({
      status: 'ok',
      message: 'Supabase connected successfully',
      timestamp: new Date().toISOString(),
      serverTime: data
    })
  } catch (err) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Unexpected error',
        error: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
