import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireLeagueApiAccess } from '@/lib/api/guards';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const access = await requireLeagueApiAccess(leagueId);
  if ('response' in access) {
    return access.response;
  }

  const supabase = await createClient();
  const { data: divisions, error } = await supabase
    .from('divisions')
    .select(`
      id,
      name,
      skill_level,
      teams:teams(count)
    `)
    .eq('league_id', leagueId)
    .order('name');

  if (error) {
    console.error('Error fetching divisions:', error);
    return NextResponse.json({ error: 'Failed to fetch divisions' }, { status: 500 });
  }

  const divisionsWithCount = (divisions || []).map((div) => ({
    id: div.id,
    name: div.name,
    skill_level: div.skill_level,
    team_count: (div.teams as any)?.[0]?.count || 0,
  }));

  return NextResponse.json({ divisions: divisionsWithCount });
}
