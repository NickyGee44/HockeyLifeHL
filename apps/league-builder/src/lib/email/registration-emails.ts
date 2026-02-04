/**
 * Registration Email Notifications
 *
 * Email sending functions for player registration lifecycle events.
 * Uses premium branded email templates with Resend for delivery.
 */

import { Resend } from 'resend';
import {
  getRegistrationSubmittedEmail,
  type RegistrationSubmittedEmailProps,
} from '@/lib/notifications/templates/registration-submitted';
import {
  getRegistrationApprovedEmail,
  type RegistrationApprovedEmailProps,
} from '@/lib/notifications/templates/registration-approved';
import {
  getRegistrationRejectedEmail,
  type RegistrationRejectedEmailProps,
} from '@/lib/notifications/templates/registration-rejected';
import {
  getRegistrationAdminAlertEmail,
  type RegistrationAdminAlertEmailProps,
} from '@/lib/notifications/templates/registration-admin-alert';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@beerleaguehockey.ca';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// ============================================================================
// Email Sending Utility
// ============================================================================

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  // If Resend is not configured, log to console
  if (!resend) {
    console.log('[RegistrationEmail] Would send email:', {
      to: params.to,
      subject: params.subject,
    });
    return { success: true };
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    console.log('[RegistrationEmail] Sent email to:', params.to, params.subject);
    return { success: true };
  } catch (error) {
    console.error('[RegistrationEmail] Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// 1. Registration Submitted Email (to Player)
// ============================================================================

export async function sendRegistrationSubmittedEmail(params: {
  to: string;
  playerName: string;
  leagueName: string;
  seasonName: string;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
  teamName?: string;
  position?: string;
  skillLevel?: string;
  submittedAt: Date;
  registrationId: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    playerName,
    leagueName,
    seasonName,
    registrationType,
    teamName,
    position,
    skillLevel,
    submittedAt,
    registrationId,
  } = params;

  const templateProps: RegistrationSubmittedEmailProps = {
    playerName,
    leagueName,
    seasonName,
    registrationType,
    teamName,
    position,
    skillLevel,
    submittedAt: submittedAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    registrationId,
    dashboardUrl: `${SITE_URL}/dashboard`,
    unsubscribeUrl: `${SITE_URL}/unsubscribe`,
  };

  const html = getRegistrationSubmittedEmail(templateProps);

  return sendEmail({
    to,
    subject: `Registration Submitted - ${seasonName}`,
    html,
  });
}

// ============================================================================
// 2. Registration Approved Email (to Player)
// ============================================================================

export async function sendRegistrationApprovedEmail(params: {
  to: string;
  playerName: string;
  leagueName: string;
  seasonName: string;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
  teamName?: string;
  jerseyNumber?: number;
  position?: string;
  seasonStartDate?: Date;
  firstGameDate?: Date;
  adminNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    playerName,
    leagueName,
    seasonName,
    registrationType,
    teamName,
    jerseyNumber,
    position,
    seasonStartDate,
    firstGameDate,
    adminNotes,
  } = params;

  const templateProps: RegistrationApprovedEmailProps = {
    playerName,
    leagueName,
    seasonName,
    registrationType,
    teamName,
    jerseyNumber,
    position,
    seasonStartDate: seasonStartDate?.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    firstGameDate: firstGameDate?.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    adminNotes,
    dashboardUrl: `${SITE_URL}/dashboard`,
    scheduleUrl: teamName ? `${SITE_URL}/dashboard/schedule` : undefined,
    unsubscribeUrl: `${SITE_URL}/unsubscribe`,
  };

  const html = getRegistrationApprovedEmail(templateProps);

  return sendEmail({
    to,
    subject: `You're In! Registration Approved - ${seasonName}`,
    html,
  });
}

// ============================================================================
// 3. Registration Rejected Email (to Player)
// ============================================================================

export async function sendRegistrationRejectedEmail(params: {
  to: string;
  playerName: string;
  leagueName: string;
  seasonName: string;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
  rejectionReason: string;
  canReapply?: boolean;
  reapplyDeadline?: Date;
  contactEmail?: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    playerName,
    leagueName,
    seasonName,
    registrationType,
    rejectionReason,
    canReapply = true,
    reapplyDeadline,
    contactEmail,
  } = params;

  const templateProps: RegistrationRejectedEmailProps = {
    playerName,
    leagueName,
    seasonName,
    registrationType,
    rejectionReason,
    canReapply,
    reapplyDeadline: reapplyDeadline?.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    contactEmail,
    dashboardUrl: `${SITE_URL}/dashboard`,
    unsubscribeUrl: `${SITE_URL}/unsubscribe`,
  };

  const html = getRegistrationRejectedEmail(templateProps);

  return sendEmail({
    to,
    subject: `Registration Update - ${seasonName}`,
    html,
  });
}

// ============================================================================
// 4. New Registration Admin Alert (to League Admins)
// ============================================================================

export async function sendRegistrationAdminAlertEmail(params: {
  to: string;
  adminName: string;
  leagueName: string;
  seasonName: string;
  playerName: string;
  playerEmail: string;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
  teamName?: string;
  position?: string;
  skillLevel?: string;
  submittedAt: Date;
  pendingCount: number;
  registrationId: string;
  leagueId: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    adminName,
    leagueName,
    seasonName,
    playerName,
    playerEmail,
    registrationType,
    teamName,
    position,
    skillLevel,
    submittedAt,
    pendingCount,
    registrationId,
    leagueId,
  } = params;

  const templateProps: RegistrationAdminAlertEmailProps = {
    adminName,
    leagueName,
    seasonName,
    playerName,
    playerEmail,
    registrationType,
    teamName,
    position,
    skillLevel,
    submittedAt: submittedAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    pendingCount,
    registrationId,
    reviewUrl: `${SITE_URL}/dashboard/leagues/${leagueId}/registrations/${registrationId}`,
    unsubscribeUrl: `${SITE_URL}/unsubscribe`,
  };

  const html = getRegistrationAdminAlertEmail(templateProps);

  return sendEmail({
    to,
    subject: `New Registration: ${playerName} - ${seasonName}`,
    html,
  });
}

// ============================================================================
// Batch Send to Multiple Admins
// ============================================================================

export async function notifyLeagueAdminsOfNewRegistration(params: {
  adminEmails: Array<{ email: string; name: string }>;
  leagueName: string;
  seasonName: string;
  playerName: string;
  playerEmail: string;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
  teamName?: string;
  position?: string;
  skillLevel?: string;
  submittedAt: Date;
  pendingCount: number;
  registrationId: string;
  leagueId: string;
}): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  const {
    adminEmails,
    leagueName,
    seasonName,
    playerName,
    playerEmail,
    registrationType,
    teamName,
    position,
    skillLevel,
    submittedAt,
    pendingCount,
    registrationId,
    leagueId,
  } = params;

  let sentCount = 0;
  let failedCount = 0;

  for (const admin of adminEmails) {
    const result = await sendRegistrationAdminAlertEmail({
      to: admin.email,
      adminName: admin.name,
      leagueName,
      seasonName,
      playerName,
      playerEmail,
      registrationType,
      teamName,
      position,
      skillLevel,
      submittedAt,
      pendingCount,
      registrationId,
      leagueId,
    });

    if (result.success) {
      sentCount++;
    } else {
      failedCount++;
    }
  }

  return {
    success: failedCount === 0,
    sentCount,
    failedCount,
  };
}
