function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function hasCompleteGoalTiming(gameData: any): boolean {
  const goals = gameData.goals || [];
  return goals.length > 0 && goals.every((goal: any) =>
    Number.isInteger(goal.period)
      && goal.period > 0
      && typeof goal.time === 'string'
      && /^\d+:\d{2}$/.test(goal.time)
  );
}

export function validateAuthoritativeGameFacts(gameData: any): void {
  const goals = gameData.goals || [];
  const homeTeam = gameData.homeTeam;
  const awayTeam = gameData.awayTeam;
  const homeScore = Number(gameData.homeScore);
  const awayScore = Number(gameData.awayScore);
  if (!homeTeam?.id || !homeTeam?.name || !awayTeam?.id || !awayTeam?.name) {
    throw new Error('Game recap requires both authoritative teams');
  }
  if (!Number.isInteger(homeScore) || homeScore < 0 || !Number.isInteger(awayScore) || awayScore < 0) {
    throw new Error('Game recap requires authoritative non-negative final scores');
  }

  const validTeamIds = new Set([homeTeam.id, awayTeam.id]);
  const invalidGoal = goals.find((goal: any) => !validTeamIds.has(goal.team_id));
  if (invalidGoal) {
    throw new Error('Recorded goal event is not assigned to either game team');
  }

  const homeGoalCount = goals.filter((goal: any) => goal.team_id === homeTeam.id).length;
  const awayGoalCount = goals.filter((goal: any) => goal.team_id === awayTeam.id).length;
  if (homeGoalCount !== homeScore || awayGoalCount !== awayScore) {
    throw new Error(
      `Recorded goal events do not match the final score (${awayGoalCount}-${homeGoalCount} events vs ${awayScore}-${homeScore} score)`,
    );
  }
}

export async function generateGroundedOrAiGameRecap(
  gameData: any,
  generateAiArticle: () => Promise<any>,
) {
  validateAuthoritativeGameFacts(gameData);
  return hasCompleteGoalTiming(gameData)
    ? generateAiArticle()
    : buildGroundedUntimedGameRecap(gameData);
}

function formatGameDate(scheduledAt: string, timezone: string): string {
  if (!timezone?.trim()) throw new Error('League timezone is required for game recap generation');

  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) throw new Error('Game scheduled_at is invalid');

  try {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: timezone,
    });
  } catch {
    throw new Error(`League timezone is invalid: ${timezone}`);
  }
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

function buildScorerRows(goals: any[], teamId: string): string[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const goal of goals.filter((entry) => entry.team_id === teamId)) {
    const key = goal.scorer_id || `team-goal:${teamId}`;
    const name = goal.scorer_id ? goal.scorer_name : 'Team Goal';
    const current = counts.get(key) || { name, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }

  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .map((entry) => `- **${entry.name}** — ${plural(entry.count, 'goal')}`);
}

function buildAssistRows(goals: any[]): string[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const goal of goals) {
    const assistsForGoal = new Map<string, string>();
    for (const [id, name] of [
      [goal.assist1_id, goal.assist1_name],
      [goal.assist2_id, goal.assist2_name],
    ]) {
      if (!id || !name) continue;
      assistsForGoal.set(id, name);
    }
    for (const [id, name] of assistsForGoal) {
      const current = counts.get(id) || { name, count: 0 };
      current.count += 1;
      counts.set(id, current);
    }
  }

  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .map((entry) => `- **${entry.name}** — ${plural(entry.count, 'assist')}`);
}

