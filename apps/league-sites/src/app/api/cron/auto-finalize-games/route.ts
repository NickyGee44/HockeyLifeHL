import { NextResponse, type NextRequest } from 'next/server';
import { requireCronSecret } from '@/lib/api/guards';
import { autoFinalizeExpiredCaptainVerifications } from '@/lib/actions/scorekeeper';

export const runtime = 'nodejs';

/**
 * Vercel Cron: auto-finalize games stuck in `pending_verification`.
 *
 * When a captain self-scores and submits, the opposing captain gets a 24h link
 * to verify. If they never respond, the game would sit in pending_verification
 * forever — never completed, so no recap. This runs hourly and finalizes any
 * such game past the 24h window (the non-responding side is treated as verified).
 *
 * Auth: CRON_SECRET (Vercel Cron sends it automatically; requireCronSecret also
 * allows the platform's own scheduler headers).
 */
export async function GET(request: NextRequest) {
  const auth = requireCronSecret(request);
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const result = await autoFinalizeExpiredCaptainVerifications({ windowHours: 24 });
    return NextResponse.json({
      ok: true,
      finalized: result.finalized,
      errors: result.errors,
      gameIds: result.gameIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron/auto-finalize-games] failed', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'auto-finalize failed' },
      { status: 500 },
    );
  }
}
