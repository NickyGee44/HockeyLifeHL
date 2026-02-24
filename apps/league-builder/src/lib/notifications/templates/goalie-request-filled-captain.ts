import { getBaseEmailTemplate, createDetailsList, createBadge } from './base';

export interface GoalieRequestFilledCaptainEmailProps {
  captainName: string;
  leagueName: string;
  teamName: string;
  gameDate: string;
  goalieName: string;
}

export function getGoalieRequestFilledCaptainEmail(props: GoalieRequestFilledCaptainEmailProps): string {
  const content = `
    <p>Hi ${props.captainName},</p>

    ${createBadge('Request Filled', 'success')}

    <p>Your goalie request for <strong>${props.teamName}</strong> has been accepted.</p>

    ${createDetailsList([
      { label: 'Goalie', value: props.goalieName },
      { label: 'Game Time', value: props.gameDate },
      { label: 'League', value: props.leagueName },
    ])}

    <p>Please follow up with your sub goalie directly if needed.</p>
  `;

  return getBaseEmailTemplate({
    title: 'Goalie Request Filled',
    preheader: `${props.goalieName} accepted your goalie request`,
    content,
    leagueName: props.leagueName,
  });
}
