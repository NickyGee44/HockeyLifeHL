import type { User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { verifyCaptainOrAdminAccess, verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { createClient } from '@/lib/supabase/server';
import { isUserPlatformAdmin } from '@/lib/auth/platform-admin';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type TeamAccess = Awaited<ReturnType<typeof verifyCaptainOrAdminAccess>>;
type LeagueAccess = Awaited<ReturnType<typeof verifyLeagueOwnerAccess>>;

type GuardSuccess<T> = T & {
  supabase: SupabaseClient;
  user: User;
};

type GuardFailure = {
  response: NextResponse;
};

type GuardResult<T> = GuardSuccess<T> | GuardFailure;

export function buildErrorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function deny(error: string, status: number): GuardFailure {
  return { response: buildErrorResponse(error, status) };
}

export function requireCronSecret(request: NextRequest): GuardFailure | { authorized: true } {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return deny('Unauthorized', 401);
  }

  return { authorized: true };
}

export async function requireAuthenticatedApiUser(
  unauthorizedError = 'Unauthorized'
): Promise<GuardResult<{}>> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return deny(unauthorizedError, 401);
  }

  return { supabase, user };
}

export async function requireLeagueApiAccess(
  leagueId: string,
  options?: { forbiddenError?: string; unauthorizedError?: string }
): Promise<GuardResult<{ userId: string }>> {
  const auth = await requireAuthenticatedApiUser(options?.unauthorizedError);
  if ('response' in auth) return auth;

  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return deny(access.error || options?.forbiddenError || 'Forbidden', 403);
  }

  return {
    ...auth,
    userId: auth.user.id,
  };
}

export async function requireTeamApiAccess(
  teamId: string,
  options?: { forbiddenError?: string; unauthorizedError?: string }
): Promise<GuardResult<{ userId: string; access: TeamAccess }>> {
  const auth = await requireAuthenticatedApiUser(options?.unauthorizedError);
  if ('response' in auth) return auth;

  const access = await verifyCaptainOrAdminAccess(teamId);
  if (!access.authorized || !access.team) {
    return deny(access.error || options?.forbiddenError || 'Forbidden', 403);
  }

  return {
    ...auth,
    userId: auth.user.id,
    access,
  };
}

export async function requireLeagueOrTeamApiAccess(
  leagueId: string,
  teamId?: string,
  options?: { forbiddenError?: string; unauthorizedError?: string }
): Promise<GuardResult<{ userId: string; leagueAccess: LeagueAccess; teamAccess: TeamAccess | null }>> {
  const auth = await requireAuthenticatedApiUser(options?.unauthorizedError);
  if ('response' in auth) return auth;

  const leagueAccess = await verifyLeagueOwnerAccess(leagueId);
  const teamAccess = teamId ? await verifyCaptainOrAdminAccess(teamId) : null;
  const hasTeamAccess = !!teamAccess?.authorized && teamAccess.team?.league_id === leagueId;

  if (!leagueAccess.authorized && !hasTeamAccess) {
    return deny(options?.forbiddenError || 'Unauthorized', 403);
  }

  return {
    ...auth,
    userId: auth.user.id,
    leagueAccess,
    teamAccess,
  };
}

export async function requirePlatformAdminApiAccess(): Promise<GuardResult<{ userId: string }>> {
  const auth = await requireAuthenticatedApiUser('Not authenticated');
  if ('response' in auth) return auth;

  const allowed = await isUserPlatformAdmin(auth.user.id);
  if (!allowed) {
    return deny('Forbidden', 403);
  }

  return {
    ...auth,
    userId: auth.user.id,
  };
}
