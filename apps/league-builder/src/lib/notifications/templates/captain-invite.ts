/**
 * Captain Invite Email Template
 *
 * Sent when a player is invited to be a team captain
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface CaptainInviteEmailProps {
  playerName: string;
  teamName: string;
  seasonName: string;
  invitedByName: string;
  acceptUrl: string;
  declineUrl: string;
  expiresAt?: string;
  responsibilities?: string[];
  unsubscribeUrl?: string;
  leagueName?: string;
}

export function getCaptainInviteEmail(props: CaptainInviteEmailProps): string {
  const {
    playerName,
    teamName,
    seasonName,
    invitedByName,
    acceptUrl,
    declineUrl,
    expiresAt,
    responsibilities = [
      'Manage your team roster',
      'Submit game scores and verify stats',
      'Communicate with your players',
      'Handle team scheduling and logistics',
    ],
    unsubscribeUrl,
    leagueName = 'Beer League Hockey',
  } = props;

  const details = [
    { label: 'Team', value: `<strong style="color: #22D3EE;">${teamName}</strong>` },
    { label: 'Season', value: seasonName },
    { label: 'Invited by', value: invitedByName },
  ];

  if (expiresAt) {
    details.push({ label: 'Expires', value: expiresAt });
  }

  const responsibilitiesList = responsibilities
    .map(r => `<li>${r}</li>`)
    .join('');

  const content = `
    <p>Hi ${playerName},</p>

    ${createBadge('Captain Invitation', 'gold')}

    <p style="font-size: 24px; color: #fafafa; margin-top: 16px;">
      <strong>You've Been Invited to Lead!</strong>
    </p>

    <p>
      ${invitedByName} has invited you to be the captain of <strong>${teamName}</strong>
      for the ${seasonName} season.
    </p>

    ${createDetailsList(details)}

    <p style="color: #fafafa; margin-top: 24px;">
      <strong>As Captain, You'll Be Able To:</strong>
    </p>
    <ul style="color: #a3a3a3;">
      ${responsibilitiesList}
    </ul>

    ${createInfoBox(`
      <strong>This is a leadership role</strong><br>
      As captain, you'll be the primary contact for your team. Make sure you're ready for the commitment!
    `)}

    <div style="text-align: center; margin: 32px 0;">
      <a href="${acceptUrl}" style="
        display: inline-block;
        background: linear-gradient(135deg, #22D3EE 0%, #0891b2 100%);
        color: #0a0a0a !important;
        font-weight: 600;
        font-size: 16px;
        text-decoration: none;
        padding: 14px 32px;
        border-radius: 8px;
        margin-right: 12px;
      ">Accept Invitation</a>
      <a href="${declineUrl}" style="
        display: inline-block;
        background: transparent;
        border: 1px solid rgba(212, 175, 55, 0.5);
        color: #22D3EE !important;
        font-weight: 600;
        font-size: 16px;
        text-decoration: none;
        padding: 14px 32px;
        border-radius: 8px;
      ">Decline</a>
    </div>

    <p style="color: #737373; font-size: 14px; text-align: center;">
      ${expiresAt ? `This invitation expires on ${expiresAt}.` : 'Please respond as soon as possible.'}
    </p>
  `;

  return getBaseEmailTemplate({
    title: `Captain Invitation: ${teamName}`,
    preheader: `You've been invited to captain ${teamName} for ${seasonName}`,
    content,
    footerNote: 'Questions about being a captain? Contact your league administrator.',
    unsubscribeUrl,
    leagueName,
  });
}
