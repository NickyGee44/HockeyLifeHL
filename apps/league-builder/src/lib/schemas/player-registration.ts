/**
 * Player Registration Wizard Schemas
 *
 * Zod validation schemas for the 7-step player registration flow.
 * Follows the same pattern as league-wizard.ts
 */

import { z } from 'zod';

// ==============================================================================
// CONSTANTS
// ==============================================================================

export const REGISTRATION_TYPES = ['team_registration', 'free_agent', 'individual'] as const;
export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export const PLAYER_POSITIONS = ['Forward', 'Defense', 'Goalie'] as const;
export const EMERGENCY_CONTACT_RELATIONSHIPS = ['parent', 'spouse', 'sibling', 'friend', 'other'] as const;

// ==============================================================================
// STEP 1: Registration Type Selection
// ==============================================================================

export const step1Schema = z.object({
  registration_type: z.enum(REGISTRATION_TYPES, {
    error: 'Please select a registration type',
  }),
  team_id: z.string().uuid('Invalid team ID').optional().nullable(),
  league_id: z.string().uuid('Invalid league ID'),
  season_id: z.string().uuid('Invalid season ID'),
}).refine(
  (data) => {
    // If registering to a team, team_id is required
    if (data.registration_type === 'team_registration') {
      return !!data.team_id;
    }
    return true;
  },
  {
    message: 'Please select a team for team registration',
    path: ['team_id'],
  }
);

export type Step1FormData = z.infer<typeof step1Schema>;

// ==============================================================================
// STEP 2: Personal Information
// ==============================================================================

