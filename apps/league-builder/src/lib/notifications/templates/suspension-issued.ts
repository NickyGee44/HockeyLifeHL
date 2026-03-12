/**
 * Suspension Issued Email Template
 *
 * Sent when a player is suspended from league play.
 * Two variants: one for the suspended player, one for their team captain.
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface SuspensionIssuedEmailProps {
  playerName: string;
  teamName: string;
  leagueName?: string;
  reason: string;
  startDate: string;
  endDate?: string;
  gamesRemaining: number;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export interface SuspensionCaptainEmailProps {
  captainName: string;
  playerName: string;
  teamName: string;
  leagueName?: string;
  reason: string;
  startDate: string;
  endDate?: string;
  gamesRemaining: number;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

export interface SuspensionReviewSummaryEmailProps {
  recipientName: string;
  playerName: string;
  teamName: string;
  leagueName?: string;
  reason: string;
  decision: 'approved' | 'denied';
  reviewNotes?: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
}

/**
 * Email sent to the suspended player
 */
export function getSuspensionIssuedPlayerEmail(props: SuspensionIssuedEmailProps): string {
  const {
    playerName,
    teamName,
    leagueName = 'Beer League Hockey',
    reason,
    startDate,
    endDate,
    gamesRemaining,
    dashboardUrl,
    unsubscribeUrl,
  } = props;

  const badge = createBadge('Suspension Notice', 'error');

  const details: Array<{ label: string; value: string }> = [
    { label: 'Player', value: playerName },
    { label: 'Team', value: teamName },
    { label: 'Reason', value: reason },
    { label: 'Start Date', value: startDate },
  ];

  if (endDate) {
    details.push({ label: 'End Date', value: endDate });
  }

  details.push({ label: 'Games Remaining', value: String(gamesRemaining) });

  const content = `
    <p>Hi ${playerName},</p>

    ${badge}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>You have been suspended from league play.</strong>
    </p>

    <p>
      A suspension has been issued against you in ${leagueName}. Please review the details below.
      You are not eligible to participate in games until the suspension has been fully served.
    </p>

    ${createDetailsList(details)}

    ${createInfoBox(
      '<strong>Important:</strong> Participating in games while suspended may result in additional penalties for both you and your team. If you believe this suspension was issued in error, please contact your league administrator.'
    )}

    <p style="color: #a3a3a3;">
      If you have questions about this suspension or wish to appeal, please reach out to your league administrator directly.
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Suspension Notice',
    preheader: `You have been suspended for ${gamesRemaining} game${gamesRemaining !== 1 ? 's' : ''} - ${reason}`,
    content,
    buttonText: 'View Dashboard',
    buttonUrl: dashboardUrl,
    unsubscribeUrl,
    leagueName,
  });
}

/**
 * Email sent to the team captain when a player on their team is suspended
 */
export function getSuspensionIssuedCaptainEmail(props: SuspensionCaptainEmailProps): string {
  const {
    captainName,
    playerName,
    teamName,
    leagueName = 'Beer League Hockey',
    reason,
    startDate,
    endDate,
    gamesRemaining,
    dashboardUrl,
    unsubscribeUrl,
  } = props;

  const badge = createBadge('Team Suspension Alert', 'warning');

  const details: Array<{ label: string; value: string }> = [
    { label: 'Player', value: playerName },
    { label: 'Team', value: teamName },
    { label: 'Reason', value: reason },
    { label: 'Start Date', value: startDate },
    { label: 'Games', value: `${gamesRemaining} game${gamesRemaining !== 1 ? 's' : ''}` },
  ];

  if (endDate) {
    details.push({ label: 'End Date', value: endDate });
  }

  const content = `
    <p>Hi ${captainName},</p>

    ${badge}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>A player on your team has been suspended.</strong>
    </p>

    <p>
      ${playerName} has received a suspension in ${leagueName}. As team captain, please ensure
      this player does not participate in games until the suspension has been fully served.
    </p>

    ${createDetailsList(details)}

    ${createInfoBox(
      '<strong>Captain Reminder:</strong> Please adjust your lineup accordingly. Playing a suspended player may result in forfeited games and additional penalties for the team.'
    )}

    <p style="color: #a3a3a3;">
      Contact your league administrator if you have any questions regarding this suspension.
    </p>
  `;

  return getBaseEmailTemplate({
    title: 'Team Suspension Alert',
    preheader: `${playerName} has been suspended for ${gamesRemaining} game${gamesRemaining !== 1 ? 's' : ''}`,
    content,
    buttonText: 'View Team Roster',
    buttonUrl: dashboardUrl,
    unsubscribeUrl,
    leagueName,
  });
}

/**
 * Email sent to league operators when a suspension review is completed.
 */
export function getSuspensionReviewSummaryEmail(
  props: SuspensionReviewSummaryEmailProps
): string {
  const {
    recipientName,
    playerName,
    teamName,
    leagueName = 'Beer League Hockey',
    reason,
    decision,
    reviewNotes,
    dashboardUrl,
    unsubscribeUrl,
  } = props;

  const badge = createBadge(
    decision === 'approved' ? 'Suspension Approved' : 'Suspension Denied',
    decision === 'approved' ? 'error' : 'warning'
  );

  const details: Array<{ label: string; value: string }> = [
    { label: 'Player', value: playerName },
    { label: 'Team', value: teamName },
    { label: 'Decision', value: decision === 'approved' ? 'Approved' : 'Denied' },
    { label: 'Reason', value: reason },
  ];

  if (reviewNotes) {
    details.push({ label: 'Review Notes', value: reviewNotes });
  }

  const content = `
    <p>Hi ${recipientName},</p>

    ${badge}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>A suspension review has been completed.</strong>
    </p>

    <p>
      A discipline review in ${leagueName} has been ${decision === 'approved' ? 'approved and is now active' : 'denied'}.
    </p>

    ${createDetailsList(details)}

    ${createInfoBox(
      decision === 'approved'
        ? '<strong>Next Step:</strong> Ensure captains, staff, and scorekeepers are aware before the next game.'
        : '<strong>Next Step:</strong> If further discipline is required, update the notes and submit a new review record.'
    )}
  `;

  return getBaseEmailTemplate({
    title: decision === 'approved' ? 'Suspension Approved' : 'Suspension Denied',
    preheader: `${playerName} - ${teamName}`,
    content,
    buttonText: 'Open League Dashboard',
    buttonUrl: dashboardUrl,
    unsubscribeUrl,
    leagueName,
  });
}
