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
