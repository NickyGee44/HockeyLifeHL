const TONE_INSTRUCTIONS: Record<string, string> = {
  friendly: `Write in a warm, supportive, community-focused style. Celebrate everyone's effort and participation. Highlight teamwork, good sportsmanship, and fun moments. Keep it encouraging — every player is a hero for lacing up. Avoid any negativity about losses or mistakes. These are recreational players having a great time.`,
  competitive: `Write in an NHL-broadcast style that is professional but fun and lighthearted. Reference players by their full names. Keep the tone engaging — celebrate big plays, mention clutch goals, and add personality. These are recreational players, so keep it respectful and celebratory.`,
  savage: `Write in a bold, trash-talking sports commentary style. Roast the losing team playfully, hype up dominant performances, and use dramatic language. Think sports radio hot takes meets beer league banter. Keep it in fun sports-rivalry territory — never personal, mean-spirited, or offensive. The goal is locker-room humor that both teams can laugh about over beers.`,
};

export function getGameRecapSystemPrompt(tone: string = 'competitive'): string {
  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.competitive;

  return `You are a hockey journalist writing game recaps for a beer league hockey website. ${toneInstruction}

You must respond with valid JSON in this exact format:
{
  "title": "A creative, attention-grabbing headline (max 100 chars)",
  "excerpt": "A 1-2 sentence teaser that makes readers want to read more (max 200 chars)",
  "content": "The full article in markdown format, 400-600 words",
  "tagged_player_ids": ["uuid1", "uuid2"],
  "star_player_ids": ["uuid_of_star_player"]
}

Guidelines:
- The title should be creative and catchy, like an NHL.com headline
- Include all player UUIDs who scored or had assists in tagged_player_ids
- Pick 1-3 standout performers for star_player_ids (top scorer, game-winning goal, great goalie performance)
- Use markdown formatting in content: **bold** for emphasis, ## for section headers if needed
- Mention the final score early in the article
- Highlight key goals, assists, and saves
- If there were penalties, mention notable ones
- Fictionalized colour, atmosphere, drama, and playful details are welcome, but never invent recorded hockey facts: scores, player names, goals, assists, penalties, and saves must stay exactly consistent with the provided data
- End with a forward-looking statement about the teams`;
}

export function getGameRecapUserPrompt(data: any): string {
  const {
    homeTeam, awayTeam, homeScore, awayScore,
    scheduledAt, venue, goals, penalties,
    homeGoalie, awayGoalie, standings, notes,
  } = data;

  let prompt = `Write a game recap for this beer league hockey game:\n\n`;
  prompt += `**${awayTeam.name}** ${awayScore} @ **${homeTeam.name}** ${homeScore}\n`;
  prompt += `Date: ${new Date(scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}\n`;
  if (venue) prompt += `Venue: ${venue}\n`;
  prompt += `\n`;

  // Scorekeeper/captain notes — human context to ground the recap in what
  // actually happened (standout plays, milestones, ref calls, injuries, banter).
  if (notes && String(notes).trim().length > 0) {
    prompt += `## Notes from the scorekeeper\n`;
    prompt += `${String(notes).trim()}\n`;
    prompt += `Weave any relevant details from these notes naturally into the recap. `;
    prompt += `Treat them as first-hand context, but don't quote them verbatim or invent specifics they don't mention.\n\n`;
  }

  // Goals
  if (goals && goals.length > 0) {
    prompt += `## Scoring Summary\n`;
    for (const goal of goals) {
      const assists = [goal.assist1_name, goal.assist2_name].filter(Boolean);
      const assistStr = assists.length > 0 ? ` (${assists.join(', ')})` : ' (unassisted)';
      const modifiers = [];
      if (goal.is_power_play) modifiers.push('PP');
      if (goal.is_short_handed) modifiers.push('SH');
      if (goal.is_empty_net) modifiers.push('EN');
      const modStr = modifiers.length > 0 ? ` [${modifiers.join(', ')}]` : '';
      prompt += `- P${goal.period} ${goal.time || ''}: ${goal.scorer_name} (${goal.team_name})${assistStr}${modStr}\n`;
      prompt += `  Player IDs: scorer=${goal.scorer_id}`;
      if (goal.assist1_id) prompt += `, assist1=${goal.assist1_id}`;
      if (goal.assist2_id) prompt += `, assist2=${goal.assist2_id}`;
      prompt += `\n`;
    }
    prompt += `\n`;
  }

  // Penalties
  if (penalties && penalties.length > 0) {
    prompt += `## Penalties\n`;
    for (const pen of penalties) {
      prompt += `- P${pen.period}: ${pen.player_name} (${pen.team_name}) - ${pen.penalty_type} (${pen.minutes}min)\n`;
    }
    prompt += `\n`;
  }

  // Goalie stats
  if (homeGoalie || awayGoalie) {
    prompt += `## Goaltending\n`;
    if (homeGoalie) {
      prompt += `- ${homeTeam.name}: ${homeGoalie.name} - ${homeGoalie.saves} saves, ${homeGoalie.goals_against} GA (ID: ${homeGoalie.player_id})\n`;
    }
    if (awayGoalie) {
      prompt += `- ${awayTeam.name}: ${awayGoalie.name} - ${awayGoalie.saves} saves, ${awayGoalie.goals_against} GA (ID: ${awayGoalie.player_id})\n`;
    }
    prompt += `\n`;
  }

  // Standings context
  if (standings) {
    prompt += `## Standings Context\n`;
    prompt += `${homeTeam.name}: ${standings.homeRecord}\n`;
    prompt += `${awayTeam.name}: ${standings.awayRecord}\n`;
  }

  return prompt;
}

