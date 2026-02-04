import { z } from 'zod';

// ==============================================================================
// STEP 1: League Information
// ==============================================================================

export const step1Schema = z.object({
  // Basic Information
  name: z
    .string()
    .min(3, 'League name must be at least 3 characters')
    .max(100, 'League name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),

  // Location
  city: z
    .string()
    .min(2, 'City is required')
    .max(100, 'City must be less than 100 characters'),
  state_province: z
    .string()
    .min(2, 'State/Province is required')
    .max(100, 'State/Province must be less than 100 characters'),
  country: z.string().default('USA'),
  timezone: z.string().default('America/New_York'),

  // Branding
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #1E40AF)')
    .default('#1E40AF'),
  secondary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #3B82F6)')
    .default('#3B82F6'),
  logo_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),

  // Contact Information (optional)
  contact_email: z
    .string()
    .email('Must be a valid email address')
    .optional()
    .or(z.literal('')),
  contact_phone: z
    .string()
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  website_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export type Step1FormData = z.infer<typeof step1Schema>;

// ==============================================================================
// STEP 2: Season Settings
// ==============================================================================

export const step2Schema = z
  .object({
    // Season Information
    season_name: z
      .string()
      .min(3, 'Season name must be at least 3 characters')
      .max(100, 'Season name must be less than 100 characters'),
    season_start_date: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), 'Must be a valid date'),
    season_end_date: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), 'Must be a valid date'),

    // Registration Settings
    registration_type: z.enum(['open', 'approval_required', 'invite_only'], {
      message: 'Please select a registration type',
    }),
    registration_opens: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), 'Must be a valid date')
      .optional()
      .or(z.literal('')),
    registration_closes: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), 'Must be a valid date')
      .optional()
      .or(z.literal('')),

    // Game Settings
    game_duration_minutes: z
      .number()
      .int('Must be a whole number')
      .min(30, 'Game duration must be at least 30 minutes')
      .max(180, 'Game duration must be less than 180 minutes')
      .default(60),
    period_count: z
      .number()
      .int('Must be a whole number')
      .min(1, 'Must have at least 1 period')
      .max(5, 'Must have at most 5 periods')
      .default(3),
  })
  .refine(
    (data) => {
      const start = new Date(data.season_start_date);
      const end = new Date(data.season_end_date);
      return end > start;
    },
    {
      message: 'Season end date must be after start date',
      path: ['season_end_date'],
    }
  )
  .refine(
    (data) => {
      if (!data.registration_opens || !data.registration_closes) return true;
      const opens = new Date(data.registration_opens);
      const closes = new Date(data.registration_closes);
      return closes > opens;
    },
    {
      message: 'Registration close date must be after open date',
      path: ['registration_closes'],
    }
  );

export type Step2FormData = z.infer<typeof step2Schema>;

// ==============================================================================
// STEP 3: Teams (Optional)
// ==============================================================================

export const teamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be less than 100 characters'),
  short_name: z
    .string()
    .max(10, 'Short name must be less than 10 characters')
    .optional()
    .or(z.literal('')),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
    .optional()
    .or(z.literal('')),
});

export const step3Schema = z.object({
  teams: z
    .array(teamSchema)
    .max(20, 'Cannot have more than 20 teams')
    .optional()
    .default([]),
});

export type Step3FormData = z.infer<typeof step3Schema>;
export type TeamFormData = z.infer<typeof teamSchema>;

// ==============================================================================
// STEP 4: Registration Fees
// ==============================================================================

export const earlyBirdDiscountSchema = z.object({
  enabled: z.boolean().default(false),
  amount: z.number().int().min(0).default(0), // Amount in cents (or percentage if isPercentage is true)
  isPercentage: z.boolean().default(false), // If true, amount is a percentage (0-100)
  deadline: z
    .string()
    .optional()
    .or(z.literal('')),
});

export const lateRegistrationFeeSchema = z.object({
  enabled: z.boolean().default(false),
  amount: z.number().int().min(0).default(0), // Amount in cents
  startsAt: z
    .string()
    .optional()
    .or(z.literal('')),
});

