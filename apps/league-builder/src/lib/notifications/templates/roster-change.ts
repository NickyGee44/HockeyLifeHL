/**
 * Roster Change Email Template
 *
 * Sent when a player is added to or removed from a team
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export type RosterChangeType = 'added' | 'removed';

export interface RosterChangeEmailProps {
  playerName: string;
  teamName: string;
  changeType: RosterChangeType;
  seasonName: string;
  changedByName?: string;
  reason?: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
  leagueName?: string;
}

export function getRosterChangeEmail(props: RosterChangeEmailProps): string {
  const {
    playerName,
    teamName,
    changeType,
    seasonName,
    changedByName,
    reason,
    dashboardUrl,
    unsubscribeUrl,
    leagueName = 'HockeyLifeHL',
  } = props;

  const isAdded = changeType === 'added';
  const badge = isAdded
    ? createBadge('Added to Team', 'success')
    : createBadge('Removed from Team', 'warning');

  const title = isAdded
    ? `Welcome to ${teamName}!`
    : `Roster Update: ${teamName}`;

  const greeting = isAdded
    ? `Great news! You've been added to ${teamName}!`
    : `Your roster status has changed.`;

  const details = [
    { label: 'Team', value: teamName },
    { label: 'Season', value: seasonName },
    { label: 'Status', value: isAdded ? 'Active Player' : 'Removed' },
  ];

  if (changedByName) {
    details.push({ label: 'Updated by', value: changedByName });
  }

  const reasonBox = reason
    ? createInfoBox(`<strong>Note:</strong> ${reason}`)
    : '';

  const addedContent = `
    <p>Hi ${playerName},</p>

    ${badge}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>${greeting}</strong>
    </p>

    <p>
      You're now part of the ${teamName} roster for the ${seasonName} season.
      Your team captain will reach out with more details about practice schedules and game times.
    </p>

    ${createDetailsList(details)}

    ${reasonBox}

    <p style="color: #a3a3a3;">
      <strong>What's next?</strong>
    </p>
    <ul style="color: #a3a3a3;">
      <li>Check your dashboard for the team schedule</li>
      <li>Connect with your teammates</li>
      <li>Get ready for the season!</li>
    </ul>
  `;

  const removedContent = `
    <p>Hi ${playerName},</p>

    ${badge}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>${greeting}</strong>
    </p>

    <p>
      You have been removed from the ${teamName} roster for the ${seasonName} season.
    </p>

    ${createDetailsList(details)}

    ${reasonBox}

    <p style="color: #a3a3a3;">
      If you believe this was a mistake or have questions, please contact your league administrator.
    </p>
  `;

  return getBaseEmailTemplate({
    title,
    preheader: isAdded
      ? `You've been added to ${teamName} for ${seasonName}`
      : `Roster update for ${teamName}`,
    content: isAdded ? addedContent : removedContent,
    buttonText: 'View Dashboard',
    buttonUrl: dashboardUrl,
    unsubscribeUrl,
    leagueName,
  });
}
