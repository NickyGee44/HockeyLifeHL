import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user has access to this league (member of the league's organization)
  const { data: league } = await supabase
    .from('leagues')
    .select('organization_id')
    .eq('id', leagueId)
    .single();

  if (!league || !league.organization_id) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', league.organization_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch divisions for the league with team count
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

  // Transform to include team count
  const divisionsWithCount = (divisions || []).map(div => ({
    id: div.id,
    name: div.name,
    skill_level: div.skill_level,
    team_count: (div.teams as any)?.[0]?.count || 0,
  }));

  return NextResponse.json({ divisions: divisionsWithCount });
}
