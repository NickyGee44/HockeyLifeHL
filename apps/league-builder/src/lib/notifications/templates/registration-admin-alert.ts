/**
 * New Registration Admin Alert Email Template
 *
 * Notification sent to league admins when a new registration is submitted
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface RegistrationAdminAlertEmailProps {
  adminName: string;
  leagueName: string;
  seasonName: string;
  playerName: string;
  playerEmail: string;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
  teamName?: string;
  position?: string;
  skillLevel?: string;
  submittedAt: string;
  pendingCount: number;
  registrationId: string;
  reviewUrl: string;
  unsubscribeUrl?: string;
}

export function getRegistrationAdminAlertEmail(props: RegistrationAdminAlertEmailProps): string {
  const {
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
    reviewUrl,
    unsubscribeUrl,
  } = props;

  const registrationTypeLabel = {
    team_registration: 'Team Registration',
    free_agent: 'Free Agent',
    individual: 'Individual',
  }[registrationType];

  const details: Array<{ label: string; value: string }> = [
    { label: 'Player', value: `<strong>${playerName}</strong>` },
    { label: 'Email', value: `<a href="mailto:${playerEmail}" style="color: #22D3EE;">${playerEmail}</a>` },
    { label: 'Registration Type', value: registrationTypeLabel },
  ];

  if (teamName && registrationType === 'team_registration') {
    details.push({ label: 'Requested Team', value: teamName });
  }

  if (position) {
    details.push({ label: 'Position', value: position });
  }

  if (skillLevel) {
    details.push({ label: 'Skill Level', value: skillLevel });
  }

  details.push({ label: 'Submitted', value: submittedAt });
  details.push({
    label: 'Reference ID',
    value: `<code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 12px;">${registrationId.slice(0, 8).toUpperCase()}</code>`,
  });

  const pendingBadge = pendingCount > 1
    ? `<span style="display: inline-block; margin-left: 8px; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: rgba(234, 179, 8, 0.2); color: #eab308;">${pendingCount} pending total</span>`
    : '';

  const content = `
    <p>Hi ${adminName},</p>

    ${createBadge('New Registration', 'gold')}${pendingBadge}

    <p style="font-size: 20px; color: #fafafa; margin-top: 16px;">
      <strong>New Player Registration</strong>
    </p>

    <p>
      A new registration has been submitted for <strong>${seasonName}</strong> and is awaiting your review.
    </p>

    ${createDetailsList(details)}

    ${pendingCount > 1 ? createInfoBox(`
      <strong>Action Required</strong><br>
      You have <strong>${pendingCount}</strong> pending registrations waiting for review.
      Click the button below to review all pending registrations.
    `) : createInfoBox(`
      <strong>Action Required</strong><br>
      Please review this registration and approve or reject as appropriate.
    `)}

    <p style="color: #a3a3a3;"><strong>Quick Actions:</strong></p>
    <ul style="color: #a3a3a3;">
      <li>Review player profile and waiver</li>
      <li>Verify payment status (if applicable)</li>
      <li>Approve to add player to the season</li>
      <li>Reject with reason if not eligible</li>
      <li>Waitlist if roster is full</li>
    </ul>
  `;

  return getBaseEmailTemplate({
    title: 'New Registration',
    preheader: `${playerName} has submitted a registration for ${seasonName}`,
    content,
    buttonText: 'Review Registration',
    buttonUrl: reviewUrl,
    footerNote: 'This is an automated notification for league administrators.',
    unsubscribeUrl,
    leagueName,
  });
}