export function getWeeklyWrapSystemPrompt(): string {
  return `You are a hockey journalist writing a weekly division roundup for a beer league hockey website. Write in an engaging, NHL-broadcast style that is professional but fun. Reference players by full names. Summarize the week's action, highlight standout performances, and discuss standings implications.

You must respond with valid JSON in this exact format:
{
  "title": "A creative weekly roundup headline (max 100 chars)",
  "excerpt": "A 1-2 sentence summary of the week's highlights (max 200 chars)",
  "content": "The full article in markdown format, 600-900 words",
  "tagged_player_ids": ["uuid1", "uuid2"],
  "star_player_ids": ["uuid_of_star_performer"]
}

Guidelines:
- Cover all games played that week with scores
- Highlight the week's top scorers and standout goalies
- Discuss standings changes and playoff implications
- Use markdown: **bold**, ## headers for game summaries
- Keep tone fun but informative — these are beer leaguers having a great time
- Pick 2-4 star players who had exceptional weeks`;
}

export function getWeeklyWrapUserPrompt(data: any): string {
  const { divisionName, games, topScorers, topGoalies, standings } = data;

  let prompt = `Write a weekly wrap-up for`;
  if (divisionName) {
    prompt += ` the **${divisionName}** division.\n\n`;
  } else {
    prompt += ` this league.\n\n`;
  }

  // Games
  prompt += `## This Week's Games\n`;
  for (const game of games) {
    prompt += `- ${game.awayTeam} ${game.awayScore} @ ${game.homeTeam} ${game.homeScore}`;
    prompt += ` (${new Date(game.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})\n`;

    if (game.scorers && game.scorers.length > 0) {
      for (const s of game.scorers) {
        prompt += `  - ${s.name} (${s.team}): ${s.goals}G ${s.assists}A (ID: ${s.player_id})\n`;
      }
    }
  }
  prompt += `\n`;

  // Top performers
  if (topScorers && topScorers.length > 0) {
    prompt += `## Top Scorers This Week\n`;
    for (const s of topScorers) {
      prompt += `- ${s.name} (${s.team}): ${s.goals}G ${s.assists}A ${s.points}P (ID: ${s.player_id})\n`;
    }
    prompt += `\n`;
  }

  if (topGoalies && topGoalies.length > 0) {
    prompt += `## Top Goalies This Week\n`;
    for (const g of topGoalies) {
      prompt += `- ${g.name} (${g.team}): ${g.saves} SVS, ${g.save_percentage}% SV% (ID: ${g.player_id})\n`;
    }
    prompt += `\n`;
  }

  // Standings
  if (standings && standings.length > 0) {
    prompt += `## Current Standings\n`;
    for (const team of standings) {
      prompt += `- ${team.name}: ${team.wins}W-${team.losses}L-${team.ties}T (${team.points} pts)\n`;
    }
  }

  return prompt;
}
