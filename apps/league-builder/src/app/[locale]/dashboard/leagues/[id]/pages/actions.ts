'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { verifyLeagueOwnerAccess } from '@/lib/actions/permissions';
import type { Database } from '@hockey-life/database/types';

type CustomPageRow = Database['public']['Tables']['custom_pages']['Row'];

type CreateCustomPageInput = {
  title: string;
  slug: string;
  content: Database['public']['Tables']['custom_pages']['Insert']['content'];
  is_published: boolean;
  sort_order: number;
};

type UpdateCustomPageInput = {
  title: string;
  slug: string;
  content: Database['public']['Tables']['custom_pages']['Update']['content'];
  is_published: boolean;
};

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function assertLeagueAccess(leagueId: string): Promise<ActionResult<true>> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }
  return { success: true, data: true };
}

export async function getLeaguePreviewData(leagueId: string): Promise<ActionResult<{ slug: string }>> {
  const auth = await assertLeagueAccess(leagueId);
  if (!auth.success) return auth;

  const supabase = await createClient();
  const { data: league, error } = await supabase
    .from('leagues')
    .select('slug')
    .eq('id', leagueId)
    .single();

  if (error || !league?.slug) {
    return { success: false, error: 'League not found' };
  }

  return { success: true, data: { slug: league.slug } };
}

export async function getCustomPageForEditor(pageId: string, leagueId: string): Promise<ActionResult<CustomPageRow>> {
  const auth = await assertLeagueAccess(leagueId);
  if (!auth.success) return auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('custom_pages')
    .select('*')
    .eq('id', pageId)
    .eq('league_id', leagueId)
    .single();

  if (error || !data) {
    return { success: false, error: 'Page not found' };
  }

  return { success: true, data };
}

export async function createCustomPage(
  leagueId: string,
  payload: CreateCustomPageInput
): Promise<ActionResult<CustomPageRow>> {
  const auth = await assertLeagueAccess(leagueId);
  if (!auth.success) return auth;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('custom_pages')
    .insert({
      league_id: leagueId,
      title: payload.title,
      slug: payload.slug,
      content: payload.content,
      is_published: payload.is_published,
      sort_order: payload.sort_order,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to create page' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/pages`);
  return { success: true, data };
}

export async function updateCustomPage(
  id: string,
  leagueId: string,
  payload: UpdateCustomPageInput
): Promise<ActionResult<CustomPageRow>> {
  const auth = await assertLeagueAccess(leagueId);
  if (!auth.success) return auth;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('custom_pages')
    .update({
      title: payload.title,
      slug: payload.slug,
      content: payload.content,
      is_published: payload.is_published,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('league_id', leagueId)
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to update page' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/pages`);
  return { success: true, data };
}

export async function deleteCustomPage(id: string, leagueId: string): Promise<ActionResult<void>> {
  const auth = await assertLeagueAccess(leagueId);
  if (!auth.success) return auth;

  const supabase = await createClient();

  const { error } = await supabase
    .from('custom_pages')
    .delete()
    .eq('id', id)
    .eq('league_id', leagueId);

  if (error) {
    return { success: false, error: error.message || 'Failed to delete page' };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/pages`);
  return { success: true, data: undefined };
}
