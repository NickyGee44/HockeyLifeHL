/**
 * Single source of truth for the captain self-scoring workflow.
 *
 * The captain flow is one linear progression driven entirely by the persisted
 * game status, so it survives reloads, offline gaps, and device switches:
 *
 *   Attendance  →  Score  →  Verify  →  Complete
 *   (scheduled)    (in_progress)  (pending_verification)  (completed)
 *
 * Within the Score step the captain adds goals/penalties, edits them, confirms
 * the score, and submits — those are actions inside the step, not separate
 * persisted states. Submitting moves the game to `pending_verification` (Verify);
 * once the opposing captain confirms (or the 24h auto-finalize runs) it becomes
 * `completed` and the recap generates.
 */

export type GameFlowStep = 'attendance' | 'score' | 'verify' | 'complete';

export interface GameFlowStepMeta {
  key: GameFlowStep;
  label: string;
  description: string;
}

export const CAPTAIN_GAME_FLOW_STEPS: readonly GameFlowStepMeta[] = [
  { key: 'attendance', label: 'Attendance', description: 'Confirm who played' },
  { key: 'score', label: 'Score', description: 'Add goals, penalties & assists, then submit' },
  { key: 'verify', label: 'Verify', description: 'Opposing captain confirms the score' },
  { key: 'complete', label: 'Complete', description: 'Recap generated' },
] as const;

/**
 * Derive the current workflow step from the persisted game status.
 * Unknown / out-of-flow statuses (cancelled, postponed) return null.
 */
export function deriveGameFlowStep(status: string | null | undefined): GameFlowStep | null {
  switch (status) {
    case 'scheduled':
      return 'attendance';
    case 'in_progress':
      return 'score';
    case 'pending_verification':
      return 'verify';
    case 'completed':
      return 'complete';
    default:
      return null;
  }
}

export function gameFlowStepIndex(step: GameFlowStep): number {
  return CAPTAIN_GAME_FLOW_STEPS.findIndex((s) => s.key === step);
}
