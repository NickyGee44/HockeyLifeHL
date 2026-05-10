import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedApiUser } from '@/lib/api/guards';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getVapidPublicKey } from '@/lib/push/server';

interface SubscribeBody {
  subscription?: {
    endpoint?: string;
    expirationTime?: number | null;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
  endpoint?: string;
}

export async function GET() {
  return NextResponse.json({
    publicKey: getVapidPublicKey(),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApiUser();
  if ('response' in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  const subscription = body?.subscription;

  if (
    !subscription?.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 });
  }

  const expirationTime = subscription.expirationTime
    ? new Date(subscription.expirationTime).toISOString()
    : null;

  const supabase = createServiceRoleClient();
  const { data, error } = await (supabase.from('push_subscriptions') as any)
    .upsert(
      {
        user_id: auth.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        expiration_time: expirationTime,
        user_agent: request.headers.get('user-agent'),
        disabled_at: null,
        failure_count: 0,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    )
    .select('id, user_id, endpoint, disabled_at, created_at, updated_at')
    .single();

  if (error) {
    console.error('[api/push/subscribe] Save failed:', error.message);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ subscription: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuthenticatedApiUser();
  if ('response' in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as SubscribeBody | null;
  const endpoint = body?.endpoint;

  const supabase = createServiceRoleClient();
  let query = (supabase.from('push_subscriptions') as any)
    .update({
      disabled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', auth.user.id);

  if (endpoint) {
    query = query.eq('endpoint', endpoint);
  }

  const { error } = await query;

  if (error) {
    console.error('[api/push/subscribe] Disable failed:', error.message);
    return NextResponse.json({ error: 'Failed to disable subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
