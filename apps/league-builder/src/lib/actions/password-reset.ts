'use server';

/**
 * Password Reset and Account Recovery Actions
 *
 * Handles password reset flows, account lockout, and recovery tickets
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { sendEmail } from '@/lib/notifications/email-service';
import { getPasswordResetEmail } from '@/lib/notifications/templates';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hockeylifehl.com';
const isDevelopment = process.env.NODE_ENV !== 'production';

// =============================================================================
// Types
// =============================================================================

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface LockoutStatus {
  isLocked: boolean;
  lockedUntil?: string;
  remainingAttempts?: number;
}

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
}

// =============================================================================
// Password Validation
// =============================================================================

/**
 * Validate password strength
 * Requirements: 8+ chars, uppercase, lowercase, number, special char
 */
export async function validatePassword(password: string): Promise<PasswordValidation> {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  else errors.push('At least 8 characters');

  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Uppercase check
  if (/[A-Z]/.test(password)) score += 1;
  else errors.push('At least one uppercase letter');

  // Lowercase check
  if (/[a-z]/.test(password)) score += 1;
  else errors.push('At least one lowercase letter');

  // Number check
  if (/[0-9]/.test(password)) score += 1;
  else errors.push('At least one number');

  // Special character check
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else errors.push('At least one special character (!@#$%^&*)');

  // Common password patterns (deduct points)
  if (/^(password|123456|qwerty|abc123|letmein)/i.test(password)) {
    score = Math.max(0, score - 3);
    errors.push('Avoid common passwords');
  }

  // Sequential characters (deduct points)
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
  }

  // Determine strength
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'fair';
  else if (score <= 6) strength = 'good';
  else strength = 'strong';

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score: Math.min(score, 7),
  };
}

// =============================================================================
// Account Lockout
// =============================================================================

/**
 * Check if an account is locked
 */
export async function checkAccountLocked(email: string): Promise<LockoutStatus> {
  const supabase = await createClient();

  // Note: is_account_locked RPC is defined in migrations but not in generated types yet
  const { data, error } = await (supabase.rpc as any)('is_account_locked', {
    user_email: email,
  }) as { data: Array<{ is_locked: boolean; locked_until_time: string; remaining_attempts: number }> | null; error: any };

  if (error || !data || data.length === 0) {
    return { isLocked: false, remainingAttempts: 5 };
  }

  const result = data[0];
  return {
    isLocked: result.is_locked,
    lockedUntil: result.locked_until_time,
    remainingAttempts: result.remaining_attempts,
  };
}

/**
 * Record a failed login attempt
 */
export async function recordFailedLogin(email: string): Promise<LockoutStatus> {
  const serviceSupabase = createServiceRoleClient();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Increment failed attempts
  // Note: increment_failed_login_attempts RPC is defined in migrations but not in generated types yet
  const { data, error } = await (serviceSupabase.rpc as any)('increment_failed_login_attempts', {
    user_email: email,
  }) as { data: Array<{ is_locked: boolean; locked_until_time: string; attempt_count: number }> | null; error: any };

  // Log the attempt
  // Note: login_attempts_log table is defined in migrations but not in generated types yet
  await (serviceSupabase.from as any)('login_attempts_log').insert({
    email,
    success: false,
    failure_reason: 'Invalid credentials',
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error || !data || data.length === 0) {
    return { isLocked: false, remainingAttempts: 4 };
  }

  const result = data[0];
  return {
    isLocked: result.is_locked,
    lockedUntil: result.locked_until_time,
    remainingAttempts: Math.max(0, 5 - result.attempt_count),
  };
}

/**
 * Record a successful login
 */
export async function recordSuccessfulLogin(email: string): Promise<void> {
  const serviceSupabase = createServiceRoleClient();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Reset failed attempts
  // Note: reset_failed_login_attempts RPC is defined in migrations but not in generated types yet
  await (serviceSupabase.rpc as any)('reset_failed_login_attempts', {
    user_email: email,
  });

  // Log successful login
  // Note: login_attempts_log table is defined in migrations but not in generated types yet
  await (serviceSupabase.from as any)('login_attempts_log').insert({
    email,
    success: true,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}

// =============================================================================
// Password Reset Flow
// =============================================================================

/**
 * Request a password reset email
 * Includes rate limiting to prevent abuse
 */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Validate email format
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check rate limits (3 requests per hour per IP and per email)
    // Note: check_password_reset_rate_limit RPC is defined in migrations but not in generated types yet
    const [ipRateLimit, emailRateLimit] = await Promise.all([
      (serviceSupabase.rpc as any)('check_password_reset_rate_limit', {
        p_identifier: ipAddress,
        p_type: 'ip',
        p_max_requests: 5,
        p_window_minutes: 60,
      }) as Promise<{ data: Array<{ allowed: boolean }> | null }>,
      (serviceSupabase.rpc as any)('check_password_reset_rate_limit', {
        p_identifier: normalizedEmail,
        p_type: 'email',
        p_max_requests: 3,
        p_window_minutes: 60,
      }) as Promise<{ data: Array<{ allowed: boolean }> | null }>,
    ]);

    // Check if rate limited
    const ipData = ipRateLimit.data?.[0];
    const emailData = emailRateLimit.data?.[0];

    if (ipData && !ipData.allowed) {
      return {
        success: false,
        error: 'Too many password reset requests. Please try again later.',
      };
    }

    if (emailData && !emailData.allowed) {
      // Still return success to prevent enumeration, but don't send email
      return {
        success: true,
        data: {
          message: 'If an account with this email exists, you will receive a password reset link.',
        },
      };
    }

    // Use Supabase Auth's built-in password reset
    // This generates a secure token and sends email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${SITE_URL}/reset-password`,
    });

    if (error) {
      if (isDevelopment) {
        console.error('Password reset error:', error);
      }
      // Don't reveal if email exists or not for security
      // Always return success message
    }

    // Log the password reset request
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    // Note: password_reset_log table is defined in migrations but not in generated types yet
    await (serviceSupabase.from as any)('password_reset_log').insert({
      user_id: profile?.id || null,
      email: normalizedEmail,
      reset_type: 'self_service',
      ip_address: ipAddress,
      user_agent: userAgent,
      success: !error,
      failure_reason: error?.message,
    });

    // Always return success to prevent email enumeration
    return {
      success: true,
      data: {
        message: 'If an account with this email exists, you will receive a password reset link.',
      },
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Password reset error:', error);
    }
    return {
      success: true, // Still return success to prevent enumeration
      data: {
        message: 'If an account with this email exists, you will receive a password reset link.',
      },
    };
  }
}

