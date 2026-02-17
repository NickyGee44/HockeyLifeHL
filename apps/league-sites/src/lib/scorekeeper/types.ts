// Types for the PWA Scorekeeper offline-first architecture

export type EventType = 'goal' | 'assist' | 'penalty' | 'save' | 'period_start' | 'period_end';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';

export type PenaltyType =
  | 'minor'
  | 'major'
  | 'misconduct'
  | 'game_misconduct'
  | 'match';

export interface GameEvent {
  id: string;
  client_event_id: string; // Idempotency key - generated on client
  event_version: number; // Optimistic locking
  game_id: string;
  team_id: string;
  player_id: string;
  event_type: EventType;
  period: number;
  game_time_seconds: number; // Time in period when event occurred

  // Event-specific data
  assist_player_ids?: string[]; // For goals - up to 2 assists
  penalty_type?: PenaltyType;
  penalty_minutes?: number;
  penalty_description?: string;

  // Sync metadata
  sync_status: SyncStatus;
  created_offline: boolean;
  synced_at?: string;
  deleted_at?: string; // Soft delete for undo

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface GameSubmission {
  id: string;
  game_id: string;
  submitted_by_user_id: string;
  home_captain_user_id?: string;
  home_captain_signature?: string;
  home_captain_signed_at?: string;
  away_captain_user_id?: string;
  away_captain_signature?: string;
  away_captain_signed_at?: string;
  submission_status: 'draft' | 'pending_signatures' | 'submitted' | 'verified';
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  full_name: string;
  jersey_number: number;
  position: 'Forward' | 'Defense' | 'Goalie';
  team_id: string;
}

export interface Team {
  id: string;
  name: string;
  short_name?: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface Game {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_team?: Team;
  away_team?: Team;
  home_roster?: Player[];
  away_roster?: Player[];
  scheduled_start: string;
  period_count: number;
  period_length_minutes: number;
  current_period?: number;
  game_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface ScoreState {
  home: number;
  away: number;
  period: number;
  periodTime: number; // Seconds remaining in period
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt?: string;
  lastError?: string;
}

// IndexedDB store names
export const DB_NAME = 'beerleaguehockey-scorekeeper';
export const DB_VERSION = 1;

export const STORES = {
  EVENTS: 'game_events',
  GAMES: 'games',
  PLAYERS: 'players',
  TEAMS: 'teams',
  SUBMISSIONS: 'game_submissions',
  SYNC_QUEUE: 'sync_queue',
} as const;

// Generate a unique client event ID for idempotency
export function generateClientEventId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}
