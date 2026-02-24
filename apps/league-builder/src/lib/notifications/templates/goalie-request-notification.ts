import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface GoalieRequestNotificationEmailProps {
  leagueName: string;
  goalieName: string;
  teamName: string;
  gameDate: string;
  compensation?: string | null;
  notes?: string | null;
  acceptUrl: string;
}

export function getGoalieRequestNotificationEmail(props: GoalieRequestNotificationEmailProps): string {
  const details = [
    { label: 'League', value: props.leagueName },
    { label: 'Team', value: props.teamName },
    { label: 'Game Time', value: props.gameDate },
    { label: 'Compensation', value: props.compensation || 'Not specified' },
  ];

  const notesBlock = props.notes
    ? createInfoBox(`<strong>Captain Notes:</strong><br>${props.notes}`)
    : '';

  const content = `
    <p>Hi ${props.goalieName},</p>

    ${createBadge('Goalie Needed', 'warning')}

    <p><strong>${props.teamName}</strong> is looking for a substitute goalie.</p>

    ${createDetailsList(details)}

    ${notesBlock}

    <p>This request is first-come-first-serve. If you can make it, accept now.</p>
  `;

  return getBaseEmailTemplate({
    title: 'Goalie Sub Request',
    preheader: `${props.teamName} needs a goalie on ${props.gameDate}`,
    content,
    buttonText: 'Accept Request',
    buttonUrl: props.acceptUrl,
    footerNote: 'You received this because you are in your league goalie pool.',
    leagueName: props.leagueName,
  });
}
