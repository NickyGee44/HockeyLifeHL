/**
 * Registration Submitted Email Template
 *
 * Confirmation email sent to player when they submit a registration
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface RegistrationSubmittedEmailProps {
  playerName: string;
  leagueName: string;
  seasonName: string;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
  teamName?: string;
  position?: string;
  skillLevel?: string;
  submittedAt: string;
  registrationId: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function getRegistrationSubmittedEmail(props: RegistrationSubmittedEmailProps): string {
  const {
    playerName,
    leagueName,
    seasonName,
    registrationType,
    teamName,
    position,
    skillLevel,
    submittedAt,
    registrationId,
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
  ];

  if (teamName && registrationType === 'team_registration') {
    details.push({ label: 'Team', value: teamName });
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

  const content = `
    <p>Hi ${playerName},</p>

    ${createBadge('Pending Review', 'warning')}

    <p style="font-size: 20px; color: #fafafa; margin-top: 16px;">
      <strong>Registration Submitted Successfully</strong>
    </p>

    <p>
      Thank you for registering for <strong>${seasonName}</strong>!
      Your registration has been received and is pending review by the league administrators.
    </p>

    ${createDetailsList(details)}

    ${createInfoBox(`
      <strong>What happens next?</strong><br>
      League administrators will review your registration. You'll receive an email once your registration has been approved or if any additional information is needed.
    `)}

    <p style="color: #a3a3a3;"><strong>While You Wait:</strong></p>
    <ul style="color: #a3a3a3;">
      <li>Review your dashboard for any updates</li>
      <li>Make sure your profile information is complete</li>
      <li>Contact the league admin if you have any questions</li>
    </ul>

    <p style="color: #a3a3a3;">
      Average review time is typically 1-3 business days.
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Registration Submitted',
    preheader: `Your registration for ${seasonName} has been submitted and is pending review.`,
    content,
    buttonText: 'View Registration Status',
    buttonUrl: dashboardUrl,
    footerNote: 'Thank you for your patience!',
    unsubscribeUrl,
    leagueName,
  });
}
