export type Team = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

export type GameStatus = 'Upcoming' | 'Live' | 'Final';

export type Game = {
  id: string;
  dateISO: string;
  dateLabel: string;
  timeLabel: string;
  rinkName: string;
  status: GameStatus;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
};

export type PlayerPosition = 'F' | 'D' | 'G';

export type Player = {
  id: string;
  name: string;
  teamId: string;
  position: PlayerPosition;
  jerseyNumber: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  gamesPlayed: number;
  saves?: number;
  goalsAgainst?: number;
};

export type SeasonHighlight = {
  gameId: string;
  opponent: string;
  result: string;
  goals: number;
  assists: number;
};

export type Standing = {
  teamId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  points: number;
};

export const teams: Team[] = [
  { id: 'wrecking-crew', name: 'Wrecking Crew', shortName: 'WRC', color: '#0EA5E9' },
  { id: 'ice-dogs', name: 'Ice Dogs', shortName: 'IDG', color: '#1D4ED8' },
  { id: 'grinders', name: 'Grinders', shortName: 'GRN', color: '#EF4444' },
];

export const games: Game[] = [
  {
    id: 'g1',
    dateISO: '2026-01-07T21:00:00.000Z',
    dateLabel: 'Jan 7',
    timeLabel: '9:00 PM',
    rinkName: 'North Rink',
    status: 'Final',
    awayTeamId: 'ice-dogs',
    homeTeamId: 'wrecking-crew',
    awayScore: 2,
    homeScore: 5,
  },
  {
    id: 'g2',
    dateISO: '2026-01-14T20:45:00.000Z',
    dateLabel: 'Jan 14',
    timeLabel: '8:45 PM',
    rinkName: 'South Arena',
    status: 'Final',
    awayTeamId: 'grinders',
    homeTeamId: 'ice-dogs',
    awayScore: 4,
    homeScore: 3,
  },
  {
    id: 'g3',
    dateISO: '2026-01-21T21:15:00.000Z',
    dateLabel: 'Jan 21',
    timeLabel: '9:15 PM',
    rinkName: 'North Rink',
    status: 'Final',
    awayTeamId: 'wrecking-crew',
    homeTeamId: 'grinders',
    awayScore: 2,
    homeScore: 1,
  },
  {
    id: 'g4',
    dateISO: '2026-01-28T20:30:00.000Z',
    dateLabel: 'Jan 28',
    timeLabel: '8:30 PM',
    rinkName: 'West Iceplex',
    status: 'Final',
    awayTeamId: 'ice-dogs',
    homeTeamId: 'grinders',
    awayScore: 6,
    homeScore: 2,
  },
  {
    id: 'g5',
    dateISO: '2026-02-25T01:30:00.000Z',
    dateLabel: 'Feb 24',
    timeLabel: '8:30 PM',
    rinkName: 'North Rink',
    status: 'Live',
    awayTeamId: 'wrecking-crew',
    homeTeamId: 'ice-dogs',
    awayScore: 3,
    homeScore: 3,
  },
  {
    id: 'g6',
    dateISO: '2026-03-03T02:00:00.000Z',
    dateLabel: 'Mar 2',
    timeLabel: '9:00 PM',
    rinkName: 'South Arena',
    status: 'Upcoming',
    awayTeamId: 'grinders',
    homeTeamId: 'wrecking-crew',
  },
  {
    id: 'g7',
    dateISO: '2026-03-10T01:45:00.000Z',
    dateLabel: 'Mar 9',
    timeLabel: '8:45 PM',
    rinkName: 'West Iceplex',
    status: 'Upcoming',
    awayTeamId: 'ice-dogs',
    homeTeamId: 'grinders',
  },
  {
    id: 'g8',
    dateISO: '2026-03-17T02:15:00.000Z',
    dateLabel: 'Mar 16',
    timeLabel: '9:15 PM',
    rinkName: 'North Rink',
    status: 'Upcoming',
    awayTeamId: 'wrecking-crew',
    homeTeamId: 'ice-dogs',
  },
];

