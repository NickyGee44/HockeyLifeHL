import { getBaseEmailTemplate, createDetailsList, createBadge, createInfoBox } from './base';

export interface GoalieRequestFilledGoalieEmailProps {
  goalieName: string;
  leagueName: string;
  teamName: string;
  gameDate: string;
  compensation?: string | null;
  notes?: string | null;
}

export function getGoalieRequestFilledGoalieEmail(props: GoalieRequestFilledGoalieEmailProps): string {
  const content = `
    <p>Hi ${props.goalieName},</p>

    ${createBadge('You Are Confirmed', 'success')}

    <p>You are now confirmed as a sub goalie for <strong>${props.teamName}</strong>.</p>

    ${createDetailsList([
      { label: 'League', value: props.leagueName },
      { label: 'Team', value: props.teamName },
      { label: 'Game Time', value: props.gameDate },
      { label: 'Compensation', value: props.compensation || 'Not specified' },
    ])}

    ${props.notes ? createInfoBox(`<strong>Captain Notes:</strong><br>${props.notes}`) : ''}
  `;

  return getBaseEmailTemplate({
    title: 'Goalie Request Confirmed',
    preheader: `You are confirmed as a goalie sub for ${props.teamName}`,
    content,
    leagueName: props.leagueName,
  });
}
