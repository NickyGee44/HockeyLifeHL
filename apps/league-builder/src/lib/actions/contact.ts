'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';

const isDevelopment = process.env.NODE_ENV !== 'production';

export interface ContactSubmission {
  id: string;
  league_id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Get contact submissions for a league
 */
export async function getContactSubmissions(
  leagueId: string,
  filters?: { isRead?: boolean }
): Promise<{
  success: boolean;
  data?: ContactSubmission[];
  error?: string;
}> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const supabase = await createClient();

  let query = (supabase
    .from('contact_submissions') as any)
    .select('*')
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });

  if (filters?.isRead !== undefined) {
    query = query.eq('is_read', filters.isRead);
  }

  const { data, error } = await query;

  if (error) {
    if (isDevelopment) console.error('Error fetching contact submissions:', error);
    return { success: false, error: 'Failed to fetch submissions' };
  }

  return { success: true, data: data || [] };
}

/**
 * Mark a contact submission as read
 */
export async function markAsRead(submissionId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: submission } = await (supabase
    .from('contact_submissions') as any)
    .select('league_id')
    .eq('id', submissionId)
    .single();

  if (!submission) return { success: false, error: 'Submission not found' };

  const access = await verifyLeagueOwnerAccess(submission.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const { error } = await (supabase
    .from('contact_submissions') as any)
    .update({ is_read: true })
    .eq('id', submissionId);

  if (error) {
    if (isDevelopment) console.error('Error marking as read:', error);
    return { success: false, error: 'Failed to update submission' };
  }

  revalidatePath(`/dashboard/leagues/${submission.league_id}/contact-inbox`);
  return { success: true };
}

/**
 * Mark a contact submission as unread
 */
export async function markAsUnread(submissionId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: submission } = await (supabase
    .from('contact_submissions') as any)
    .select('league_id')
    .eq('id', submissionId)
    .single();

  if (!submission) return { success: false, error: 'Submission not found' };

  const access = await verifyLeagueOwnerAccess(submission.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const { error } = await (supabase
    .from('contact_submissions') as any)
    .update({ is_read: false })
    .eq('id', submissionId);

  if (error) {
    if (isDevelopment) console.error('Error marking as unread:', error);
    return { success: false, error: 'Failed to update submission' };
  }

  revalidatePath(`/dashboard/leagues/${submission.league_id}/contact-inbox`);
  return { success: true };
}

/**
 * Delete a contact submission
 */
export async function deleteSubmission(submissionId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: submission } = await (supabase
    .from('contact_submissions') as any)
    .select('league_id')
    .eq('id', submissionId)
    .single();

  if (!submission) return { success: false, error: 'Submission not found' };

  const access = await verifyLeagueOwnerAccess(submission.league_id);
  if (!access.authorized) {
    return { success: false, error: access.error || 'Not authorized' };
  }

  const { error } = await (supabase
    .from('contact_submissions') as any)
    .delete()
    .eq('id', submissionId);

  if (error) {
    if (isDevelopment) console.error('Error deleting submission:', error);
    return { success: false, error: 'Failed to delete submission' };
  }

  revalidatePath(`/dashboard/leagues/${submission.league_id}/contact-inbox`);
  return { success: true };
}
