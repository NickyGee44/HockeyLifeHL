import { NextRequest, NextResponse } from 'next/server';
import { addStaffMember, getTeamStaff } from '@/lib/actions/roster';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get('seasonId');

  if (!seasonId) {
    return NextResponse.json(
      { error: 'seasonId is required' },
      { status: 400 }
    );
  }

  const result = await getTeamStaff(teamId, seasonId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json(result.data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;

  try {
    const body = await request.json();
    const { personId, seasonId, role } = body;

    // Validate required fields
    if (!personId || !seasonId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: personId, seasonId, role' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = [
      'head_coach',
      'assistant_coach',
      'goalie_coach',
      'manager',
      'trainer',
      'equipment_manager',
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await addStaffMember({
      teamId,
      personId,
      seasonId,
      role,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teams/[teamId]/staff:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
