import type { RegistrationDraftData, LeagueFormConfig } from '@/lib/actions/registration';

export interface StepValidationResult {
  valid: boolean;
  errors: string[];
}

function valuePresent(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validatePersonalInfoStep(
  data: RegistrationDraftData,
  leagueFormConfig?: LeagueFormConfig
): StepValidationResult {
  const errors: string[] = [];

  if (!valuePresent(data.full_name)) {
    errors.push('Full name is required.');
  }

  if (data.registration_type === 'team_registration') {
    if (!valuePresent(data.team_id || '')) {
      errors.push('Team selection is required for team registration.');
    }
    // paid_team_rep is informational — not blocked if not answered
  }

  if (!valuePresent(data.emergency_contact_name)) {
    errors.push('Emergency contact name is required.');
  }

  if (!valuePresent(data.emergency_contact_phone)) {
    errors.push('Emergency contact phone is required.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateLeaguePreferencesStep(
  _data: RegistrationDraftData,
  _leagueFormConfig?: LeagueFormConfig
): StepValidationResult {
  // All league preference fields are optional by default.
  // League owners can make fields required via future config — not implemented in v1.
  return { valid: true, errors: [] };
}

export function validateSkillPositionStep(
  data: RegistrationDraftData
): StepValidationResult {
  const errors: string[] = [];

  if (!valuePresent(data.primary_position)) {
    errors.push('Primary position is required.');
  }

  if (!valuePresent(data.skill_level)) {
    errors.push('Skill level is required.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateWaiverStep(
  data: RegistrationDraftData
): StepValidationResult {
  const errors: string[] = [];
  if (!data.waiver_accepted) {
    errors.push('You must scroll to the bottom and accept the waiver to continue.');
  }
  return { valid: errors.length === 0, errors };
}

export function canSubmitRegistration(
  data: RegistrationDraftData,
  registrationFeeCents: number
): boolean {
  if (registrationFeeCents <= 0) return true;
  return data.payment_status === 'completed';
}
