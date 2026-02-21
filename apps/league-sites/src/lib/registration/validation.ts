import type { RegistrationDraftData } from '@/lib/actions/registration';

export interface StepValidationResult {
  valid: boolean;
  errors: string[];
}

function valuePresent(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validatePersonalInfoStep(
  data: RegistrationDraftData
): StepValidationResult {
  const errors: string[] = [];

  if (!valuePresent(data.full_name)) {
    errors.push('Full name is required.');
  }

  if (data.registration_type === 'team_registration' && !valuePresent(data.team_id || '')) {
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
  if (!valuePresent(data.signed_name)) {
    errors.push('Typed signature is required.');
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

