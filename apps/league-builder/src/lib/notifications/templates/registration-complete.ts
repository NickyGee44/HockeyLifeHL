/**
 * Registration Complete Email Template
 *
 * Welcome email sent after successful registration
 */

import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface RegistrationCompleteEmailProps {
  playerName: string;
  seasonName: string;
  registrationType: 'draft' | 'free_agent' | 'team';
  teamName?: string;
  amountPaid?: number;
  transactionId?: string;
  draftDate?: string;
  startDate: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
  leagueName?: string;
}

export function getRegistrationCompleteEmail(props: RegistrationCompleteEmailProps): string {
  const {
    playerName,
    seasonName,
    registrationType,
    teamName,
    amountPaid,
    transactionId,
    draftDate,
    startDate,
    dashboardUrl,
    unsubscribeUrl,
    leagueName = 'Beer League Hockey',
  } = props;

  const formattedAmount = amountPaid
    ? new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
      }).format(amountPaid)
    : null;

  const details = [
    { label: 'Season', value: seasonName },
    { label: 'Registration Type', value: registrationType === 'draft' ? 'Draft Pool' : registrationType === 'free_agent' ? 'Free Agent' : 'Team Registration' },
  ];

  if (teamName) {
    details.push({ label: 'Team', value: teamName });
  }

  if (formattedAmount) {
    details.push({ label: 'Amount Paid', value: `<strong style="color: #22c55e;">${formattedAmount}</strong>` });
  }

  if (transactionId) {
    details.push({ label: 'Transaction ID', value: `<code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 12px;">${transactionId}</code>` });
  }

  details.push({ label: 'Season Starts', value: startDate });

  if (draftDate && registrationType === 'draft') {
    details.push({ label: 'Draft Date', value: `<strong style="color: #22D3EE;">${draftDate}</strong>` });
  }

  const nextStepsContent = registrationType === 'draft'
    ? `
      <p style="color: #a3a3a3;"><strong>What's Next?</strong></p>
      <ol style="color: #a3a3a3;">
        <li>Mark your calendar for the draft on ${draftDate || 'TBD'}</li>
        <li>You'll receive an email when the draft room opens</li>
        <li>After the draft, you'll be assigned to a team</li>
        <li>Once teams are set, your game schedule will be available</li>
      </ol>
    `
    : registrationType === 'free_agent'
    ? `
      <p style="color: #a3a3a3;"><strong>What's Next?</strong></p>
      <ol style="color: #a3a3a3;">
        <li>You're now in the free agent pool</li>
        <li>Team captains will review your profile</li>
        <li>When a team picks you up, you'll be notified</li>
        <li>Keep an eye on your email for team assignment updates</li>
      </ol>
    `
    : `
      <p style="color: #a3a3a3;"><strong>What's Next?</strong></p>
      <ol style="color: #a3a3a3;">
        <li>Your team captain will reach out with details</li>
        <li>Check your dashboard for the game schedule</li>
        <li>Connect with your teammates</li>
        <li>Get your gear ready!</li>
      </ol>
    `;

  const content = `
    <p>Hi ${playerName},</p>

    ${createBadge('Registration Complete', 'success')}

    <p style="font-size: 24px; color: #fafafa; margin-top: 16px;">
      <strong>Welcome to ${seasonName}!</strong>
    </p>

    <p>
      Your registration has been confirmed. We're excited to have you this season!
    </p>

    ${createDetailsList(details)}

    ${createInfoBox(`
      <strong>Save this confirmation</strong><br>
      This email serves as your registration receipt. Keep it for your records.
    `)}

    ${nextStepsContent}

    <p style="color: #a3a3a3;">
      Have questions? Check out our FAQ or contact your league administrator.
    </p>
  `;

  return getBaseEmailTemplate({
    title: `Welcome to ${seasonName}!`,
    preheader: `Your registration for ${seasonName} is confirmed!`,
    content,
    buttonText: 'Go to Dashboard',
    buttonUrl: dashboardUrl,
    footerNote: 'See you on the ice!',
    unsubscribeUrl,
    leagueName,
  });
}
