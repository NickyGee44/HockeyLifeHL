'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { clearPlatformOwnerView, setPlatformOwnerView } from '@/lib/auth/platform-owner-view';
import { normalizePlatformOwnerViewTarget } from '@/lib/auth/platform-owner-view-routing';

async function assertPlatformAdmin() {
  const userData = await getCurrentUser();
  if (!userData?.profile?.is_platform_admin) {
    throw new Error('Unauthorized');
  }
}

export async function activatePlatformOwnerView({
  leagueId,
  locale,
  redirectTo,
}: {
  leagueId: string;
  locale: string;
  redirectTo?: string | null;
}) {
  await assertPlatformAdmin();

  const target = normalizePlatformOwnerViewTarget(
    redirectTo,
    `/dashboard/leagues/${leagueId}`
  );

  if (!leagueId) {
    throw new Error('League ID is required');
  }

  const supabase = createServiceRoleClient();
  const { data: league, error } = await supabase
    .from('leagues')
    .select('id')
    .eq('id', leagueId)
    .maybeSingle();

  if (error || !league) {
    throw new Error('League not found');
  }

  await setPlatformOwnerView(leagueId);
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/admin`);
  revalidatePath(`/${locale}/dashboard/admin/migrations`);
  revalidatePath(`/${locale}/dashboard/leagues`);
  revalidatePath(`/${locale}/dashboard/leagues/${leagueId}`);
  revalidatePath(`/${locale}/dashboard/leagues/${leagueId}/migration-center`);

  return `/${locale}${target}`;
}

export async function startPlatformOwnerView(formData: FormData) {
  const target = await activatePlatformOwnerView({
    leagueId: String(formData.get('leagueId') || ''),
    locale: String(formData.get('locale') || 'en'),
    redirectTo: formData.get('redirectTo')?.toString(),
  });

  redirect(target);
}

export async function stopPlatformOwnerView(formData: FormData) {
  await assertPlatformAdmin();

  const locale = String(formData.get('locale') || 'en');

  await clearPlatformOwnerView();
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/admin`);
  revalidatePath(`/${locale}/dashboard/admin/migrations`);
  revalidatePath(`/${locale}/dashboard/leagues`);

  redirect(`/${locale}/dashboard/admin`);
}
