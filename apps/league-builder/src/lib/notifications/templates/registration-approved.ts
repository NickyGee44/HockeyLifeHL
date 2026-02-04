/**
 * Registration Approved Email Template
 *
 * Notification sent to player when their registration is approved
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface RegistrationApprovedEmailProps {
  playerName: string;
  leagueName: string;
  seasonName: string;
  registrationType: 'team_registration' | 'free_agent' | 'individual';
  teamName?: string;
  jerseyNumber?: number;
  position?: string;
  seasonStartDate?: string;
  firstGameDate?: string;
  adminNotes?: string;
  dashboardUrl: string;
  scheduleUrl?: string;
  unsubscribeUrl?: string;
}

export function getRegistrationApprovedEmail(props: RegistrationApprovedEmailProps): string {
  const {
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
    dashboardUrl,
    scheduleUrl,
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
    { label: 'Status', value: `<strong style="color: #22c55e;">Approved</strong>` },
  ];

  if (teamName) {
    details.push({ label: 'Team', value: `<strong style="color: #22D3EE;">${teamName}</strong>` });
  }

  if (jerseyNumber) {
    details.push({ label: 'Jersey Number', value: `#${jerseyNumber}` });
  }

  if (position) {
    details.push({ label: 'Position', value: position });
  }

  if (seasonStartDate) {
    details.push({ label: 'Season Starts', value: seasonStartDate });
  }

  if (firstGameDate) {
    details.push({ label: 'First Game', value: `<strong style="color: #22D3EE;">${firstGameDate}</strong>` });
  }

  const nextStepsContent = teamName
    ? `
      <p style="color: #a3a3a3;"><strong>Next Steps:</strong></p>
      <ol style="color: #a3a3a3;">
        <li>Check your dashboard for your team roster and schedule</li>
        <li>Connect with your teammates</li>
        <li>Mark your calendar for your first game</li>
        <li>Get your gear ready!</li>
      </ol>
    `
    : registrationType === 'free_agent'
    ? `
      <p style="color: #a3a3a3;"><strong>Next Steps:</strong></p>
      <ol style="color: #a3a3a3;">
        <li>Your profile is now visible to team captains</li>
        <li>You may be contacted for team placement</li>
        <li>Check your dashboard for updates</li>
        <li>You'll be notified when you're assigned to a team</li>
      </ol>
    `
    : `
      <p style="color: #a3a3a3;"><strong>Next Steps:</strong></p>
      <ol style="color: #a3a3a3;">
        <li>Team assignments will be announced soon</li>
        <li>Check your dashboard regularly for updates</li>
        <li>Watch for schedule announcements</li>
        <li>Start preparing for the season!</li>
      </ol>
    `;

  const adminNotesSection = adminNotes
    ? createInfoBox(`
        <strong>Note from League Admin:</strong><br>
        ${adminNotes}
      `)
    : '';

  const content = `
    <p>Hi ${playerName},</p>

    ${createBadge('Approved', 'success')}

    <p style="font-size: 24px; color: #fafafa; margin-top: 16px;">
      <strong>You're In!</strong>
    </p>

    <p>
      Great news! Your registration for <strong>${seasonName}</strong> has been approved.
      Welcome to ${leagueName}!
    </p>

    ${createDetailsList(details)}

    ${adminNotesSection}

    ${createInfoBox(`
      <strong>Save this email</strong><br>
      This serves as your official registration confirmation. Keep it for your records.
    `)}

    ${nextStepsContent}

    <p style="color: #a3a3a3;">
      Questions? Contact your league administrator or team captain.
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Registration Approved!',
    preheader: `Congratulations! Your registration for ${seasonName} has been approved.`,
    content,
    buttonText: scheduleUrl ? 'View Schedule' : 'Go to Dashboard',
    buttonUrl: scheduleUrl || dashboardUrl,
    footerNote: 'See you on the ice!',
    unsubscribeUrl,
    leagueName,
  });
}
