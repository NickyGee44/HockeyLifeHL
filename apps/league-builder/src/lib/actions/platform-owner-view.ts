'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { clearPlatformOwnerView, setPlatformOwnerView } from '@/lib/auth/platform-owner-view';

function normalizeTargetPath(target: string | null | undefined, fallback: string): string {
  if (!target || typeof target !== 'string') {
    return fallback;
  }

  return target.startsWith('/') ? target : fallback;
}

async function assertPlatformAdmin() {
  const userData = await getCurrentUser();
  if (!userData?.profile?.is_platform_admin) {
    throw new Error('Unauthorized');
  }
}

export async function startPlatformOwnerView(formData: FormData) {
  await assertPlatformAdmin();

  const leagueId = String(formData.get('leagueId') || '');
  const locale = String(formData.get('locale') || 'en');
  const target = normalizeTargetPath(
    formData.get('redirectTo')?.toString(),
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
  revalidatePath(`/${locale}/dashboard/leagues/${leagueId}`);

  redirect(`/${locale}${target}`);
}

export async function stopPlatformOwnerView(formData: FormData) {
  await assertPlatformAdmin();

  const locale = String(formData.get('locale') || 'en');

  await clearPlatformOwnerView();
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/admin`);

  redirect(`/${locale}/dashboard/admin`);
}
