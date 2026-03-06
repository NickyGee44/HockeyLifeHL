import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';

const OWNER_VIEW_COOKIE = 'blh_platform_owner_view_league';

export type PlatformOwnerView = {
  leagueId: string;
  leagueName: string;
  leagueSlug: string | null;
};

export async function getPlatformOwnerView(): Promise<PlatformOwnerView | null> {
  const cookieStore = await cookies();
  const leagueId = cookieStore.get(OWNER_VIEW_COOKIE)?.value;

  if (!leagueId) {
    return null;
  }

  const supabase = createServiceRoleClient();
  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, slug')
    .eq('id', leagueId)
    .maybeSingle();

  if (error || !league) {
    return null;
  }

  return {
    leagueId: league.id,
    leagueName: league.name,
    leagueSlug: league.slug,
  };
}

export async function setPlatformOwnerView(leagueId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(OWNER_VIEW_COOKIE, leagueId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function clearPlatformOwnerView(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(OWNER_VIEW_COOKIE);
}
