'use server';

/**
 * Email Sender Domain Actions
 *
 * Server actions for managing per-league custom sender domains.
 * Follows the same pattern as domain.ts (website custom domains).
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { verifyLeagueOwnerAccess } from './permissions';
import {
  createResendDomain,
  getResendDomain,
  verifyResendDomain,
  deleteResendDomain,
} from '@/lib/notifications/resend-domains';
import type { ResendDomainRecord } from '@/lib/notifications/resend-domains';

export type EmailDomainResult = {
  error?: string;
  success?: boolean;
  verified?: boolean;
  message?: string;
  records?: ResendDomainRecord[];
  status?: string;
};

// Domain validation regex
const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

/**
 * Get the current email sending domain config for a league.
 */
export async function getLeagueEmailDomain(leagueId: string): Promise<{
  domain?: string | null;
  verified?: boolean | null;
  fromName?: string | null;
  records?: ResendDomainRecord[];
  status?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: leagueData, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (error || !leagueData) {
    return { error: 'League not found' };
  }

  // Cast to access columns not yet in generated types
  const league = leagueData as any;

  // If there's a Resend domain ID, fetch current DNS record status
  let records: ResendDomainRecord[] | undefined;
  let status: string | undefined;

  if (league.email_sending_domain_resend_id) {
    const resendResult = await getResendDomain(league.email_sending_domain_resend_id);
    if (!resendResult.error) {
      records = resendResult.records;
      status = resendResult.status;
    }
  }

  return {
    domain: league.email_sending_domain,
    verified: league.email_sending_domain_verified,
    fromName: league.email_from_name,
    records,
    status,
  };
}

/**
 * Add or update a custom email sending domain for a league.
 */
export async function addLeagueEmailDomain(
  leagueId: string,
  domain: string,
  fromName?: string
): Promise<EmailDomainResult> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { error: access.error || 'Only the league owner can manage email domains' };
  }

  // Validate domain format
  const cleanDomain = domain.trim().toLowerCase();
  if (!DOMAIN_REGEX.test(cleanDomain)) {
    return { error: 'Invalid domain format. Enter a domain like barriemenshockey.com' };
  }

  const supabase = await createClient();

  // Fetch league name for default fromName
  const { data: league } = await supabase
    .from('leagues')
    .select('name')
    .eq('id', leagueId)
    .single();

  // Register domain with Resend
  const resendResult = await createResendDomain(cleanDomain);
  if (resendResult.error) {
    return { error: `Resend API error: ${resendResult.error}` };
  }

  // Save to database
  const { error: updateError } = await supabase
    .from('leagues')
    .update({
      email_sending_domain: cleanDomain,
      email_sending_domain_verified: false,
      email_sending_domain_resend_id: resendResult.id,
      email_from_name: fromName || league?.name || 'Beer League Hockey',
    } as any)
    .eq('id', leagueId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/settings`);

  return {
    success: true,
    records: resendResult.records,
    status: resendResult.status,
    message: 'Domain registered. Add the DNS records below to verify.',
  };
}

/**
 * Trigger DNS verification check for a league's email sending domain.
 */
export async function verifyLeagueEmailDomain(leagueId: string): Promise<EmailDomainResult> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { error: access.error || 'Only the league owner can verify domains' };
  }

  const supabase = await createClient();

  const { data: leagueData } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (!leagueData) {
    return { error: 'League not found' };
  }

  const resendId = (leagueData as any).email_sending_domain_resend_id;
  if (!resendId) {
    return { error: 'No email domain configured' };
  }

  // Trigger Resend DNS verification
  const result = await verifyResendDomain(resendId);
  if (result.error) {
    return { error: result.error };
  }

  const isVerified = result.status === 'verified';

  // Update verification status in DB
  await supabase
    .from('leagues')
    .update({
      email_sending_domain_verified: isVerified,
    } as any)
    .eq('id', leagueId);

  revalidatePath(`/dashboard/leagues/${leagueId}/settings`);

  return {
    success: true,
    verified: isVerified,
    records: result.records,
    status: result.status,
    message: isVerified
      ? 'Domain verified! Emails will now be sent from your custom domain.'
      : 'DNS records not yet verified. Please ensure all records are added and try again.',
  };
}

/**
 * Remove the custom email sending domain from a league.
 */
export async function removeLeagueEmailDomain(leagueId: string): Promise<EmailDomainResult> {
  const access = await verifyLeagueOwnerAccess(leagueId);
  if (!access.authorized) {
    return { error: access.error || 'Only the league owner can remove domains' };
  }

  const supabase = await createClient();

  const { data: leagueData } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (!leagueData) {
    return { error: 'League not found' };
  }

  const resendId = (leagueData as any).email_sending_domain_resend_id;

  // Delete from Resend if ID exists
  if (resendId) {
    const deleteResult = await deleteResendDomain(resendId);
    if (!deleteResult.success) {
      console.error('[EmailDomain] Resend delete error:', deleteResult.error);
      // Continue anyway — clear DB even if Resend cleanup fails
    }
  }

  // Clear DB columns
  const { error: updateError } = await supabase
    .from('leagues')
    .update({
      email_sending_domain: null,
      email_sending_domain_verified: false,
      email_sending_domain_resend_id: null,
      email_from_name: null,
    } as any)
    .eq('id', leagueId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/dashboard/leagues/${leagueId}/settings`);

  return {
    success: true,
    message: 'Custom email domain removed. Emails will use the platform default.',
  };
}
