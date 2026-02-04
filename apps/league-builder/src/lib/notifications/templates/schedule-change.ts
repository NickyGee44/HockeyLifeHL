/**
 * Schedule Change Email Template
 *
 * Sent when a game is rescheduled or cancelled
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export type ScheduleChangeType = 'rescheduled' | 'cancelled';

export interface ScheduleChangeEmailProps {
  recipientName: string;
  teamName: string;
  opponentName: string;
  changeType: ScheduleChangeType;
  originalDate: string;
  originalTime: string;
  newDate?: string;
  newTime?: string;
  venueName: string;
  reason?: string;
  willReschedule?: boolean;
  dashboardUrl: string;
  unsubscribeUrl?: string;
  leagueName?: string;
}

export function getScheduleChangeEmail(props: ScheduleChangeEmailProps): string {
  const {
    recipientName,
    teamName,
    opponentName,
    changeType,
    originalDate,
    originalTime,
    newDate,
    newTime,
    venueName,
    reason,
    willReschedule,
    dashboardUrl,
    unsubscribeUrl,
    leagueName = 'Beer League Hockey',
  } = props;

  const isCancelled = changeType === 'cancelled';
  const badge = isCancelled
    ? createBadge('Game Cancelled', 'error')
    : createBadge('Game Rescheduled', 'warning');

  const title = isCancelled
    ? `Game Cancelled: ${teamName} vs ${opponentName}`
    : `Game Rescheduled: ${teamName} vs ${opponentName}`;

  const details = [
    { label: 'Your Team', value: teamName },
    { label: 'Opponent', value: opponentName },
    { label: 'Original Date', value: originalDate },
    { label: 'Original Time', value: originalTime },
  ];

  if (!isCancelled && newDate && newTime) {
    details.push(
      { label: 'New Date', value: `<strong style="color: #22D3EE;">${newDate}</strong>` },
      { label: 'New Time', value: `<strong style="color: #22D3EE;">${newTime}</strong>` }
    );
  }

  details.push({ label: 'Venue', value: venueName });

  const reasonBox = reason
    ? createInfoBox(`<strong>Reason:</strong> ${reason}`)
    : '';

  const cancelledContent = `
    <p>Hi ${recipientName},</p>

    ${badge}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>Your game has been cancelled.</strong>
    </p>

    <p>
      The game between ${teamName} and ${opponentName} originally scheduled for ${originalDate} at ${originalTime} has been cancelled.
    </p>

    ${createDetailsList(details)}

    ${reasonBox}

    ${willReschedule ? `
    <div class="info-box">
      <p><strong>Note:</strong> This game will be rescheduled. You'll receive another notification once a new date and time are confirmed.</p>
    </div>
    ` : ''}

    <p style="color: #a3a3a3;">
      Please update your calendar accordingly. If you have any questions, contact your league administrator.
    </p>
  `;

  const rescheduledContent = `
    <p>Hi ${recipientName},</p>

    ${badge}

    <p style="font-size: 18px; color: #fafafa; margin-top: 16px;">
      <strong>Your game has been rescheduled.</strong>
    </p>

    <p>
      The game between ${teamName} and ${opponentName} has been moved to a new date and time.
      Please update your calendar.
    </p>

    ${createDetailsList(details)}

    ${reasonBox}

    <p style="color: #a3a3a3;">
      Make sure to arrive at least 15 minutes early for warm-ups. See you on the ice!
    </p>
  `;

  return getBaseEmailTemplate({
    title,
    preheader: isCancelled
      ? `Game cancelled: ${teamName} vs ${opponentName}`
      : `Game rescheduled to ${newDate} at ${newTime}`,
    content: isCancelled ? cancelledContent : rescheduledContent,
    buttonText: 'View Schedule',
    buttonUrl: dashboardUrl,
    footerNote: 'Please ensure your teammates are aware of this change.',
    unsubscribeUrl,
    leagueName,
  });
}
