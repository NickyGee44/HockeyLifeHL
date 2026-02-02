import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeErrorForLogging } from '@/lib/utils/sanitize';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const supabase = await createClient();
  const { leagueId } = await params;
  const searchQuery = request.nextUrl.searchParams.get('q') || '';

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user has access to this league (through organization ownership)
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, organization_id, organizations!inner(owner_user_id)')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 });
  }

  const orgOwnerId = (league.organizations as any).owner_user_id;
  if (orgOwnerId !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (searchQuery.length < 2) {
    return NextResponse.json([]);
  }

  // Ensure league has an organization
  if (!league.organization_id) {
    return NextResponse.json({ error: 'League not associated with an organization' }, { status: 400 });
  }

  try {
    // Privacy-safe search: Search by name only (not email), scoped to organization members
    // First get all user IDs who are members of leagues in this organization
    const { data: orgMembers, error: membersError } = await supabase
      .from('league_memberships')
      .select(
        `
        user_id,
        leagues!inner(organization_id)
      `
      )
      .eq('leagues.organization_id', league.organization_id as string)
      .eq('status', 'active');

    if (membersError) {
      console.error('Member search failed:', sanitizeErrorForLogging(membersError));
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Get unique member IDs
    const memberIds = [...new Set(orgMembers?.map((m) => m.user_id) || [])];

    if (memberIds.length === 0) {
      // No members in organization, return empty results
      return NextResponse.json([]);
    }

    // Search profiles by name only (no email in search or response)
    // Scoped to organization members for privacy
    const { data: players, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', memberIds)
      .ilike('full_name', `%${searchQuery}%`)
      .limit(10);

    if (error) {
      console.error('Player search failed:', sanitizeErrorForLogging(error));
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Return results without email for privacy
    return NextResponse.json(players || []);
  } catch (error) {
    console.error('Unexpected search error:', sanitizeErrorForLogging(error));
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
