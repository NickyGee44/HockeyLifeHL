import { NextRequest, NextResponse } from 'next/server';
import { removeStaffMember } from '@/lib/actions/roster';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; staffId: string }> }
) {
  const { staffId } = await params;

  const result = await removeStaffMember(staffId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
