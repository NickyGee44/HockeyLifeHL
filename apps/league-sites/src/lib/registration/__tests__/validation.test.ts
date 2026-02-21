import { describe, expect, it } from '@jest/globals';
import type { RegistrationDraftData } from '@/lib/actions/registration';
import {
  canSubmitRegistration,
  validatePersonalInfoStep,
  validateSkillPositionStep,
  validateWaiverStep,
} from '@/lib/registration/validation';

function baseDraft(overrides: Partial<RegistrationDraftData> = {}): RegistrationDraftData {
  return {
    current_step: 1,
    registration_type: 'free_agent',
    full_name: 'Jamie Player',
    emergency_contact_name: 'Casey Contact',
    emergency_contact_phone: '555-123-4567',
    primary_position: 'C',
    skill_level: 'intermediate',
    signed_name: 'Jamie Player',
    payment_status: 'pending',
    ...overrides,
  };
}

describe('registration form validation', () => {
  it('validates required personal information fields', () => {
    expect(validatePersonalInfoStep(baseDraft()).valid).toBe(true);

    const missing = validatePersonalInfoStep(
      baseDraft({
        full_name: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
      })
    );
    expect(missing.valid).toBe(false);
    expect(missing.errors.length).toBeGreaterThan(0);
  });

  it('requires team selection for team registration flow', () => {
    const invalid = validatePersonalInfoStep(
      baseDraft({
        registration_type: 'team_registration',
        team_id: null,
      })
    );
    expect(invalid.valid).toBe(false);
  });

  it('validates skill and waiver steps', () => {
    expect(validateSkillPositionStep(baseDraft()).valid).toBe(true);
    expect(validateSkillPositionStep(baseDraft({ primary_position: '' })).valid).toBe(false);
    expect(validateWaiverStep(baseDraft({ signed_name: '' })).valid).toBe(false);
  });

  it('enforces payment completion when registration fee is required', () => {
    expect(canSubmitRegistration(baseDraft({ payment_status: 'pending' }), 5000)).toBe(false);
    expect(canSubmitRegistration(baseDraft({ payment_status: 'completed' }), 5000)).toBe(true);
    expect(canSubmitRegistration(baseDraft({ payment_status: 'pending' }), 0)).toBe(true);
  });
});