/**
 * Update password using the reset token (from email link)
 */
export async function updatePassword(newPassword: string): Promise<ActionResult> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Validate password strength
  const validation = await validatePassword(newPassword);
  if (!validation.valid) {
    return {
      success: false,
      error: `Password requirements not met: ${validation.errors.join(', ')}`,
    };
  }

  try {
    // Get current user (from the recovery token session)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Invalid or expired reset link. Please request a new password reset.',
      };
    }

    // Update the password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      if (isDevelopment) {
        console.error('Password update error:', error);
      }
      return {
        success: false,
        error: 'Failed to update password. Please try again.',
      };
    }

    // Update password_changed_at timestamp
    // Note: password_changed_at column may not exist in generated types yet
    await (serviceSupabase
      .from('profiles')
      .update({ password_changed_at: new Date().toISOString() } as any)
      .eq('id', user.id) as any);

    // Log successful password change
    // Note: password_reset_log table is defined in migrations but not in generated types yet
    await (serviceSupabase.from as any)('password_reset_log').insert({
      user_id: user.id,
      email: user.email || '',
      reset_type: 'self_service',
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    });

    return {
      success: true,
      data: { message: 'Password updated successfully' },
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Password update error:', error);
    }
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

// =============================================================================
// Account Recovery (Support Tickets)
// =============================================================================

/**
 * Submit an account recovery request (support ticket)
 */
