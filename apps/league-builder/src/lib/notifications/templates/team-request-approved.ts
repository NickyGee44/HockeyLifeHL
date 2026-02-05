/**
 * Team Registration Request Approved Email Template
 *
 * Notification sent to the requester when their team registration is approved
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface TeamRequestApprovedEmailProps {
  requesterName: string;
  leagueName: string;
  teamName: string;
  teamShortName: string;
  assignedDivision?: string;
  approvedAt: string;
  teamDashboardUrl: string;
  unsubscribeUrl?: string;
}

export function getTeamRequestApprovedEmail(props: TeamRequestApprovedEmailProps): string {
  const {
    requesterName,
    leagueName,
    teamName,
    teamShortName,
    assignedDivision,
    approvedAt,
    teamDashboardUrl,
    unsubscribeUrl,
  } = props;

  const details: Array<{ label: string; value: string }> = [
    { label: 'Team Name', value: `<strong>${teamName}</strong>` },
    { label: 'Short Name', value: teamShortName },
    { label: 'League', value: leagueName },
  ];

  if (assignedDivision) {
    details.push({ label: 'Assigned Division', value: `<span style="color: #22D3EE; font-weight: 600;">${assignedDivision}</span>` });
  }

  details.push({ label: 'Approved', value: approvedAt });

  const content = `
    <p>Hi ${requesterName},</p>

    ${createBadge('Approved', 'success')}

    <p style="font-size: 24px; color: #fafafa; margin-top: 16px;">
      <strong>Welcome to ${leagueName}!</strong>
    </p>

    <p>
      Great news! Your team registration request for <strong>${teamName}</strong> has been approved. Your team has been created and you have been assigned as the team captain.
    </p>

    ${createDetailsList(details)}

    ${createInfoBox(`
      <strong>You're the Team Captain!</strong><br>
      As the team captain, you can now manage your team roster, invite players, and access all team management features from your dashboard.
    `)}

    <p style="color: #a3a3a3;"><strong>Next Steps:</strong></p>
    <ul style="color: #a3a3a3;">
      <li>Set up your team profile and upload a logo</li>
      <li>Invite players to join your team</li>
      <li>Review the league schedule once available</li>
      <li>Check the league rules and policies</li>
    </ul>

    <p>
      We're excited to have <strong>${teamName}</strong> as part of our league. Good luck this season!
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Team Registration Approved',
    preheader: `Congratulations! ${teamName} has been approved to join ${leagueName}`,
    content,
    buttonText: 'Go to Team Dashboard',
    buttonUrl: teamDashboardUrl,
    footerNote: 'This is an automated notification. Please do not reply to this email.',
    unsubscribeUrl,
    leagueName,
  });
}
