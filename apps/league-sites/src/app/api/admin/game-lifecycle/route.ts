import { NextResponse, type NextRequest } from 'next/server';
import { adminFinalizeGame, adminReopenGame } from '@/lib/actions/scorekeeper';

export const runtime = 'nodejs';

/**
 * Internal admin escape hatch for game lifecycle, called server-to-server from
 * the league-builder dashboard (the finalize logic lives here in league-sites).
 *
 * Auth: shared REVALIDATION_SECRET in the request body (same trust boundary as
 * /api/revalidate). The underlying actions also re-check the secret in
 * constant time.
 *
 * Body: { gameId: string, action: 'finalize' | 'reopen', secret: string }
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { gameId, action, secret } = body as {
    gameId?: string;
    action?: string;
    secret?: string;
  };

  if (!process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }
  if (!gameId || typeof gameId !== 'string') {
    return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
  }
  if (action !== 'finalize' && action !== 'reopen') {
    return NextResponse.json({ error: 'action must be "finalize" or "reopen"' }, { status: 400 });
  }

  const result =
    action === 'reopen'
      ? await adminReopenGame(gameId, secret ?? '')
      : await adminFinalizeGame(gameId, secret ?? '');

  if (!result.success) {
    const status = result.error === 'Unauthorized' ? 401 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
