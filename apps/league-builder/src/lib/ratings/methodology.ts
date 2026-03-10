export const PLAYER_RATING_CATEGORY_CARDS = [
  {
    key: 'skater',
    title: 'Skater ratings',
    description:
      'Scoring impact carries the most weight. Two-way play, discipline, attendance, shot creation, and special-teams or clutch scoring are blended in when the league tracks them.',
  },
  {
    key: 'goalie',
    title: 'Goalie ratings',
    description:
      'Goalie ratings lean on save results, goals against per game, wins, shutouts, and workload. If shot detail is missing, the model shifts more weight to win rate and goals against instead of forcing a bad save-percentage input.',
  },
  {
    key: 'confidence',
    title: 'Confidence and fit',
    description:
      'Every rating is division-relative and confidence-aware. More games and richer stat coverage increase confidence. Sparse or flat data keeps ratings more conservative instead of overreacting.',
  },
] as const;

export const PLAYER_TABLE_COLUMN_HELP: Record<string, string> = {
  grade:
    'Letter grade derived from the player’s weighted percentile inside their current division. It is not a raw stat average.',
  gp: 'Games played this season. More games increase rating confidence and reduce volatility.',
  pts: 'For skaters, points are the biggest offensive driver. Goalies are not graded off points.',
  plusMinus:
    'Used as a two-way impact signal for skaters. Positive values help defense impact, but they are only one part of the model.',
  savePct:
    'Save percentage matters heavily for goalies when shots against are tracked. If shot data is missing, the engine reduces its weight automatically.',
  gaa:
    'Goals against per game. Lower is better for goalies and becomes more influential when shot detail is limited.',
  overall:
    'Overall percentile after weighting the active categories for that player, then comparing them against players in the same division.',
};

export const TEAM_RATING_METRIC_HELP: Record<string, string> = {
  overall:
    'Blends roster strength, record, depth, defense, and goaltending into one division-relative team percentile.',
  record:
    'League-normalized points percentage and goal differential. Strong results help, but they do not overpower the roster data.',
  offense:
    'Built mostly from the team’s strongest skater offense ratings, with more weight on players who consistently drive scoring.',
  defense:
    'Uses skater defensive ratings plus team goals-against context so defense is not judged off raw offense alone.',
  goalies:
    'Driven by rated goalies when available, with team defensive results used as fallback support.',
  roster:
    'Number of rated players contributing to the team model. More rated depth generally improves confidence.',
};

export const PLAYER_BREAKDOWN_METRIC_HELP: Record<
  string,
  { description: string; sway: string }
> = {
  points_per_game: {
    description: 'Primary scoring driver for skaters. Productive players move up quickly when they sustain point generation.',
    sway: 'Higher helps.',
  },
  goals_per_game: {
    description: 'Separates finishers from setup-heavy players and gives extra lift to consistent goal scorers.',
    sway: 'Higher helps.',
  },
  assists_per_game: {
    description: 'Rewards playmaking and chance creation so distributors are not underrated beside pure scorers.',
    sway: 'Higher helps.',
  },
  shot_generation: {
    description: 'Captures puck involvement and offensive pressure when shot totals are available.',
    sway: 'Higher helps.',
  },
  two_way_impact: {
    description: 'Uses plus/minus as one defensive context signal for skaters. It matters, but it is not allowed to dominate the model.',
    sway: 'Higher helps.',
  },
  discipline: {
    description: 'Penalizes players who take more minutes in the box and create avoidable team pressure.',
    sway: 'Lower helps.',
  },
  special_teams: {
    description: 'Adds lift for power-play and short-handed production when the league tracks those events.',
    sway: 'Higher helps.',
  },
  clutch_scoring: {
    description: 'Gives a small bonus to players who finish game-winning plays without overpowering the core scoring profile.',
    sway: 'Higher helps.',
  },
  attendance: {
    description: 'Rewards reliability and keeps ratings more conservative for players with weaker season availability.',
    sway: 'Higher helps.',
  },
  save_percentage: {
    description: 'The clearest shot-stopping signal for goalies when shots against are tracked accurately.',
    sway: 'Higher helps.',
  },
  goals_against_average: {
    description: 'Measures how few goals a goalie allows per appearance and takes on more weight when shot detail is sparse.',
    sway: 'Lower helps.',
  },
  win_rate: {
    description: 'Reflects team-level game outcomes around the goalie, used as supporting context rather than a standalone truth.',
    sway: 'Higher helps.',
  },
  shutout_rate: {
    description: 'A small bonus for elite clean-sheet performances when the sample is large enough to matter.',
    sway: 'Higher helps.',
  },
  workload: {
    description: 'Recognizes goalies carrying heavier shot volume without assuming that every league tracks that workload equally well.',
    sway: 'Higher helps.',
  },
};

export const DIVISION_BALANCE_HELP = {
  mean:
    'Average team percentile for the division. A balanced set of divisions should show clear but not extreme separation between tiers.',
  stdDev:
    'How spread out the teams are within the same division. Lower spread usually means better competitive balance.',
  recommendations:
    'Recommendations only fire when a team is clearly out of place in its current division and also looks like a plausible fit for the adjacent division.',
} as const;
