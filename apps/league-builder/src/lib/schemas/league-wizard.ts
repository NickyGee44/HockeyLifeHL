import { z } from 'zod';

// ==============================================================================
// STEP 1: Organization Info (NEW)
// ==============================================================================

export const step1Schema = z.object({
  orgBusinessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(200, 'Business name must be less than 200 characters'),
  orgBusinessEmail: z
    .string()
    .email('Must be a valid email address')
    .optional()
    .or(z.literal('')),
  orgBusinessPhone: z
    .string()
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  orgBusinessAddress: z
    .string()
    .max(200)
    .optional()
    .or(z.literal('')),
  orgBusinessCity: z
    .string()
    .max(100)
    .optional()
    .or(z.literal('')),
  orgBusinessState: z
    .string()
    .max(100)
    .optional()
    .or(z.literal('')),
  orgBusinessZip: z
    .string()
    .max(20)
    .optional()
    .or(z.literal('')),
  orgBusinessCountry: z.string().default('CA'),
});

export type Step1FormData = z.infer<typeof step1Schema>;

// ==============================================================================
// STEP 2: League Information (was Step 1)
// ==============================================================================

export const step2Schema = z.object({
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
  country: z.string().default('CA'),
  timezone: z.string().default('America/Toronto'),

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

export type Step2FormData = z.infer<typeof step2Schema>;

// ==============================================================================
// STEP 3: Season & Scorekeeping (was Step 2, now includes scorekeeping mode)
// ==============================================================================

export const step3Schema = z
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
    registration_type: z.enum(['open', 'approval_required', 'invite_only', 'draft'], {
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

    // Scorekeeping Mode (NEW)
    scorekeeping_mode: z.enum(['standard', 'self_scorekeeping']).default('self_scorekeeping'),

    // Playoff Eligibility
    playoff_eligibility_enabled: z.boolean().default(false),
    playoff_eligibility_min_games_pct: z
      .number()
      .min(0, 'Must be at least 0%')
      .max(100, 'Must be at most 100%')
      .default(60),
    playoff_eligibility_min_games: z
      .number()
      .int('Must be a whole number')
      .min(0, 'Must be at least 0')
      .nullable()
      .default(null),
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

export type Step3FormData = z.infer<typeof step3Schema>;

// ==============================================================================
// STEP 4: Teams (Optional) - was Step 3
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

export const step4Schema = z.object({
  teams: z
    .array(teamSchema)
    .max(20, 'Cannot have more than 20 teams')
    .optional()
    .default([]),
});

export type Step4FormData = z.infer<typeof step4Schema>;
export type TeamFormData = z.infer<typeof teamSchema>;

// ==============================================================================
// STEP 5: Website & Pages (was Step 6, now includes page toggles + domain)
// ==============================================================================

export const step5Schema = z.object({
  isPublic: z.boolean().default(true),
  themePreset: z.enum(['dark', 'light', 'custom']).default('dark'),
  bannerUrl: z.string().url().optional().or(z.literal('')),
  socialFacebook: z.string().url().optional().or(z.literal('')),
  socialInstagram: z.string().url().optional().or(z.literal('')),
  socialTwitter: z.string().url().optional().or(z.literal('')),

  // Page Visibility (NEW)
  visiblePages: z.record(z.string(), z.boolean()).default({
    schedule: true,
    standings: true,
    teams: true,
    stats: true,
    news: false,
    history: false,
    gallery: false,
    about: true,
  }),

  // Custom Domain (NEW)
  wantCustomDomain: z.boolean().default(false),
  ownsDomain: z.boolean().optional(),
  customDomainName: z
    .string()
    .max(253)
    .optional()
    .or(z.literal('')),
});

export type Step5FormData = z.infer<typeof step5Schema>;

// ==============================================================================
// STEP 6: Features & Add-ons (NEW)
// ==============================================================================

export const step6Schema = z.object({
  enableAdvancedStats: z.boolean().default(false),
  enableAiNews: z.boolean().default(false),
});

export type Step6FormData = z.infer<typeof step6Schema>;

// ==============================================================================
// STEP 7: Registration & Payments (merged old Steps 4+5)
// ==============================================================================

export const earlyBirdDiscountSchema = z.object({
  enabled: z.boolean().default(false),
  amount: z.number().int().min(0).default(0),
  isPercentage: z.boolean().default(false),
  deadline: z
    .string()
    .optional()
    .or(z.literal('')),
});

export const lateRegistrationFeeSchema = z.object({
  enabled: z.boolean().default(false),
  amount: z.number().int().min(0).default(0),
  startsAt: z
    .string()
    .optional()
    .or(z.literal('')),
});

export const step7Schema = z.object({
  // Registration Fees
  enablePaidRegistration: z.boolean().default(false),
  registrationFee: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Fee cannot be negative')
    .default(0),
  earlyBirdDiscount: earlyBirdDiscountSchema.default({
    enabled: false,
    amount: 0,
    isPercentage: false,
    deadline: '',
  }),
  lateRegistrationFee: lateRegistrationFeeSchema.default({
    enabled: false,
    amount: 0,
    startsAt: '',
  }),
  paymentInstructions: z
    .string()
    .max(1000, 'Payment instructions must be less than 1000 characters')
    .optional()
    .or(z.literal('')),

  // Payment Setup (Stripe Connect)
  stripeAccountId: z.string().nullable().default(null),
  stripeAccountStatus: z.enum(['not_connected', 'pending', 'active']).default('not_connected'),
  skipPaymentSetup: z.boolean().default(false),
});

export type Step7FormData = z.infer<typeof step7Schema>;
export type EarlyBirdDiscount = z.infer<typeof earlyBirdDiscountSchema>;
export type LateRegistrationFee = z.infer<typeof lateRegistrationFeeSchema>;

// ==============================================================================
// COMBINED WIZARD SCHEMA
// ==============================================================================

// Base step3 schema without refinements (for spreading)
const step3BaseSchema = z.object({
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
  registration_type: z.enum(['open', 'approval_required', 'invite_only', 'draft'], {
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
  scorekeeping_mode: z.enum(['standard', 'self_scorekeeping']).default('self_scorekeeping'),
  playoff_eligibility_enabled: z.boolean().default(false),
  playoff_eligibility_min_games_pct: z
    .number()
    .min(0, 'Must be at least 0%')
    .max(100, 'Must be at most 100%')
    .default(60),
  playoff_eligibility_min_games: z
    .number()
    .int('Must be a whole number')
    .min(0, 'Must be at least 0')
    .nullable()
    .default(null),
});

export const wizardSchema = z
  .object({
    // Step 1: Organization Info
    ...step1Schema.shape,
    // Step 2: League Info
    ...step2Schema.shape,
    // Step 3: Season & Scorekeeping (base schema to avoid losing refinements)
    ...step3BaseSchema.shape,
    // Step 4: Teams
    ...step4Schema.shape,
    // Step 5: Website & Pages
    ...step5Schema.shape,
    // Step 6: Features & Add-ons
    ...step6Schema.shape,
    // Step 7: Registration & Payments
    ...step7Schema.shape,
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
      if (!data.teams || data.teams.length === 0) return true;
      const names = data.teams.map((t) => t.name.toLowerCase());
      const uniqueNames = new Set(names);
      return names.length === uniqueNames.size;
    },
    {
      message: 'Team names must be unique',
      path: ['teams'],
    }
  )
  .refine(
    (data) => {
      if (data.registration_type !== 'draft') return true;
      return data.teams && data.teams.length >= 2;
    },
    {
      message: 'Draft leagues require at least 2 teams',
      path: ['teams'],
    }
  );

export type WizardFormData = z.infer<typeof wizardSchema>;

// ==============================================================================
// DEFAULT VALUES
// ==============================================================================

export const defaultValues: Partial<WizardFormData> = {
  // Step 1: Organization Info
  orgBusinessCountry: 'CA',

  // Step 2: League Info
  country: 'CA',
  timezone: 'America/Toronto',
  primary_color: '#1E40AF',
  secondary_color: '#3B82F6',

  // Step 3: Season & Scorekeeping
  registration_type: 'approval_required',
  game_duration_minutes: 60,
  period_count: 3,
  scorekeeping_mode: 'self_scorekeeping',
  playoff_eligibility_enabled: false,
  playoff_eligibility_min_games_pct: 60,
  playoff_eligibility_min_games: null,

  // Step 4: Teams
  teams: [],

  // Step 5: Website & Pages
  isPublic: true,
  themePreset: 'dark',
  visiblePages: {
    schedule: true,
    standings: true,
    teams: true,
    stats: true,
    news: false,
    history: false,
    gallery: false,
    about: true,
  },
  wantCustomDomain: false,

  // Step 6: Features & Add-ons
  enableAdvancedStats: false,
  enableAiNews: false,

  // Step 7: Registration & Payments
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
  stripeAccountId: null,
  stripeAccountStatus: 'not_connected',
  skipPaymentSetup: false,
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
        step7Schema.parse(data);
        break;
      case 8:
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