export const step2Schema = z.object({
  // Basic Profile Info
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  phone: z
    .string()
    .optional()
    .or(z.literal('')),

  // Emergency Contact (Required)
  emergency_contact_name: z
    .string()
    .min(2, 'Emergency contact name is required'),
  emergency_contact_phone: z
    .string()
    .min(10, 'Please enter a valid phone number')
    .max(20, 'Phone number is too long'),
  emergency_contact_relationship: z.enum(EMERGENCY_CONTACT_RELATIONSHIPS, {
    error: 'Please select a relationship',
  }),

  // Optional Medical Info
  medical_notes: z
    .string()
    .max(1000, 'Medical notes must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
});

export type Step2FormData = z.infer<typeof step2Schema>;

// ==============================================================================
// STEP 3: Skill Assessment
// ==============================================================================

export const step3Schema = z.object({
  // Skill Level (Required)
  skill_level: z.enum(SKILL_LEVELS, {
    error: 'Please select your skill level',
  }),

  // Positions
  primary_position: z.enum(PLAYER_POSITIONS, {
    error: 'Please select your primary position',
  }),
  secondary_position: z
    .enum(PLAYER_POSITIONS)
    .optional()
    .nullable(),

  // Experience
  years_experience: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Years cannot be negative')
    .max(80, 'Please enter a valid number')
    .optional()
    .nullable(),
  previous_leagues: z
    .string()
    .max(500, 'Previous leagues must be less than 500 characters')
    .optional()
    .or(z.literal('')),

  // Jersey Preference
  preferred_jersey_number: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Jersey number must be 1-99')
    .max(99, 'Jersey number must be 1-99')
    .optional()
    .nullable(),
});

export type Step3FormData = z.infer<typeof step3Schema>;

// ==============================================================================
// STEP 4: Photo Upload
// ==============================================================================

export const step4Schema = z.object({
  photo_url: z
    .string()
    .url('Please upload a valid photo')
    .optional()
    .or(z.literal('')),
});

export type Step4FormData = z.infer<typeof step4Schema>;

// ==============================================================================
// STEP 5: Waiver & Consents
// ==============================================================================

export const step5Schema = z.object({
  // Waiver Agreement
  waiver_agreed: z.literal(true, {
    message: 'You must agree to the waiver to continue',
  }),

  // Signature
  signature_data: z
    .string()
    .min(100, 'Please provide your signature'),
  signature_type: z.enum(['drawn', 'typed']).default('drawn'),
  signed_name: z
    .string()
    .min(2, 'Please enter your full legal name'),

  // Required Consents
  consent_terms: z.literal(true, {
    message: 'You must accept the Terms of Service',
  }),
  consent_privacy: z.literal(true, {
    message: 'You must accept the Privacy Policy',
  }),
  consent_data_processing: z.literal(true, {
    message: 'You must consent to data processing',
  }),

  // Optional Consent
  consent_marketing: z.boolean().optional().default(false),
});

export type Step5FormData = z.infer<typeof step5Schema>;

// ==============================================================================
// STEP 6: Payment (Conditional)
// ==============================================================================

export const step6Schema = z.object({
  // Payment fields are handled by Stripe Elements
  payment_intent_id: z.string().optional(),
  payment_status: z.enum(['not_required', 'pending', 'completed', 'failed']).default('not_required'),
  amount_cents: z.number().int().min(0).optional(),
}).refine(
  (data) => {
    // If payment is completed, a payment_intent_id must be present
    if (data.payment_status === 'completed' && !data.payment_intent_id) {
      return false;
    }
    return true;
  },
  {
    message: 'Payment intent ID is required when payment is completed',
    path: ['payment_intent_id'],
  }
).refine(
  (data) => {
    // If payment is completed, amount_cents must be > 0
    if (data.payment_status === 'completed' && (!data.amount_cents || data.amount_cents <= 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Amount must be greater than 0 for completed payments',
    path: ['amount_cents'],
  }
);

export type Step6FormData = z.infer<typeof step6Schema>;

// ==============================================================================
// STEP 7: Confirmation (No validation needed)
// ==============================================================================

export const step7Schema = z.object({
  confirmed: z.literal(true).optional(),
});

export type Step7FormData = z.infer<typeof step7Schema>;

// ==============================================================================
// COMBINED REGISTRATION SCHEMA
// ==============================================================================

export const registrationSchema = z.object({
  // Step 1: Registration Type
  registration_type: z.enum(REGISTRATION_TYPES),
  team_id: z.string().uuid().optional().nullable(),
  league_id: z.string().uuid(),
  season_id: z.string().uuid(),

  // Step 2: Personal Info
  full_name: z.string().min(2).max(100),
  phone: z.string().optional().or(z.literal('')),
  emergency_contact_name: z.string().min(2),
  emergency_contact_phone: z.string().min(10).max(20),
  emergency_contact_relationship: z.enum(EMERGENCY_CONTACT_RELATIONSHIPS),
  medical_notes: z.string().max(1000).optional().or(z.literal('')),

  // Step 3: Skill Assessment
  skill_level: z.enum(SKILL_LEVELS),
  primary_position: z.enum(PLAYER_POSITIONS),
  secondary_position: z.enum(PLAYER_POSITIONS).optional().nullable(),
  years_experience: z.number().int().min(0).max(80).optional().nullable(),
  previous_leagues: z.string().max(500).optional().or(z.literal('')),
  preferred_jersey_number: z.number().int().min(1).max(99).optional().nullable(),

  // Step 4: Photo
  photo_url: z.string().url().optional().or(z.literal('')),

  // Step 5: Waiver
  waiver_agreed: z.literal(true),
  signature_data: z.string().min(100),
  signature_type: z.enum(['drawn', 'typed']),
  signed_name: z.string().min(2),
  consent_terms: z.literal(true),
  consent_privacy: z.literal(true),
  consent_data_processing: z.literal(true),
  consent_marketing: z.boolean().optional(),

  // Step 6: Payment
  payment_intent_id: z.string().optional(),
  payment_status: z.enum(['not_required', 'pending', 'completed', 'failed']),
  amount_cents: z.number().int().min(0).optional(),
}).refine(
  (data) => {
    if (data.registration_type === 'team_registration') {
      return !!data.team_id;
    }
    return true;
  },
  {
    message: 'Team is required for team registration',
    path: ['team_id'],
  }
).refine(
  (data) => {
    // If payment is completed, payment_intent_id must be present
    if (data.payment_status === 'completed' && !data.payment_intent_id) {
      return false;
    }
    return true;
  },
  {
    message: 'Payment intent ID is required when payment is completed',
    path: ['payment_intent_id'],
  }
).refine(
  (data) => {
    // If payment is completed, amount_cents must be > 0
    if (data.payment_status === 'completed' && (!data.amount_cents || data.amount_cents <= 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Amount must be greater than 0 for completed payments',
    path: ['amount_cents'],
  }
);

export type RegistrationFormData = z.infer<typeof registrationSchema>;

// ==============================================================================
// DRAFT SCHEMA (Partial for saving progress)
// ==============================================================================

export const registrationDraftSchema = z.object({
  // Step tracking
  current_step: z.number().int().min(1).max(7).default(1),

  // All fields are optional for draft
  registration_type: z.enum(REGISTRATION_TYPES).optional(),
  team_id: z.string().uuid().optional().nullable(),
  league_id: z.string().uuid().optional(),
  season_id: z.string().uuid().optional(),

  full_name: z.string().optional(),
  phone: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.enum(EMERGENCY_CONTACT_RELATIONSHIPS).optional(),
  medical_notes: z.string().optional(),

  skill_level: z.enum(SKILL_LEVELS).optional(),
  primary_position: z.enum(PLAYER_POSITIONS).optional(),
  secondary_position: z.enum(PLAYER_POSITIONS).optional().nullable(),
  years_experience: z.number().optional().nullable(),
  previous_leagues: z.string().optional(),
  preferred_jersey_number: z.number().optional().nullable(),

  photo_url: z.string().optional(),

  waiver_agreed: z.boolean().optional(),
  signature_data: z.string().optional(),
  signature_type: z.enum(['drawn', 'typed']).optional(),
  signed_name: z.string().optional(),
  consent_terms: z.boolean().optional(),
  consent_privacy: z.boolean().optional(),
  consent_data_processing: z.boolean().optional(),
  consent_marketing: z.boolean().optional(),

  payment_intent_id: z.string().optional(),
  payment_status: z.enum(['not_required', 'pending', 'completed', 'failed']).optional(),
  amount_cents: z.number().optional(),
});

export type RegistrationDraftData = z.infer<typeof registrationDraftSchema>;

// ==============================================================================
// DEFAULT VALUES
// ==============================================================================

export const defaultRegistrationValues: Partial<RegistrationFormData> = {
  registration_type: undefined,
  team_id: null,
  phone: '',
  medical_notes: '',
  previous_leagues: '',
  years_experience: null,
  preferred_jersey_number: null,
  secondary_position: null,
  photo_url: '',
  signature_type: 'drawn',
  consent_marketing: false,
  payment_status: 'not_required',
  amount_cents: 0,
};

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

/**
 * Validates a single registration step
 */
export function validateRegistrationStep(
  step: number,
  data: Partial<RegistrationFormData>
): { success: boolean; errors?: z.ZodError } {
  try {
    switch (step) {
      case 1:
        step1Schema.parse(data);
        break;
      case 2:
        step2Schema.parse(data);
        break;
      case 3:
        step3Schema.parse(data);
        break;
      case 4:
        step4Schema.parse(data);
        break;
      case 5:
        step5Schema.parse(data);
        break;
      case 6:
        step6Schema.parse(data);
        break;
      case 7:
        // No validation for confirmation step
        break;
      default:
        throw new Error(`Invalid step: ${step}`);
    }
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Get fields to validate for each step
 */
export function getStepFields(step: number): string[] {
  switch (step) {
    case 1:
      return ['registration_type', 'team_id', 'league_id', 'season_id'];
    case 2:
      return [
        'full_name',
        'phone',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relationship',
        'medical_notes',
      ];
    case 3:
      return [
        'skill_level',
        'primary_position',
        'secondary_position',
        'years_experience',
        'previous_leagues',
        'preferred_jersey_number',
      ];
    case 4:
      return ['photo_url'];
    case 5:
      return [
        'waiver_agreed',
        'signature_data',
        'signature_type',
        'signed_name',
        'consent_terms',
        'consent_privacy',
        'consent_data_processing',
        'consent_marketing',
      ];
    case 6:
      return ['payment_intent_id', 'payment_status', 'amount_cents'];
    case 7:
      return []; // Confirmation step has no fields
    default:
      return [];
  }
}

/**
 * Format skill level for display
 */
export function formatSkillLevel(level: typeof SKILL_LEVELS[number]): string {
  const labels: Record<typeof SKILL_LEVELS[number], string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert',
  };
  return labels[level] || level;
}

/**
 * Format registration type for display
 */
export function formatRegistrationType(type: typeof REGISTRATION_TYPES[number]): string {
  const labels: Record<typeof REGISTRATION_TYPES[number], string> = {
    team_registration: 'Team Registration',
    free_agent: 'Free Agent',
    individual: 'Individual',
  };
  return labels[type] || type;
}

/**
 * Format position for display
 */
export function formatPosition(position: typeof PLAYER_POSITIONS[number]): string {
  return position;
}

/**
 * Format relationship for display
 */
export function formatRelationship(
  relationship: typeof EMERGENCY_CONTACT_RELATIONSHIPS[number]
): string {
  const labels: Record<typeof EMERGENCY_CONTACT_RELATIONSHIPS[number], string> = {
    parent: 'Parent/Guardian',
    spouse: 'Spouse/Partner',
    sibling: 'Sibling',
    friend: 'Friend',
    other: 'Other',
  };
  return labels[relationship] || relationship;
}
