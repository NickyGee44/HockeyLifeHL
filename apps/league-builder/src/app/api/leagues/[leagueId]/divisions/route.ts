import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserPlatformAdmin } from '@/lib/auth/platform-admin';

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

  // Verify user has access to this league via league_memberships or org ownership
  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!membership) {
    // Fallback: check org ownership
    const { data: league } = await supabase
      .from('leagues')
      .select('organization_id, organizations(owner_user_id)')
      .eq('id', leagueId)
      .single();

    const org = league?.organizations as any;
    if (!org || org.owner_user_id !== user.id) {
      // Fallback: check platform admin
      const isPlatformAdmin = await isUserPlatformAdmin(user.id);
      if (!isPlatformAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
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
