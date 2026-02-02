/**
 * Registration Rejected Email Template
 *
 * Notification sent to player when their registration is rejected
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface RegistrationRejectedEmailProps {
  playerName: string;
  leagueName: string;
  seasonName: string;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
  rejectionReason: string;
  canReapply: boolean;
  reapplyDeadline?: string;
  contactEmail?: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function getRegistrationRejectedEmail(props: RegistrationRejectedEmailProps): string {
  const {
    playerName,
    leagueName,
    seasonName,
    registrationType,
    rejectionReason,
    canReapply,
    reapplyDeadline,
    contactEmail,
    dashboardUrl,
    unsubscribeUrl,
  } = props;

  const registrationTypeLabel = {
    team_registration: 'Team Registration',
    free_agent: 'Free Agent',
    individual: 'Individual',
  }[registrationType];

  const details: Array<{ label: string; value: string }> = [
    { label: 'League', value: leagueName },
    { label: 'Season', value: seasonName },
    { label: 'Registration Type', value: registrationTypeLabel },
    { label: 'Status', value: `<strong style="color: #ef4444;">Not Approved</strong>` },
  ];

  if (reapplyDeadline) {
    details.push({ label: 'Reapply By', value: reapplyDeadline });
  }

  const reapplySection = canReapply
    ? `
      <p style="color: #a3a3a3;"><strong>What You Can Do:</strong></p>
      <ul style="color: #a3a3a3;">
        <li>Review the reason provided above</li>
        <li>Address any issues mentioned</li>
        <li>Submit a new registration if applicable</li>
        ${reapplyDeadline ? `<li>Make sure to reapply before ${reapplyDeadline}</li>` : ''}
      </ul>
    `
    : `
      <p style="color: #a3a3a3;">
        Unfortunately, this registration cannot be reconsidered at this time.
        ${contactEmail ? `If you believe this was an error, please contact us at <a href="mailto:${contactEmail}" style="color: #D4AF37;">${contactEmail}</a>.` : ''}
      </p>
    `;

  const content = `
    <p>Hi ${playerName},</p>

    ${createBadge('Not Approved', 'error')}

    <p style="font-size: 20px; color: #fafafa; margin-top: 16px;">
      <strong>Registration Update</strong>
    </p>

    <p>
      We regret to inform you that your registration for <strong>${seasonName}</strong>
      was not approved at this time.
    </p>

    ${createDetailsList(details)}

    ${createInfoBox(`
      <strong>Reason:</strong><br>
      ${rejectionReason}
    `)}

    ${reapplySection}

    <p style="color: #a3a3a3;">
      We appreciate your interest in ${leagueName} and hope to see you on the ice in the future.
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Registration Update',
    preheader: `Update on your registration for ${seasonName}`,
    content,
    buttonText: canReapply ? 'Submit New Registration' : 'Go to Dashboard',
    buttonUrl: dashboardUrl,
    footerNote: 'Thank you for your understanding.',
    unsubscribeUrl,
    leagueName,
  });
}
