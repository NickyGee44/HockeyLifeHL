import { describe, expect, it, jest } from '@jest/globals';
import type { RegistrationDraftData } from '@/lib/actions/registration';
import { createPaymentDraft } from '@/lib/registration/payment';

const draftData: RegistrationDraftData = {
  current_step: 3,
  registration_type: 'free_agent',
  full_name: 'Jordan Player',
  email: 'jordan@example.com',
  payment_status: 'pending',
};

describe('registration payment integration helper', () => {
  it('returns a draft id when save draft action succeeds', async () => {
    const saveDraft = jest.fn().mockResolvedValue({
      success: true,
      data: { draftId: 'draft_123' },
    });

    const draftId = await createPaymentDraft(saveDraft, 'league-1', 'season-1', draftData);
    expect(draftId).toBe('draft_123');
    expect(saveDraft).toHaveBeenCalledWith(
      'league-1',
      'season-1',
      expect.objectContaining({ current_step: 4 })
    );
  });

  it('returns null when the draft save action fails (mocked payment flow fallback)', async () => {
    const saveDraft = jest.fn().mockResolvedValue({
      success: false,
      error: 'Failed to save',
    });

    const draftId = await createPaymentDraft(saveDraft, 'league-1', 'season-1', draftData);
    expect(draftId).toBeNull();
  });
});

