/**
 * Account deletion for mobile app
 * Calls Supabase directly (same DB as league-builder)
 * Follows the same 30-day grace period flow as the web app
 */

import { supabase } from '../supabase/client';

const GRACE_PERIOD_DAYS = 30;

export async function requestAccountDeletion(reason?: string): Promise<{
  success: boolean;
  scheduledFor?: string;
  error?: string;
}> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check for existing deletion request
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, deletion_requested_at, deletion_scheduled_for')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  const profileData = profile as any;

  if (profileData.deletion_requested_at) {
    return {
      success: false,
      error: 'Account deletion already requested',
      scheduledFor: profileData.deletion_scheduled_for,
    };
  }

  // Check for organization ownership
  const { data: ownedOrgs } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_user_id', user.id);

  if (ownedOrgs && ownedOrgs.length > 0) {
    return {
      success: false,
      error: `Cannot delete account: you own ${ownedOrgs.length} organization(s). Transfer ownership first.`,
    };
  }

  const now = new Date();
  const scheduledFor = new Date(now);
  scheduledFor.setDate(scheduledFor.getDate() + GRACE_PERIOD_DAYS);

  // Create deletion log entry
  const { error: logError } = await (supabase.from('account_deletion_log') as any).insert({
    user_id: user.id,
    profile_email: profileData.email,
    requested_at: now.toISOString(),
    scheduled_for: scheduledFor.toISOString(),
    deletion_reason: reason || null,
    ip_address: 'mobile-app',
    user_agent: 'HockeyLifeHL Mobile',
    status: 'pending',
  });

  if (logError) {
    return { success: false, error: 'Failed to create deletion request' };
  }

  // Update profile with deletion timestamps
  const { error: updateError } = await (supabase.from('profiles') as any)
    .update({
      deletion_requested_at: now.toISOString(),
      deletion_scheduled_for: scheduledFor.toISOString(),
      deletion_reason: reason || null,
    })
    .eq('id', user.id);

  if (updateError) {
    // Rollback
    await (supabase.from('account_deletion_log') as any)
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'pending');
    return { success: false, error: 'Failed to schedule deletion' };
  }

  // Sign out
  await supabase.auth.signOut();

  return {
    success: true,
    scheduledFor: scheduledFor.toISOString(),
  };
}

export async function cancelAccountDeletion(): Promise<{
  success: boolean;
  error?: string;
}> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('deletion_requested_at, deletion_scheduled_for, deleted_at')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  const profileData = profile as any;

  if (!profileData.deletion_requested_at) {
    return { success: false, error: 'No deletion request found' };
  }

  if (profileData.deleted_at) {
    return { success: false, error: 'Account already deleted' };
  }

  const scheduledFor = new Date(profileData.deletion_scheduled_for);
  if (new Date() >= scheduledFor) {
    return { success: false, error: 'Grace period expired. Deletion is in progress.' };
  }

  // Update log
  await (supabase.from('account_deletion_log') as any)
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'pending');

  // Clear profile deletion fields
  await (supabase.from('profiles') as any)
    .update({
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      deletion_reason: null,
    })
    .eq('id', user.id);

  return { success: true };
}

export async function getAccountDeletionStatus(): Promise<{
  hasPendingDeletion: boolean;
  scheduledFor?: string;
  daysRemaining?: number;
}> {
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

  const logData = deletionLog as any;
  const scheduledFor = new Date(logData.scheduled_for);
  const daysRemaining = Math.max(
    0,
    Math.ceil((scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return {
    hasPendingDeletion: true,
    scheduledFor: logData.scheduled_for,
    daysRemaining,
  };
}
