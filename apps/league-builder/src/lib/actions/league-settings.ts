'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';

export interface UpdateLeagueSettingsData {
  name: string;
  description?: string | null;
  city?: string | null;
  state_province?: string | null;
  country?: string | null;
  timezone?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export async function updateLeagueSettings(
  leagueId: string,
  data: UpdateLeagueSettingsData
): Promise<{ success: boolean; error?: string }> {
  // Verify the user has owner/admin access
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  // Validate required fields
  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: 'League name is required' };
  }

  if (data.name.trim().length > 100) {
    return { success: false, error: 'League name must be 100 characters or less' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('leagues')
    .update({
      name: data.name.trim(),
      description: data.description?.trim() || null,
      city: data.city?.trim() || null,
      state_province: data.state_province?.trim() || null,
      country: data.country?.trim() || null,
      timezone: data.timezone || null,
      contact_email: data.contact_email?.trim() || null,
      contact_phone: data.contact_phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leagueId);

  if (error) {
    console.error('[updateLeagueSettings] Error:', error.message);
    return { success: false, error: 'Failed to update settings' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}`);
  revalidatePath(`/dashboard/leagues/${leagueId}/settings`);
  revalidatePath(`/dashboard/leagues/${leagueId}/settings/general`);

  return { success: true };
}
