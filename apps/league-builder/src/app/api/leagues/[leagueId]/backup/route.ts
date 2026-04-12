import { NextRequest, NextResponse } from 'next/server';
import { buildLeagueBackupExport, verifyLeagueBackupToken } from '@/lib/backup/league-backup';
import { requireLeagueApiAccess } from '@/lib/api/guards';

export const dynamic = 'force-dynamic';

function buildFilename(leagueId: string) {
  return `beerleaguehockey-league-backup-${leagueId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await context.params;
  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.replace(/^Bearer\s+/i, '').trim();

  if (bearerToken) {
    const tokenResult = await verifyLeagueBackupToken(leagueId, bearerToken);
    if (!tokenResult.valid) {
      return NextResponse.json({ error: 'Invalid backup token.' }, { status: 401 });
    }
  } else {
    const access = await requireLeagueApiAccess(leagueId, { forbiddenError: 'Unauthorized' });
    if ('response' in access) {
      return access.response;
    }
  }

  try {
    const payload = await buildLeagueBackupExport(leagueId);
    const filename = buildFilename(leagueId);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error building league backup export:', error);
    return NextResponse.json({ error: 'Failed to build league backup export.' }, { status: 500 });
  }
}
