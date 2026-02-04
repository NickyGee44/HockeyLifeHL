import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  wizardSchema,
  defaultValues,
  type WizardFormData,
} from '../schemas/league-wizard';

export interface UseWizardFormOptions {
  defaultValues?: Partial<WizardFormData>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
}

export interface UseWizardFormReturn extends UseFormReturn<WizardFormData> {
  // Add any custom methods here if needed
}

/**
 * Custom hook for managing the league creation wizard form
 *
 * Features:
 * - Type-safe form with Zod validation
 * - Default values pre-populated
 * - Integration with React Hook Form
 * - Uncontrolled mode for performance
 *
 * @param options - Configuration options for the form
 * @returns React Hook Form instance with wizard-specific configuration
 *
 * @example
 * ```tsx
 * const form = useWizardForm({
 *   defaultValues: draftData, // Load draft data if resuming
 * });
 *
 * // Use in component
 * <form onSubmit={form.handleSubmit(onSubmit)}>
 *   <input {...form.register('name')} />
 * </form>
 * ```
 */
export function useWizardForm(
  options?: UseWizardFormOptions
): UseWizardFormReturn {
  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema) as any,
    defaultValues: {
      ...defaultValues,
      ...options?.defaultValues,
    },
    mode: options?.mode || 'onBlur', // Validate on blur for better UX
    reValidateMode: 'onChange', // Re-validate on change after first validation
  });

  return form;
}

/**
 * Hook for managing individual wizard steps
 * Provides step-specific validation without validating the entire form
 *
 * @param form - React Hook Form instance from useWizardForm
 * @param step - Current step number (1-4)
 * @returns Step-specific form methods
 *
 * @example
 * ```tsx
 * const form = useWizardForm();
 * const stepMethods = useWizardStep(form, 1);
 *
 * // Validate only the current step
 * const isValid = await stepMethods.validateStep();
 * ```
 */
export function useWizardStep(
  form: UseFormReturn<WizardFormData>,
  step: number
) {
  const validateStep = async (): Promise<boolean> => {
    // Get step-specific field names
    const stepFields = getStepFields(step);

    // Trigger validation only for fields in this step
    const results = await Promise.all(
      stepFields.map((field) => form.trigger(field as any))
    );

    // Return true if all fields are valid
    return results.every((result) => result);
  };

  return {
    validateStep,
  };
}

/**
 * Returns the field names for a given step
 */
function getStepFields(step: number): string[] {
  switch (step) {
    case 1:
      return [
        'name',
        'description',
        'city',
        'state_province',
        'country',
        'timezone',
        'primary_color',
        'secondary_color',
        'logo_url',
        'contact_email',
        'contact_phone',
        'website_url',
      ];
    case 2:
      return [
        'season_name',
        'season_start_date',
        'season_end_date',
        'registration_type',
        'registration_opens',
        'registration_closes',
        'game_duration_minutes',
        'period_count',
      ];
    case 3:
      return ['teams'];
    case 4:
      return []; // Review step has no fields, just displays data
    default:
      return [];
  }
}
