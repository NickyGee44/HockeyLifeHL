export type CanonicalDraftStatus = 'pending' | 'active' | 'paused' | 'complete' | 'cancelled';

export type DraftDashboardState = 'no_draft' | 'pending' | 'active' | 'paused' | 'complete';

/**
 * Normalize legacy and variant draft status values into the canonical set.
 */
export function normalizeDraftStatus(status: string | null | undefined): CanonicalDraftStatus {
  const value = (status ?? '').trim().toLowerCase();

  switch (value) {
    case 'pending':
    case 'active':
    case 'paused':
    case 'complete':
    case 'cancelled':
      return value;
    case 'completed':
      return 'complete';
    case 'in_progress':
    case 'in-progress':
      return 'active';
    case 'canceled':
      return 'cancelled';
    case 'draft':
      return 'pending';
    default:
      return 'pending';
  }
}

/**
 * Dashboard-level lifecycle state.
 * Cancelled drafts are treated as no draft so admins can set up a new draft.
 */
export function getDraftDashboardState(status: string | null | undefined): DraftDashboardState {
  const normalized = normalizeDraftStatus(status);
  if (normalized === 'cancelled') {
    return 'no_draft';
  }
  return normalized;
}
