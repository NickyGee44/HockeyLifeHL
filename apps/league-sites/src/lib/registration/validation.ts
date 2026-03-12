import type { RegistrationDraftData, LeagueFormConfig } from '@/lib/actions/registration';
import type { RegistrationPaymentMode } from '@/lib/registration/fee-collection-model';

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

  if (data.registration_intent === 'return_to_previous_team') {
    if (!valuePresent(data.previous_team_id || '')) {
      errors.push('Please choose the team you are returning to.');
    }
  } else if (data.registration_intent === 'join_team') {
    if (!valuePresent(data.requested_team_id || data.team_id || '')) {
      errors.push('Please choose the team you want to join.');
    }
  } else if (data.registration_intent === 'captain_application') {
    if (!valuePresent(data.requested_team_name || '')) {
      errors.push('Please enter the team name or group name for your captain application.');
    }
  } else if (data.registration_type === 'team_registration' && !valuePresent(data.team_id || '')) {
    errors.push('Team selection is required for team registration.');
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
  registrationFeeCents: number,
  paymentMode: RegistrationPaymentMode
): boolean {
  if (registrationFeeCents <= 0) return true;
  if (paymentMode !== 'required') return true;
  return data.payment_status === 'completed';
}
