import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/api/guards';

// Vercel Cron route: Process pending and retry notifications.
// Schedule: Every 5 minutes
// Calls the dispatch-notifications Supabase Edge Function to:
// 1. Claim and send pending notifications (batch of 10)
// 2. Retry failed notifications (batch of 5)
export async function GET(request: NextRequest) {
  const auth = requireCronSecret(request);
  if ('response' in auth) {
    return auth.response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    );
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/dispatch-notifications`;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  try {
    // Process pending notifications
    const pendingRes = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'process_pending', batch_size: 10 }),
    });
    const pendingResult = await pendingRes.json();

    // Process retry notifications
    const retryRes = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'process_retry', batch_size: 5 }),
    });
    const retryResult = await retryRes.json();

    console.log('[cron/process-notifications] pending:', pendingResult);
    console.log('[cron/process-notifications] retry:', retryResult);

    return NextResponse.json({
      pending: pendingResult,
      retry: retryResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron/process-notifications] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
