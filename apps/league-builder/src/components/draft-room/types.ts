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
  // New fields
  draft_type: 'snake' | 'linear';
  allow_trades: boolean;
  auto_advance: boolean;
  require_roster_confirmation: boolean;
  min_roster_size: number;
  max_roster_size: number;
  last_pick_id: string | null;
  undo_available: boolean;
  created_by: string | null;
}

export interface DraftPick {
  id: string;
  draft_id: string;
  team_id: string;
  player_id: string;
  pick_number: number;
  round: number;
  auto_picked: boolean | null;
  picked_by: string | null;
  pick_time_ms: number | null;
  created_at: string | null;
  league_id: string;
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
  round: number | null;
  league_id: string;
  created_at: string | null;
  team_name?: string;
}

export interface DraftMessage {
  id: string;
  draft_id: string;
  user_id: string;
  team_id: string | null;
  message: string;
  message_type: 'chat' | 'system' | 'pick_announcement' | string | null;
  created_at: string | null;
  league_id: string;
  // Joined data
  user_name?: string;
  team_name?: string | null;
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

// Draft Setup Types
export interface DraftSetupConfig {
  name: string;
  draftType: 'snake' | 'linear';
  pickTimeSeconds: number;
  totalRounds: number;
  autoPickEnabled: boolean;
  allowTrades: boolean;
  requireRosterConfirmation: boolean;
}

export interface DraftSetupWizardProps {
  leagueId: string;
  seasonId: string;
  onComplete: (draftId: string) => void;
  onCancel: () => void;
}

// Trade Types
export interface DraftPickTrade {
  id: string;
  draft_id: string;
  league_id: string;
  from_team_id: string;
  to_team_id: string;
  round: number;
  original_pick_position: number;
  traded_at: string;
  traded_by: string | null;
  notes: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  // Joined data
  from_team_name?: string;
  to_team_name?: string;
}

export interface TradePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId: string;
  teams: DraftTeam[];
  currentRound: number;
  totalRounds: number;
  onTradeComplete: () => void;
}

// Roster Confirmation Types
export interface RosterConfirmationType {
  id: string;
  draft_id: string;
  team_id: string;
  league_id: string;
  confirmed_by: string;
  confirmed_at: string;
  notes: string | null;
  has_issues: boolean;
}

export interface RosterConfirmationProps {
  draftId: string;
  teamId: string;
  picks: DraftPick[];
  onConfirm: () => void;
  isConfirmed: boolean;
}

// Draft Controls Props
export interface DraftControlsProps {
  draft: Draft;
  isAdmin: boolean;
  onPause: () => void;
  onResume: () => void;
  onUndo: () => void;
  onOpenTrade: () => void;
  isSubmitting: boolean;
}

// Draft Complete Modal Props
export interface DraftCompleteModalProps {
  isOpen: boolean;
  draft: Draft;
  picks: DraftPick[];
  teams: DraftTeam[];
  onClose: () => void;
}

// Draft Results Export Types
export interface DraftResults {
  draft: {
    id: string;
    name: string;
    status: string;
    draft_type: string;
    total_rounds: number;
    started_at: string | null;
    completed_at: string | null;
  };
  picks: Array<{
    pick_number: number;
    round: number;
    team_name: string;
    player_name: string;
    position: string | null;
    skill_level: string | null;
    auto_picked: boolean;
    pick_time_ms: number | null;
  }>;
  teams: Array<{
    team_id: string;
    team_name: string;
    total_picks: number;
    roster_confirmed: boolean;
  }>;
  trades: Array<{
    round: number;
    from_team: string;
    to_team: string;
    traded_at: string;
  }> | null;
}