export async function submitRecoveryRequest(
  formData: FormData
): Promise<ActionResult> {
  const serviceSupabase = createServiceRoleClient();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  const email = formData.get('email') as string;
  const recoveryType = formData.get('recoveryType') as string;
  const description = formData.get('description') as string;

  // Validate inputs
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  if (!recoveryType || !['password_reset', 'account_unlock', 'email_change', 'account_access'].includes(recoveryType)) {
    return { success: false, error: 'Please select a recovery type' };
  }

  if (!description || description.length < 10) {
    return { success: false, error: 'Please provide more details about your issue' };
  }

  try {
    // Find user by email if exists
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    // Create recovery request
    // Note: account_recovery_requests table is defined in migrations but not in generated types yet
    const { data, error } = await (serviceSupabase
      .from as any)('account_recovery_requests')
      .insert({
        user_id: profile?.id || null,
        email,
        recovery_type: recoveryType,
        description,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single() as { data: { id: string } | null; error: any };

    if (error || !data) {
      if (isDevelopment) {
        console.error('Recovery request error:', error);
      }
      return {
        success: false,
        error: 'Failed to submit recovery request. Please try again.',
      };
    }

    return {
      success: true,
      data: {
        ticketId: data!.id,
        message: 'Your recovery request has been submitted. Our support team will contact you within 24-48 hours.',
      },
    };
  } catch (error) {
    if (isDevelopment) {
      console.error('Recovery request error:', error);
    }
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Get user's recovery requests
 */
export async function getMyRecoveryRequests(): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Note: account_recovery_requests table is defined in migrations but not in generated types yet
  const { data, error } = await (supabase
    .from as any)('account_recovery_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: 'Failed to fetch recovery requests' };
  }

  return { success: true, data };
}

// =============================================================================
// Admin Functions
// =============================================================================

/**
 * Admin: Unlock a user's account
 */
export async function adminUnlockAccount(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Check if current user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'owner') {
    return { success: false, error: 'Unauthorized: Owner privileges required' };
  }

  // Unlock the account
  // Note: admin_unlock_account RPC is defined in migrations but not in generated types yet
  const { error } = await (supabase.rpc as any)('admin_unlock_account', {
    target_user_id: userId,
  });

  if (error) {
    return { success: false, error: 'Failed to unlock account' };
  }

  // Log admin action for audit trail
  // Note: admin_audit_log table is defined in migrations but not in generated types yet
  await (serviceSupabase.from as any)('admin_audit_log').insert({
    admin_user_id: user.id,
    action: 'account_unlock',
    target_user_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent,
    details: { reason: 'Manual unlock by admin' },
  });

  return { success: true };
}

/**
 * Admin: Initiate password reset for a user
 */
export async function adminInitiatePasswordReset(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Check if current user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminProfile?.role !== 'owner') {
    return { success: false, error: 'Unauthorized: Owner privileges required' };
  }

  // Get target user's email
  const { data: targetProfile } = await serviceSupabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (!targetProfile?.email) {
    return { success: false, error: 'User not found' };
  }

  // Use Supabase's admin API to generate a password reset link
  const { data, error } = await serviceSupabase.auth.admin.generateLink({
    type: 'recovery',
    email: targetProfile.email,
    options: {
      redirectTo: `${SITE_URL}/reset-password`,
    },
  });

  if (error) {
    if (isDevelopment) {
      console.error('Admin password reset error:', error);
    }
    return { success: false, error: 'Failed to generate password reset link' };
  }

  // Send custom email with the reset link
  const resetUrl = data.properties?.action_link || '';

  await sendEmail({
    to: targetProfile.email,
    subject: 'Password Reset Requested by Administrator',
    html: getPasswordResetEmail({
      userName: targetProfile.full_name || undefined,
      resetUrl,
      expiresIn: '1 hour',
      leagueName: 'HockeyLifeHL',
    }),
  });

  // Log the admin-initiated reset
  // Note: password_reset_log table is defined in migrations but not in generated types yet
  await (serviceSupabase.from as any)('password_reset_log').insert({
    user_id: userId,
    email: targetProfile.email,
    reset_type: 'admin_initiated',
    initiated_by: user.id,
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true,
  });

  // Log admin action for audit trail
  // Note: admin_audit_log table is defined in migrations but not in generated types yet
  await (serviceSupabase.from as any)('admin_audit_log').insert({
    admin_user_id: user.id,
    action: 'password_reset_initiated',
    target_user_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent,
    details: { target_email: targetProfile.email },
  });

  return {
    success: true,
    data: { message: 'Password reset email sent to user' },
  };
}

/**
 * Admin: Get all recovery requests
 */
export async function adminGetRecoveryRequests(status?: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Check if current user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'owner') {
    return { success: false, error: 'Unauthorized: Owner privileges required' };
  }

  // Note: account_recovery_requests table is defined in migrations but not in generated types yet
  let query = (supabase.from as any)('account_recovery_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: 'Failed to fetch recovery requests' };
  }

  return { success: true, data };
}

/**
 * Admin: Update recovery request status
 */
export async function adminUpdateRecoveryRequest(
  requestId: string,
  status: 'in_progress' | 'resolved' | 'rejected',
  notes?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Check if current user is owner
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'owner') {
    return { success: false, error: 'Unauthorized: Owner privileges required' };
  }

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'in_progress') {
    updateData.assigned_to = user.id;
  }

  if (status === 'resolved' || status === 'rejected') {
    updateData.resolved_at = new Date().toISOString();
    if (notes) {
      updateData.resolution_notes = notes;
    }
  }

  // Note: account_recovery_requests table is defined in migrations but not in generated types yet
  const { error } = await (supabase.from as any)('account_recovery_requests')
    .update(updateData)
    .eq('id', requestId);

  if (error) {
    return { success: false, error: 'Failed to update recovery request' };
  }

  return { success: true };
}