export const players: Player[] = [
  {
    id: 'p1',
    name: 'Nick Grossi',
    teamId: 'wrecking-crew',
    position: 'F',
    jerseyNumber: 14,
    goals: 8,
    assists: 7,
    points: 15,
    plusMinus: 6,
    gamesPlayed: 6,
  },
  {
    id: 'p2',
    name: 'Luca Marino',
    teamId: 'wrecking-crew',
    position: 'F',
    jerseyNumber: 19,
    goals: 6,
    assists: 5,
    points: 11,
    plusMinus: 3,
    gamesPlayed: 6,
  },
  {
    id: 'p3',
    name: 'Ethan Blake',
    teamId: 'wrecking-crew',
    position: 'D',
    jerseyNumber: 4,
    goals: 2,
    assists: 6,
    points: 8,
    plusMinus: 5,
    gamesPlayed: 6,
  },
  {
    id: 'p4',
    name: 'Mason Rivera',
    teamId: 'wrecking-crew',
    position: 'D',
    jerseyNumber: 22,
    goals: 1,
    assists: 4,
    points: 5,
    plusMinus: 2,
    gamesPlayed: 6,
  },
  {
    id: 'p5',
    name: 'Noah Penn',
    teamId: 'wrecking-crew',
    position: 'G',
    jerseyNumber: 30,
    goals: 0,
    assists: 1,
    points: 1,
    plusMinus: 0,
    gamesPlayed: 6,
    saves: 142,
    goalsAgainst: 18,
  },
  {
    id: 'p6',
    name: 'Cole Turner',
    teamId: 'ice-dogs',
    position: 'F',
    jerseyNumber: 11,
    goals: 9,
    assists: 6,
    points: 15,
    plusMinus: 5,
    gamesPlayed: 6,
  },
  {
    id: 'p7',
    name: 'Jake Olin',
    teamId: 'ice-dogs',
    position: 'F',
    jerseyNumber: 7,
    goals: 7,
    assists: 5,
    points: 12,
    plusMinus: 4,
    gamesPlayed: 6,
  },
  {
    id: 'p8',
    name: 'Ben Kline',
    teamId: 'ice-dogs',
    position: 'D',
    jerseyNumber: 3,
    goals: 3,
    assists: 6,
    points: 9,
    plusMinus: 2,
    gamesPlayed: 6,
  },
  {
    id: 'p9',
    name: 'Ty Novak',
    teamId: 'ice-dogs',
    position: 'D',
    jerseyNumber: 24,
    goals: 1,
    assists: 5,
    points: 6,
    plusMinus: -1,
    gamesPlayed: 6,
  },
  {
    id: 'p10',
    name: 'Drew Kane',
    teamId: 'ice-dogs',
    position: 'G',
    jerseyNumber: 35,
    goals: 0,
    assists: 0,
    points: 0,
    plusMinus: 0,
    gamesPlayed: 6,
    saves: 134,
    goalsAgainst: 19,
  },
  {
    id: 'p11',
    name: 'Ryan Holt',
    teamId: 'grinders',
    position: 'F',
    jerseyNumber: 10,
    goals: 8,
    assists: 4,
    points: 12,
    plusMinus: 1,
    gamesPlayed: 6,
  },
  {
    id: 'p12',
    name: 'Aiden Quill',
    teamId: 'grinders',
    position: 'F',
    jerseyNumber: 17,
    goals: 5,
    assists: 6,
    points: 11,
    plusMinus: -2,
    gamesPlayed: 6,
  },
  {
    id: 'p13',
    name: 'Owen Rush',
    teamId: 'grinders',
    position: 'D',
    jerseyNumber: 2,
    goals: 2,
    assists: 4,
    points: 6,
    plusMinus: -3,
    gamesPlayed: 6,
  },
  {
    id: 'p14',
    name: 'Cam Slater',
    teamId: 'grinders',
    position: 'D',
    jerseyNumber: 27,
    goals: 1,
    assists: 3,
    points: 4,
    plusMinus: -2,
    gamesPlayed: 6,
  },
  {
    id: 'p15',
    name: 'Logan Pierce',
    teamId: 'grinders',
    position: 'G',
    jerseyNumber: 1,
    goals: 0,
    assists: 0,
    points: 0,
    plusMinus: 0,
    gamesPlayed: 6,
    saves: 121,
    goalsAgainst: 22,
  },
];

export const standings: Standing[] = [
  { teamId: 'ice-dogs', gamesPlayed: 6, wins: 4, losses: 2, points: 8 },
  { teamId: 'wrecking-crew', gamesPlayed: 6, wins: 4, losses: 2, points: 8 },
  { teamId: 'grinders', gamesPlayed: 6, wins: 1, losses: 5, points: 2 },
];

export const currentUserPlayerId = 'p1';

export const seasonHighlights: SeasonHighlight[] = [
  { gameId: 'g5', opponent: 'Ice Dogs', result: 'Live 3-3', goals: 1, assists: 1 },
  { gameId: 'g3', opponent: 'Grinders', result: 'W 2-1', goals: 1, assists: 0 },
  { gameId: 'g1', opponent: 'Ice Dogs', result: 'W 5-2', goals: 2, assists: 1 },
];

export function getTeamById(teamId: string): Team {
  const team = teams.find((item) => item.id === teamId);

  if (!team) {
    throw new Error(`Unknown team id: ${teamId}`);
  }

  return team;
}

export function getInitials(name: string): string {
  const words = name.split(' ').filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
