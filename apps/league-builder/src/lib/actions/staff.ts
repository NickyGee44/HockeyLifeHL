'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

export interface StaffMember {
  id: string;
  league_id: string;
  name: string;
  role_title: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  bio: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Get all staff members for a league, ordered by display_order
 */
export async function getLeagueStaff(leagueId: string): Promise<{
  success: boolean;
  data?: StaffMember[];
  error?: string;
}> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  const { data, error } = await (supabase
    .from('league_staff') as any)
    .select('*')
    .eq('league_id', leagueId)
    .order('display_order', { ascending: true });

  if (error) {
    if (isDevelopment) console.error('Error fetching staff:', error);
    return { success: false, error: 'Failed to fetch staff' };
  }

  return { success: true, data: data || [] };
}

/**
 * Create a new staff member
 */
export async function createStaffMember(params: {
  leagueId: string;
  name: string;
  roleTitle: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  bio?: string;
}): Promise<{ success: boolean; data?: StaffMember; error?: string }> {
  const access = await verifyLeagueOwnerAccess(params.leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  // Get current max display_order
  const { data: existing } = await (supabase
    .from('league_staff') as any)
    .select('display_order')
    .eq('league_id', params.leagueId)
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.display_order || 0) + 1;

  const { data, error } = await (supabase
    .from('league_staff') as any)
    .insert({
      league_id: params.leagueId,
      name: params.name,
      role_title: params.roleTitle,
      email: params.email || null,
      phone: params.phone || null,
      photo_url: params.photoUrl || null,
      bio: params.bio || null,
      display_order: nextOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (isDevelopment) console.error('Error creating staff member:', error);
    return { success: false, error: 'Failed to create staff member' };
  }

  revalidatePath(`/dashboard/leagues/${params.leagueId}/staff`);
  return { success: true, data };
}

/**
 * Update an existing staff member
 */
export async function updateStaffMember(
  staffId: string,
  updates: {
    name?: string;
    roleTitle?: string;
    email?: string;
    phone?: string;
    photoUrl?: string;
    bio?: string;
    displayOrder?: number;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: staff } = await (supabase
    .from('league_staff') as any)
    .select('league_id')
    .eq('id', staffId)
    .single();

  if (!staff) return { success: false, error: 'Staff member not found' };

  const access = await verifyLeagueOwnerAccess(staff.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.roleTitle !== undefined) updateData.role_title = updates.roleTitle;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.photoUrl !== undefined) updateData.photo_url = updates.photoUrl;
  if (updates.bio !== undefined) updateData.bio = updates.bio;
  if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

  const { error } = await (supabase
    .from('league_staff') as any)
    .update(updateData)
    .eq('id', staffId);

  if (error) {
    if (isDevelopment) console.error('Error updating staff member:', error);
    return { success: false, error: 'Failed to update staff member' };
  }

  revalidatePath(`/dashboard/leagues/${staff.league_id}/staff`);
  return { success: true };
}

/**
 * Delete a staff member
 */
export async function deleteStaffMember(staffId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: staff } = await (supabase
    .from('league_staff') as any)
    .select('league_id')
    .eq('id', staffId)
    .single();

  if (!staff) return { success: false, error: 'Staff member not found' };

  const access = await verifyLeagueOwnerAccess(staff.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const { error } = await (supabase
    .from('league_staff') as any)
    .delete()
    .eq('id', staffId);

  if (error) {
    if (isDevelopment) console.error('Error deleting staff member:', error);
    return { success: false, error: 'Failed to delete staff member' };
  }

  revalidatePath(`/dashboard/leagues/${staff.league_id}/staff`);
  return { success: true };
}
