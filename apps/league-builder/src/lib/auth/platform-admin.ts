import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Read platform-admin status with service role to avoid RLS false negatives.
 */
export async function isUserPlatformAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', userId)
    .maybeSingle();

  if (error) return false;
  return Boolean((data as { is_platform_admin?: boolean } | null)?.is_platform_admin);
}