export const step4Schema = z.object({
  // Main toggle for paid registration
  enablePaidRegistration: z.boolean().default(false),

  // Base registration fee (in cents)
  registrationFee: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Fee cannot be negative')
    .default(0),

  // Early bird discount (nested object)
  earlyBirdDiscount: earlyBirdDiscountSchema.default({
    enabled: false,
    amount: 0,
    isPercentage: false,
    deadline: '',
  }),

  // Late registration fee (nested object)
  lateRegistrationFee: lateRegistrationFeeSchema.default({
    enabled: false,
    amount: 0,
    startsAt: '',
  }),

  // Optional payment instructions
  paymentInstructions: z
    .string()
    .max(1000, 'Payment instructions must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
});

export type Step4FormData = z.infer<typeof step4Schema>;
export type EarlyBirdDiscount = z.infer<typeof earlyBirdDiscountSchema>;
export type LateRegistrationFee = z.infer<typeof lateRegistrationFeeSchema>;

// ==============================================================================
// STEP 5: Payment Setup
// ==============================================================================

export const step5Schema = z.object({
  stripeAccountId: z.string().nullable().default(null),
  stripeAccountStatus: z.enum(['not_connected', 'pending', 'active']).default('not_connected'),
  skipPaymentSetup: z.boolean().default(false),
});

export type Step5FormData = z.infer<typeof step5Schema>;

// ==============================================================================
// STEP 6: Website & Branding
// ==============================================================================

export const step6Schema = z.object({
  isPublic: z.boolean().default(true),
  themePreset: z.enum(['dark', 'light', 'custom']).default('dark'),
  bannerUrl: z.string().url().optional().or(z.literal('')),
  socialFacebook: z.string().url().optional().or(z.literal('')),
  socialInstagram: z.string().url().optional().or(z.literal('')),
  socialTwitter: z.string().url().optional().or(z.literal('')),
});

export type Step6FormData = z.infer<typeof step6Schema>;

// ==============================================================================
// COMBINED WIZARD SCHEMA
// ==============================================================================

// Base step2 schema without refinements (for spreading)
const step2BaseSchema = z.object({
  // Season Information
  season_name: z
    .string()
    .min(3, 'Season name must be at least 3 characters')
    .max(100, 'Season name must be less than 100 characters'),
  season_start_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Must be a valid date'),
  season_end_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Must be a valid date'),

  // Registration Settings
  registration_type: z.enum(['open', 'approval_required', 'invite_only'], {
    message: 'Please select a registration type',
  }),
  registration_opens: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Must be a valid date')
    .optional()
    .or(z.literal('')),
  registration_closes: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), 'Must be a valid date')
    .optional()
    .or(z.literal('')),

  // Game Settings
  game_duration_minutes: z
    .number()
    .int('Must be a whole number')
    .min(30, 'Game duration must be at least 30 minutes')
    .max(180, 'Game duration must be less than 180 minutes')
    .default(60),
  period_count: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Must have at least 1 period')
    .max(5, 'Must have at most 5 periods')
    .default(3),
});

export const wizardSchema = z
  .object({
    // Step 1 fields
    ...step1Schema.shape,
    // Step 2 fields (base schema to avoid losing refinements)
    ...step2BaseSchema.shape,
    // Step 3 fields
    ...step3Schema.shape,
    // Step 4 fields (Registration Fees)
    ...step4Schema.shape,
    // Step 5 fields (Payment Setup)
    ...step5Schema.shape,
    // Step 6 fields (Website & Branding)
    ...step6Schema.shape,
  })
  .refine(
    (data) => {
      const start = new Date(data.season_start_date);
      const end = new Date(data.season_end_date);
      return end > start;
    },
    {
      message: 'Season end date must be after start date',
      path: ['season_end_date'],
    }
  )
  .refine(
    (data) => {
      if (!data.registration_opens || !data.registration_closes) return true;
      const opens = new Date(data.registration_opens);
      const closes = new Date(data.registration_closes);
      return closes > opens;
    },
    {
      message: 'Registration close date must be after open date',
      path: ['registration_closes'],
    }
  )
  .refine(
    (data) => {
      // Validate unique team names if teams are provided
      if (!data.teams || data.teams.length === 0) return true;
      const names = data.teams.map((t) => t.name.toLowerCase());
      const uniqueNames = new Set(names);
      return names.length === uniqueNames.size;
    },
    {
      message: 'Team names must be unique',
      path: ['teams'],
    }
  );

export type WizardFormData = z.infer<typeof wizardSchema>;

// ==============================================================================
// DEFAULT VALUES
// ==============================================================================

export const defaultValues: Partial<WizardFormData> = {
  // Step 1 defaults
  country: 'USA',
  timezone: 'America/New_York',
  primary_color: '#1E40AF',
  secondary_color: '#3B82F6',

  // Step 2 defaults
  registration_type: 'approval_required',
  game_duration_minutes: 60,
  period_count: 3,

  // Step 3 defaults
  teams: [],

  // Step 4 defaults (Registration Fees)
  enablePaidRegistration: false,
  registrationFee: 0,
  earlyBirdDiscount: {
    enabled: false,
    amount: 0,
    isPercentage: false,
    deadline: '',
  },
  lateRegistrationFee: {
    enabled: false,
    amount: 0,
    startsAt: '',
  },
  paymentInstructions: '',

  // Step 5 defaults (Payment Setup)
  stripeAccountId: null,
  stripeAccountStatus: 'not_connected',
  skipPaymentSetup: false,

  // Step 6 defaults (Website & Branding)
  isPublic: true,
  themePreset: 'dark',
};

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

/**
 * Validates a single wizard step
 */
export function validateStep(
  step: number,
  data: Partial<WizardFormData>
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
        // Review step - validates entire form
        wizardSchema.parse(data);
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
 * Generates a URL-safe slug from league name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Formats a date string for input[type="date"] or input[type="datetime-local"]
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
}

/**
 * Parses a date from input[type="date"] or input[type="datetime-local"]
 */
export function parseDateFromInput(dateString: string): Date {
  return new Date(dateString);
}
