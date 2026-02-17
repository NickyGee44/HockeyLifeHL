import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Vercel Cron route: Queue invoice due reminders.
 * Schedule: Daily at 9:00 AM UTC (0 9 * * *)
 *
 * Calls the queue_invoice_due_reminders() DB function to insert
 * reminder notifications for invoices due within the next 3 days.
 * The dispatch-notifications Edge Function then sends these emails.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await (supabase.rpc as any)('queue_invoice_due_reminders');

    if (error) {
      console.error('[cron/queue-invoice-reminders] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[cron/queue-invoice-reminders] Queued ${data} reminders`);
    return NextResponse.json({
      queued: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron/queue-invoice-reminders] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
