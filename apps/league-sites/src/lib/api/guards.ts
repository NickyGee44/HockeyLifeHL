import { NextResponse, type NextRequest } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

type GuardFailure = {
  response: NextResponse;
};

function deny(error: string, status: number): GuardFailure {
  return { response: NextResponse.json({ error }, { status }) };
}

export function requireCronSecret(request: NextRequest): GuardFailure | { authorized: true } {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return deny('Unauthorized', 401);
  }

  return { authorized: true };
}

export async function requireAuthenticatedApiUser() {
  const supabase = await createAuthClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return deny('Unauthorized', 401);
  }

  return { supabase, user };
}
