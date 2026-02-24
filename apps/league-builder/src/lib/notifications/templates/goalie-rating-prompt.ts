import { getBaseEmailTemplate, createDetailsList, createBadge } from './base';

export interface GoalieRatingPromptEmailProps {
  captainName: string;
  leagueName: string;
  teamName: string;
  goalieName: string;
  gameDate: string;
  ratingUrl: string;
}

export function getGoalieRatingPromptEmail(props: GoalieRatingPromptEmailProps): string {
  const content = `
    <p>Hi ${props.captainName},</p>

    ${createBadge('Rating Requested', 'gold')}

    <p>Please rate your substitute goalie from last game.</p>

    ${createDetailsList([
      { label: 'Goalie', value: props.goalieName },
      { label: 'Team', value: props.teamName },
      { label: 'Game Date', value: props.gameDate },
    ])}

    <p>Your rating is private and helps future captain decisions.</p>
  `;

  return getBaseEmailTemplate({
    title: 'Rate Your Sub Goalie',
    preheader: `How was ${props.goalieName} in your last game?`,
    content,
    buttonText: 'Rate Goalie',
    buttonUrl: props.ratingUrl,
    leagueName: props.leagueName,
  });
}
