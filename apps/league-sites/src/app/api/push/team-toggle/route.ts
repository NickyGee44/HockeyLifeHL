import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedApiUser } from '@/lib/api/guards';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface ToggleBody {
  teamId?: string;
  enabled?: boolean;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedApiUser();
  if ('response' in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as ToggleBody | null;
  if (!body?.teamId || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'Invalid team push setting' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const [{ data: team }, { data: rosterAccess }] = await Promise.all([
    (supabase.from('teams') as any)
      .select('id, league_id, captain_id')
      .eq('id', body.teamId)
      .maybeSingle(),
    (supabase.from('team_rosters') as any)
      .select('id')
      .eq('team_id', body.teamId)
      .eq('player_id', auth.user.id)
      .in('leadership_role', ['captain', 'alternate_captain'])
      .eq('status', 'active')
      .is('end_date', null)
      .limit(1)
      .maybeSingle(),
  ]);

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  if (team.captain_id !== auth.user.id && !rosterAccess) {
    return NextResponse.json({ error: 'Captain access required' }, { status: 403 });
  }

  const { data, error } = await (supabase.from('teams') as any)
    .update({ push_enabled: body.enabled })
    .eq('id', body.teamId)
    .select('id, push_enabled')
    .single();

  if (error) {
    console.error('[api/push/team-toggle] Update failed:', error.message);
    return NextResponse.json({ error: 'Failed to update push setting' }, { status: 500 });
  }

  return NextResponse.json({ team: data });
}
