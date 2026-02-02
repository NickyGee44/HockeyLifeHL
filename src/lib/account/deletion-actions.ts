/**
 * GDPR Article 17: Right to Erasure
 * Server actions for account deletion workflow
 *
 * Flow:
 * 1. User requests deletion (30-day grace period starts)
 * 2. User can cancel during grace period
 * 3. After 30 days, Edge function permanently deletes account
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

const GRACE_PERIOD_DAYS = 30;

export type DeletionStatus = 'pending' | 'cancelled' | 'processing' | 'completed' | 'failed';

export interface AccountDeletionRequest {
  id: string;
  user_id: string;
  profile_email: string;
  requested_at: string;
  scheduled_for: string;
  cancelled_at: string | null;
  completed_at: string | null;
  deletion_reason: string | null;
  status: DeletionStatus;
  initial_notification_sent: boolean;
  reminder_7day_sent: boolean;
  completion_notification_sent: boolean;
}

/**
 * Request account deletion
 * Requires re-authentication before calling this
 *
 * @param reason Optional reason for deletion
 * @returns Success status or error
 */
export async function requestAccountDeletion(reason?: string): Promise<{
  success: boolean;
  scheduledFor?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Get user profile and check for existing deletion request
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, deletion_requested_at, deletion_scheduled_for')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' };
  }

  // Check if deletion already requested
  if (profile.deletion_requested_at) {
    return {
      success: false,
      error: 'Account deletion already requested',
      scheduledFor: profile.deletion_scheduled_for,
    };
  }

  // 3. Check for organization ownership
  const { data: ownedOrgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_user_id', user.id);

  if (orgsError) {
    return { success: false, error: 'Failed to check organization ownership' };
  }

  if (ownedOrgs && ownedOrgs.length > 0) {
    return {
      success: false,
      error: `Cannot delete account: you own ${ownedOrgs.length} organization(s). Transfer ownership first.`,
    };
  }

  // 4. Calculate deletion date (30 days from now)
  const now = new Date();
  const scheduledFor = new Date(now);
  scheduledFor.setDate(scheduledFor.getDate() + GRACE_PERIOD_DAYS);

  // 5. Get request metadata
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // 6. Get Stripe customer ID if exists
  const { data: stripeData } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('owner_user_id', user.id)
    .maybeSingle();

  const stripeCustomerId = stripeData?.stripe_customer_id || null;

  // 7. Create deletion log entry (using service role for INSERT)
  const { error: logError } = await supabase.from('account_deletion_log').insert({
    user_id: user.id,
    profile_email: profile.email,
    requested_at: now.toISOString(),
    scheduled_for: scheduledFor.toISOString(),
    deletion_reason: reason || null,
    ip_address: ipAddress,
    user_agent: userAgent,
    status: 'pending',
    stripe_customer_id: stripeCustomerId,
  });

  if (logError) {
    console.error('Failed to create deletion log:', logError);
    return { success: false, error: 'Failed to create deletion request' };
  }

  // 8. Update profile with deletion timestamps
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      deletion_requested_at: now.toISOString(),
      deletion_scheduled_for: scheduledFor.toISOString(),
      deletion_reason: reason || null,
      deletion_ip_address: ipAddress,
      deletion_user_agent: userAgent,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to update profile:', updateError);
    // Rollback deletion log
    await supabase.from('account_deletion_log').delete().eq('user_id', user.id).eq('status', 'pending');
    return { success: false, error: 'Failed to schedule deletion' };
  }

  // 9. Invalidate all user sessions (force re-login)
  await supabase.from('user_sessions').delete().eq('user_id', user.id);

  // 10. Send deletion notification email (async, non-blocking)
  // This will be handled by a separate API route or edge function
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/account/deletion-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        email: profile.email,
        scheduledFor: scheduledFor.toISOString(),
        reason: reason || null,
      }),
    });
  } catch (emailError) {
    console.error('Failed to send deletion notification email:', emailError);
    // Don't fail the request if email fails
  }

  // 11. Sign out user
  await supabase.auth.signOut();

  return {
    success: true,
    scheduledFor: scheduledFor.toISOString(),
  };
}

/**
 * Cancel account deletion during grace period
 */
export async function cancelAccountDeletion(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 2. Check current deletion status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('deletion_requested_at, deletion_scheduled_for, deleted_at')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' };
  }

  if (!profile.deletion_requested_at) {
    return { success: false, error: 'No deletion request found' };
  }

  if (profile.deleted_at) {
    return { success: false, error: 'Account already deleted' };
  }

  // 3. Check if grace period expired
  const scheduledFor = new Date(profile.deletion_scheduled_for);
  const now = new Date();

  if (now >= scheduledFor) {
    return {
      success: false,
      error: 'Grace period expired. Account deletion is in progress and cannot be cancelled.',
    };
  }

  // 4. Update deletion log
  const { error: logError } = await supabase
    .from('account_deletion_log')
    .update({
      status: 'cancelled',
      cancelled_at: now.toISOString(),
    })
    .eq('user_id', user.id)
    .eq('status', 'pending');

  if (logError) {
    console.error('Failed to update deletion log:', logError);
    return { success: false, error: 'Failed to cancel deletion' };
  }

  // 5. Clear deletion fields from profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      deletion_reason: null,
      deletion_ip_address: null,
      deletion_user_agent: null,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('Failed to update profile:', updateError);
    return { success: false, error: 'Failed to cancel deletion' };
  }

  // 6. Send cancellation confirmation email
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/account/deletion-cancelled-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        email: profile.email,
      }),
    });
  } catch (emailError) {
    console.error('Failed to send cancellation email:', emailError);
  }

  revalidatePath('/settings');

  return { success: true };
}

/**
 * Get current deletion status for logged-in user
 */
export async function getAccountDeletionStatus(): Promise<{
  hasPendingDeletion: boolean;
  deletionRequest?: AccountDeletionRequest;
  daysRemaining?: number;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { hasPendingDeletion: false };
  }

  const { data: deletionLog } = await supabase
    .from('account_deletion_log')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (!deletionLog) {
    return { hasPendingDeletion: false };
  }

  const scheduledFor = new Date(deletionLog.scheduled_for);
  const now = new Date();
  const daysRemaining = Math.ceil((scheduledFor.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    hasPendingDeletion: true,
    deletionRequest: deletionLog as AccountDeletionRequest,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

/**
 * Admin only: Get all deletion requests (for monitoring)
 */
export async function getAllDeletionRequests(
  status?: DeletionStatus
): Promise<{
  success: boolean;
  requests?: AccountDeletionRequest[];
  error?: string;
}> {
  const supabase = await createClient();

  // Check admin permission
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_platform_admin) {
    return { success: false, error: 'Unauthorized' };
  }

  // Query deletion requests
  let query = supabase.from('account_deletion_log').select('*').order('requested_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: 'Failed to fetch deletion requests' };
  }

  return {
    success: true,
    requests: data as AccountDeletionRequest[],
  };
}
