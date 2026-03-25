// Supabase Edge Function: Cleanup Expired Sessions
// GDPR/CCPA Compliance: Automatically delete expired session data containing IP addresses and user agents
// Schedule: Daily at 2 AM via Supabase Cron

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Starting session cleanup...');

    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_expired_sessions');

    if (error) {
      console.error('Error cleaning up sessions:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Successfully cleaned up ${data ?? 0} expired sessions`);

    return new Response(
      JSON.stringify({
        success: true,
        cleaned: data ?? 0,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
