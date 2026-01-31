// Draft Room Types

export interface Draft {
  id: string;
  name: string;
  season_id: string;
  league_id: string;
  status: 'pending' | 'active' | 'paused' | 'complete' | 'cancelled';
  current_pick: number;
  current_round: number;
  current_team_id: string | null;
  pick_time_seconds: number;
  auto_pick_enabled: boolean;
  snake_draft: boolean;
  total_rounds: number | null;
  current_pick_started_at: string | null;
  current_pick_expires_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface DraftPick {
  id: string;
  draft_id: string;
  team_id: string;
  player_id: string;
  pick_number: number;
  round: number;
  auto_picked: boolean;
  picked_by: string | null;
  pick_time_ms: number | null;
  created_at: string;
  // Joined data
  player_name?: string;
  team_name?: string;
}

export interface DraftPlayer {
  player_id: string;
  player_name: string;
  player_position: string | null;
  skill_level: string | null;
  auto_pick_rank: number | null;
}

export interface DraftTeam {
  id: string;
  name: string;
  logo?: string;
  colors?: string;
  picks: DraftPick[];
}

export interface DraftOrder {
  id: string;
  draft_id: string;
  team_id: string;
  pick_position: number;
  round: number;
  team_name?: string;
}

export interface DraftMessage {
  id: string;
  draft_id: string;
  user_id: string;
  team_id: string | null;
  message: string;
  message_type: 'chat' | 'system' | 'pick_announcement';
  created_at: string;
  // Joined data
  user_name?: string;
  team_name?: string;
}

export interface DraftState {
  draft: Draft;
  current_pick: {
    round: number;
    pick: number;
    team_id: string;
    team_name: string;
    expires_at: string | null;
  };
  picks_made: number;
  players_remaining: number;
}

export interface DraftRoomProps {
  draftId: string;
  userId: string;
  userTeamId?: string;
  isAdmin?: boolean;
  isCaptain?: boolean;
}
