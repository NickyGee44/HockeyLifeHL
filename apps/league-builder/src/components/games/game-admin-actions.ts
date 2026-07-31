import type { GameStatus } from '@/lib/actions/games';

export interface GameAdminActionAvailability {
  canCompleteGame: boolean;
  canGenerateGameRecap: boolean;
}

export function getGameAdminActionAvailability(
  status: GameStatus,
): GameAdminActionAvailability {
  return {
    canCompleteGame: status === 'scheduled' || status === 'in_progress' || status === 'pending_verification',
    canGenerateGameRecap: status === 'completed',
  };
}
