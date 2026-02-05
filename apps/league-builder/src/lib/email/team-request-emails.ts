/**
 * Team Registration Request Email Notifications
 *
 * Email sending functions for team registration request lifecycle events.
 * Uses premium branded email templates with Resend for delivery.
 */

import { Resend } from 'resend';
import {
  getTeamRequestSubmittedEmail,
  type TeamRequestSubmittedEmailProps,
} from '@/lib/notifications/templates/team-request-submitted';
import {
  getTeamRequestAdminAlertEmail,
  type TeamRequestAdminAlertEmailProps,
} from '@/lib/notifications/templates/team-request-admin-alert';
import {
  getTeamRequestApprovedEmail,
  type TeamRequestApprovedEmailProps,
} from '@/lib/notifications/templates/team-request-approved';
import {
  getTeamRequestDeniedEmail,
  type TeamRequestDeniedEmailProps,
} from '@/lib/notifications/templates/team-request-denied';

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
    console.log('[TeamRequestEmail] Would send email:', {
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

    console.log('[TeamRequestEmail] Sent email to:', params.to, params.subject);
    return { success: true };
  } catch (error) {
    console.error('[TeamRequestEmail] Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// 1. Team Request Submitted Email (to Requester)
// ============================================================================

export async function sendTeamRequestSubmittedEmail(params: {
  to: string;
  requesterName: string;
  leagueName: string;
  teamName: string;
  teamShortName: string;
  requestedDivision?: string;
  submittedAt: Date;
  requestId: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    requesterName,
    leagueName,
    teamName,
    teamShortName,
    requestedDivision,
    submittedAt,
    requestId,
  } = params;

  const templateProps: TeamRequestSubmittedEmailProps = {
    requesterName,
    leagueName,
    teamName,
    teamShortName,
    requestedDivision,
    submittedAt: submittedAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    requestId,
    dashboardUrl: `${SITE_URL}/dashboard`,
    unsubscribeUrl: `${SITE_URL}/unsubscribe`,
  };

  const html = getTeamRequestSubmittedEmail(templateProps);

  return sendEmail({
    to,
    subject: `Team Registration Submitted - ${teamName}`,
    html,
  });
}

// ============================================================================
// 2. Team Request Admin Alert Email (to League Admins)
// ============================================================================

export async function sendTeamRequestAdminAlertEmail(params: {
  to: string;
  adminName: string;
  leagueName: string;
  requesterName: string;
  requesterEmail: string;
  teamName: string;
  teamShortName: string;
  teamContactEmail?: string;
  requestedDivision?: string;
  message?: string;
  submittedAt: Date;
  pendingCount: number;
  requestId: string;
  leagueId: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    adminName,
    leagueName,
    requesterName,
    requesterEmail,
    teamName,
    teamShortName,
    teamContactEmail,
    requestedDivision,
    message,
    submittedAt,
    pendingCount,
    requestId,
    leagueId,
  } = params;

  const templateProps: TeamRequestAdminAlertEmailProps = {
    adminName,
    leagueName,
    requesterName,
    requesterEmail,
    teamName,
    teamShortName,
    teamContactEmail,
    requestedDivision,
    message,
    submittedAt: submittedAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    pendingCount,
    requestId,
    reviewUrl: `${SITE_URL}/dashboard/leagues/${leagueId}/teams?tab=pending`,
    unsubscribeUrl: `${SITE_URL}/unsubscribe`,
  };

  const html = getTeamRequestAdminAlertEmail(templateProps);

  return sendEmail({
    to,
    subject: `New Team Request: ${teamName} - ${leagueName}`,
    html,
  });
}

// ============================================================================
// 3. Team Request Approved Email (to Requester)
// ============================================================================

export async function sendTeamRequestApprovedEmail(params: {
  to: string;
  requesterName: string;
  leagueName: string;
  teamName: string;
  teamShortName: string;
  assignedDivision?: string;
  approvedAt: Date;
  teamId: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    requesterName,
    leagueName,
    teamName,
    teamShortName,
    assignedDivision,
    approvedAt,
    teamId,
  } = params;

  const templateProps: TeamRequestApprovedEmailProps = {
    requesterName,
    leagueName,
    teamName,
    teamShortName,
    assignedDivision,
    approvedAt: approvedAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    teamDashboardUrl: `${SITE_URL}/dashboard/teams/${teamId}`,
    unsubscribeUrl: `${SITE_URL}/unsubscribe`,
  };

  const html = getTeamRequestApprovedEmail(templateProps);

  return sendEmail({
    to,
    subject: `Welcome to ${leagueName}! Team Registration Approved`,
    html,
  });
}

// ============================================================================
// 4. Team Request Denied Email (to Requester)
// ============================================================================

export async function sendTeamRequestDeniedEmail(params: {
  to: string;
  requesterName: string;
  leagueName: string;
  teamName: string;
  denialReason: string;
  deniedAt: Date;
  canReapply?: boolean;
  contactEmail?: string;
  leagueId: string;
}): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    requesterName,
    leagueName,
    teamName,
    denialReason,
    deniedAt,
    canReapply = true,
    contactEmail,
    leagueId,
  } = params;

  const templateProps: TeamRequestDeniedEmailProps = {
    requesterName,
    leagueName,
    teamName,
    denialReason,
    deniedAt: deniedAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    canReapply,
    contactEmail,
    dashboardUrl: canReapply
      ? `${SITE_URL}/dashboard/leagues/${leagueId}/register-team`
      : `${SITE_URL}/dashboard`,
    unsubscribeUrl: `${SITE_URL}/unsubscribe`,
  };

  const html = getTeamRequestDeniedEmail(templateProps);

  return sendEmail({
    to,
    subject: `Team Registration Update - ${teamName}`,
    html,
  });
}

// ============================================================================
// Batch Send to Multiple Admins
// ============================================================================

export async function notifyLeagueAdminsOfNewTeamRequest(params: {
  adminEmails: Array<{ email: string; name: string }>;
  leagueName: string;
  requesterName: string;
  requesterEmail: string;
  teamName: string;
  teamShortName: string;
  teamContactEmail?: string;
  requestedDivision?: string;
  message?: string;
  submittedAt: Date;
  pendingCount: number;
  requestId: string;
  leagueId: string;
}): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  const {
    adminEmails,
    leagueName,
    requesterName,
    requesterEmail,
    teamName,
    teamShortName,
    teamContactEmail,
    requestedDivision,
    message,
    submittedAt,
    pendingCount,
    requestId,
    leagueId,
  } = params;

  let sentCount = 0;
  let failedCount = 0;

  for (const admin of adminEmails) {
    const result = await sendTeamRequestAdminAlertEmail({
      to: admin.email,
      adminName: admin.name,
      leagueName,
      requesterName,
      requesterEmail,
      teamName,
      teamShortName,
      teamContactEmail,
      requestedDivision,
      message,
      submittedAt,
      pendingCount,
      requestId,
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
