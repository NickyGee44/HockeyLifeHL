export interface LiveGameEvent {
  id: string;
  eventType: string;
  teamType: 'home' | 'away';
  period: number;
  gameTimeSeconds: number | null;
  playerId: string;
  playerName: string;
  playerNumber: number;
  assist1Name: string | null;
  assist1Number: number | null;
  assist2Name: string | null;
  assist2Number: number | null;
  penaltyType: string | null;
  penaltyMinutes: number | null;
  isPowerPlay: boolean;
  isShortHanded: boolean;
  isEmptyNet: boolean;
  isGWG: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

export interface LivePenaltyState {
  eventId: string;
  teamType: 'home' | 'away';
  playerId: string;
  playerName: string;
  playerNumber: number;
  penaltyType: string | null;
  penaltyMinutes: number;
  remainingSeconds: number;
}

export interface PublicLiveGameState {
  game: {
    id: string;
    status: string;
    homeScore: number;
    awayScore: number;
    period: number | null;
    periodTime: string | null;
    homeShots: number;
    awayShots: number;
  };
  events: LiveGameEvent[];
  activePenalties: {
    home: LivePenaltyState[];
    away: LivePenaltyState[];
    strengthLabel: string | null;
  };
}
