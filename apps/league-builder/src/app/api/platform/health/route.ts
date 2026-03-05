import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { featureFlags } from '@/lib/config/feature-flags';
import { isUserPlatformAdmin } from '@/lib/auth/platform-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!featureFlags.enablePlatformHealthEndpoint) {
    return NextResponse.json({ error: 'Endpoint disabled' }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const isPlatformAdmin = await isUserPlatformAdmin(user.id);
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const [{ count: activeLeagues }, { count: upcomingGames }, { count: publishedNews }] =
    await Promise.all([
      service.from('leagues').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      service
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .gte('scheduled_at', nowIso),
      service
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('published', true)
        .in('type', ['news', 'game_recap', 'weekly_wrap']),
    ]);

  const env = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    stripeSecret: Boolean(process.env.STRIPE_SECRET_KEY),
    stripeEnterprisePrice: Boolean(process.env.STRIPE_PRICE_ENTERPRISE),
    resendApiKey: Boolean(process.env.RESEND_API_KEY),
    sentryDsn: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  };

  const warnings: string[] = [];
  if (!env.stripeEnterprisePrice) warnings.push('STRIPE_PRICE_ENTERPRISE is missing');
  if ((publishedNews ?? 0) === 0) warnings.push('No published news articles found on platform');
  if ((upcomingGames ?? 0) === 0) warnings.push('No upcoming games found on platform');

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    checks: {
      env,
      data: {
        activeLeagues: activeLeagues ?? 0,
        upcomingGames: upcomingGames ?? 0,
        publishedNews: publishedNews ?? 0,
      },
    },
    warnings,
  });
}