export function buildGroundedUntimedGameRecap(gameData: any) {
  if (hasCompleteGoalTiming(gameData)) {
    throw new Error('Grounded untimed recap fallback cannot be used with complete goal timing');
  }

  validateAuthoritativeGameFacts(gameData);
  const goals = gameData.goals || [];
  const homeTeam = gameData.homeTeam;
  const awayTeam = gameData.awayTeam;
  const homeScore = Number(gameData.homeScore);
  const awayScore = Number(gameData.awayScore);

  const gameDate = formatGameDate(gameData.scheduledAt, gameData.timezone);
  const totalGoals = homeScore + awayScore;
  const isTie = homeScore === awayScore;
  const winner = homeScore > awayScore ? homeTeam : awayTeam;
  const loser = homeScore > awayScore ? awayTeam : homeTeam;
  const winnerScore = Math.max(homeScore, awayScore);
  const loserScore = Math.min(homeScore, awayScore);

  const title = (isTie
    ? `${awayTeam.name} and ${homeTeam.name} Finish in a ${awayScore}-${homeScore} Draw`
    : `${winner.name} Records a ${winnerScore}-${loserScore} Win Over ${loser.name}`
  ).slice(0, 100);
  const excerpt = (isTie
    ? `${awayTeam.name} and ${homeTeam.name} finished level at ${awayScore}-${homeScore}, with ${totalGoals} recorded goals in the official game log.`
    : `${winner.name} defeated ${loser.name} ${winnerScore}-${loserScore}, backed by ${winnerScore} recorded goals.`
  ).slice(0, 200);

  const awayScorers = buildScorerRows(goals, awayTeam.id);
  const homeScorers = buildScorerRows(goals, homeTeam.id);
  const assistRows = buildAssistRows(goals);

  const playerGoalCounts = new Map<string, number>();
  for (const goal of goals) {
    if (!goal.scorer_id) continue;
    playerGoalCounts.set(goal.scorer_id, (playerGoalCounts.get(goal.scorer_id) || 0) + 1);
  }
  const maxGoals = Math.max(0, ...playerGoalCounts.values());
  const starPlayerIds = maxGoals > 0
    ? [...playerGoalCounts.entries()]
      .filter(([, count]) => count === maxGoals)
      .slice(0, 3)
      .map(([id]) => id)
    : [];
  const taggedPlayerIds = uniqueIds(goals.flatMap((goal: any) => [
    goal.scorer_id,
    goal.assist1_id,
    goal.assist2_id,
  ]));

  const venueText = gameData.venue ? ` at **${gameData.venue}**` : '';
  const resultText = isTie
    ? `the official final was **${awayTeam.name} ${awayScore}, ${homeTeam.name} ${homeScore}**.`
    : `the official final was **${winner.name} ${winnerScore}, ${loser.name} ${loserScore}**.`;
  const scoreboardLine = totalGoals >= 10
    ? `With **${totalGoals} total goals**, the scoreboard got a full workout.`
    : `The game produced **${totalGoals} recorded goals**.`;

  const content = [
    '## Final Score',
    '',
    `On **${gameDate}**${venueText}, ${resultText} ${scoreboardLine}`,
    '',
    '## Recorded Scoring',
    '',
    'Goal timing was not recorded. The totals below are presented without chronological or period-by-period interpretation.',
    '',
    `### ${awayTeam.name}`,
    ...(awayScorers.length > 0 ? awayScorers : ['- No recorded goals']),
    '',
    `### ${homeTeam.name}`,
    ...(homeScorers.length > 0 ? homeScorers : ['- No recorded goals']),
    '',
    '## Recorded Assists',
    ...(assistRows.length > 0 ? assistRows : ['- No assists were recorded']),
    '',
    '## The Official Ledger',
    '',
    `The event log reconciles exactly to the **${awayScore}-${homeScore}** final. The names and totals above come directly from the recorded scoring entries, including any goals entered as team goals.`,
    '',
    `${awayTeam.name} and ${homeTeam.name} can take the result into their next matchup with the official numbers settled and the scoreboard story safely in the books.`,
  ].join('\n');

  return {
    parsed: {
      title,
      excerpt,
      content,
      tagged_player_ids: taggedPlayerIds,
      star_player_ids: starPlayerIds,
    },
    model: 'grounded-template-v1',
  };
}
