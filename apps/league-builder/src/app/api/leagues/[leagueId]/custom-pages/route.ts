import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserPlatformAdmin } from '@/lib/auth/platform-admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('league_memberships')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!membership) {
    const { data: league } = await supabase
      .from('leagues')
      .select('organization_id, organizations(owner_user_id)')
      .eq('id', leagueId)
      .single();

    const org = league?.organizations as { owner_user_id?: string } | null;
    if (!org || org.owner_user_id !== user.id) {
      const isPlatformAdmin = await isUserPlatformAdmin(user.id);
      if (!isPlatformAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  const { data: pages, error } = await supabase
    .from('custom_pages')
    .select('id, title, slug, is_published, sort_order, updated_at')
    .eq('league_id', leagueId)
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching custom pages:', error);
    return NextResponse.json({ error: 'Failed to fetch custom pages' }, { status: 500 });
  }

  return NextResponse.json(pages ?? []);
}
