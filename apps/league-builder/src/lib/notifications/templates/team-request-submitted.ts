/**
 * Team Registration Request Submitted Email Template
 *
 * Notification sent to the requester when they submit a team registration request
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface TeamRequestSubmittedEmailProps {
  requesterName: string;
  leagueName: string;
  teamName: string;
  teamShortName: string;
  requestedDivision?: string;
  submittedAt: string;
  requestId: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function getTeamRequestSubmittedEmail(props: TeamRequestSubmittedEmailProps): string {
  const {
    requesterName,
    leagueName,
    teamName,
    teamShortName,
    requestedDivision,
    submittedAt,
    requestId,
    dashboardUrl,
    unsubscribeUrl,
  } = props;

  const details: Array<{ label: string; value: string }> = [
    { label: 'Team Name', value: `<strong>${teamName}</strong>` },
    { label: 'Short Name', value: teamShortName },
    { label: 'League', value: leagueName },
  ];

  if (requestedDivision) {
    details.push({ label: 'Requested Division', value: requestedDivision });
  }

  details.push({ label: 'Submitted', value: submittedAt });
  details.push({
    label: 'Reference ID',
    value: `<code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 12px;">${requestId.slice(0, 8).toUpperCase()}</code>`,
  });

  const content = `
    <p>Hi ${requesterName},</p>

    ${createBadge('Request Submitted', 'gold')}

    <p style="font-size: 20px; color: #fafafa; margin-top: 16px;">
      <strong>Team Registration Request Received</strong>
    </p>

    <p>
      Your request to register <strong>${teamName}</strong> in <strong>${leagueName}</strong> has been submitted and is pending review by the league administrators.
    </p>

    ${createDetailsList(details)}

    ${createInfoBox(`
      <strong>What's Next?</strong><br>
      The league administrators will review your request and you will receive an email notification once it has been approved or if additional information is needed.
    `)}

    <p style="color: #a3a3a3;">
      You can view the status of your request in your dashboard at any time.
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Team Registration Submitted',
    preheader: `Your team registration request for ${teamName} in ${leagueName} has been submitted`,
    content,
    buttonText: 'View Request Status',
    buttonUrl: dashboardUrl,
    footerNote: 'This is an automated notification. Please do not reply to this email.',
    unsubscribeUrl,
    leagueName,
  });
}
