import { NextRequest, NextResponse } from 'next/server';
import { removeStaffMember } from '@/lib/actions/roster';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; staffId: string }> }
) {
  // Verify user is authenticated at the API boundary (defense-in-depth)
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { staffId } = await params;

  // Authorization is further verified internally by removeStaffMember() via verifyCaptainOrAdminAccess()
  const result = await removeStaffMember(staffId);

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
