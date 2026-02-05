/**
 * Team Registration Request Denied Email Template
 *
 * Notification sent to the requester when their team registration is denied
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface TeamRequestDeniedEmailProps {
  requesterName: string;
  leagueName: string;
  teamName: string;
  denialReason: string;
  deniedAt: string;
  canReapply?: boolean;
  contactEmail?: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export function getTeamRequestDeniedEmail(props: TeamRequestDeniedEmailProps): string {
  const {
    requesterName,
    leagueName,
    teamName,
    denialReason,
    deniedAt,
    canReapply = true,
    contactEmail,
    dashboardUrl,
    unsubscribeUrl,
  } = props;

  const details: Array<{ label: string; value: string }> = [
    { label: 'Team Name', value: `<strong>${teamName}</strong>` },
    { label: 'League', value: leagueName },
    { label: 'Reviewed', value: deniedAt },
  ];

  const content = `
    <p>Hi ${requesterName},</p>

    ${createBadge('Not Approved', 'error')}

    <p style="font-size: 20px; color: #fafafa; margin-top: 16px;">
      <strong>Team Registration Update</strong>
    </p>

    <p>
      We regret to inform you that your team registration request for <strong>${teamName}</strong> in <strong>${leagueName}</strong> was not approved at this time.
    </p>

    ${createDetailsList(details)}

    <div style="background-color: rgba(251, 113, 133, 0.1); border-left: 4px solid #FB7185; border-radius: 0 8px 8px 0; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; color: #FB7185; font-weight: 600;">Reason</p>
      <p style="margin: 0; color: #fafafa;">${denialReason}</p>
    </div>

    ${canReapply ? createInfoBox(`
      <strong>You Can Reapply</strong><br>
      If you believe you can address the concerns mentioned above, you are welcome to submit a new team registration request.
    `) : createInfoBox(`
      <strong>Questions?</strong><br>
      If you have questions about this decision, please contact the league administrators.
    `)}

    ${contactEmail ? `
    <p style="color: #a3a3a3;">
      If you have questions or would like more information, please contact the league at
      <a href="mailto:${contactEmail}" style="color: #22D3EE;">${contactEmail}</a>.
    </p>
    ` : ''}

    <p style="color: #a3a3a3;">
      We appreciate your interest in joining ${leagueName} and wish you the best.
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Team Registration Update',
    preheader: `Update on your team registration request for ${teamName}`,
    content,
    buttonText: canReapply ? 'Submit New Request' : 'Return to Dashboard',
    buttonUrl: dashboardUrl,
    footerNote: 'This is an automated notification. Please do not reply to this email.',
    unsubscribeUrl,
    leagueName,
  });
}
