/**
 * Team Registration Request Admin Alert Email Template
 *
 * Notification sent to league admins when a new team registration request is submitted
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface TeamRequestAdminAlertEmailProps {
  adminName: string;
  leagueName: string;
  requesterName: string;
  requesterEmail: string;
  teamName: string;
  teamShortName: string;
  teamContactEmail?: string;
  requestedDivision?: string;
  message?: string;
  submittedAt: string;
  pendingCount: number;
  requestId: string;
  reviewUrl: string;
  unsubscribeUrl?: string;
}

export function getTeamRequestAdminAlertEmail(props: TeamRequestAdminAlertEmailProps): string {
  const {
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
    reviewUrl,
    unsubscribeUrl,
  } = props;

  const details: Array<{ label: string; value: string }> = [
    { label: 'Team Name', value: `<strong>${teamName}</strong>` },
    { label: 'Short Name', value: teamShortName },
    { label: 'Requester', value: `${requesterName} (<a href="mailto:${requesterEmail}" style="color: #22D3EE;">${requesterEmail}</a>)` },
  ];

  if (teamContactEmail) {
    details.push({ label: 'Team Contact', value: `<a href="mailto:${teamContactEmail}" style="color: #22D3EE;">${teamContactEmail}</a>` });
  }

  if (requestedDivision) {
    details.push({ label: 'Requested Division', value: requestedDivision });
  }

  details.push({ label: 'Submitted', value: submittedAt });
  details.push({
    label: 'Reference ID',
    value: `<code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 12px;">${requestId.slice(0, 8).toUpperCase()}</code>`,
  });

  const pendingBadge = pendingCount > 1
    ? `<span style="display: inline-block; margin-left: 8px; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: rgba(234, 179, 8, 0.2); color: #eab308;">${pendingCount} pending total</span>`
    : '';

  const content = `
    <p>Hi ${adminName},</p>

    ${createBadge('New Team Request', 'gold')}${pendingBadge}

    <p style="font-size: 20px; color: #fafafa; margin-top: 16px;">
      <strong>New Team Registration Request</strong>
    </p>

    <p>
      A new team registration request has been submitted for <strong>${leagueName}</strong> and is awaiting your review.
    </p>

    ${createDetailsList(details)}

    ${message ? `
    <div style="background-color: rgba(0, 0, 0, 0.3); border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #a3a3a3; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Message from Requester</p>
      <p style="margin: 0; color: #fafafa; font-style: italic;">"${message}"</p>
    </div>
    ` : ''}

    ${pendingCount > 1 ? createInfoBox(`
      <strong>Action Required</strong><br>
      You have <strong>${pendingCount}</strong> pending team registration requests waiting for review.
      Click the button below to review all pending requests.
    `) : createInfoBox(`
      <strong>Action Required</strong><br>
      Please review this team registration request and approve or deny as appropriate.
    `)}

    <p style="color: #a3a3a3;"><strong>Quick Actions:</strong></p>
    <ul style="color: #a3a3a3;">
      <li>Review team information and contact details</li>
      <li>Verify the requester's eligibility</li>
      <li>Approve to create the team and assign to a division</li>
      <li>Deny with a reason if not eligible</li>
    </ul>
  `;

  return getBaseEmailTemplate({
    title: 'New Team Registration Request',
    preheader: `${requesterName} has submitted a team registration request for ${teamName} in ${leagueName}`,
    content,
    buttonText: 'Review Request',
    buttonUrl: reviewUrl,
    footerNote: 'This is an automated notification for league administrators.',
    unsubscribeUrl,
    leagueName,
  });
}
