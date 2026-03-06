import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions/auth';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function requireLeagueDashboardAccess({
  leagueId,
  locale,
}: {
  leagueId: string;
  locale: string;
}) {
  const userData = await getCurrentUser();
  if (!userData) {
    redirect(`/${locale}/login`);
  }

  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    redirect(`/${locale}/dashboard?error=unauthorized`);
  }

  const supabase = access.accessType === 'platform_admin'
    ? createServiceRoleClient()
    : await createClient();

  return {
    access,
    supabase,
    userData,
  };
}
