import { describe, expect, it } from '@jest/globals';
import { getDraftDashboardState, normalizeDraftStatus } from '@/lib/draft/status';

describe('draft status normalization', () => {
  it('routes both deployed and legacy completion values to the complete dashboard', () => {
    expect(getDraftDashboardState('complete')).toBe('complete');
    expect(getDraftDashboardState('completed')).toBe('complete');
  });

  it('normalizes in-progress variants to the active state', () => {
    expect(normalizeDraftStatus('in_progress')).toBe('active');
    expect(normalizeDraftStatus('in-progress')).toBe('active');
  });

  it('lets admins configure a replacement after a cancelled draft', () => {
    expect(getDraftDashboardState('cancelled')).toBe('no_draft');
  });
});
