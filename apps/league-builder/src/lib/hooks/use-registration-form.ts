import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registrationSchema,
  defaultRegistrationValues,
  getStepFields,
  type RegistrationFormData,
} from '../schemas/player-registration';

export interface UseRegistrationFormOptions {
  defaultValues?: Partial<RegistrationFormData>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
}

export type UseRegistrationFormReturn = UseFormReturn<RegistrationFormData>;

/**
 * Custom hook for managing the player registration wizard form
 *
 * Features:
 * - Type-safe form with Zod validation
 * - Default values pre-populated
 * - Integration with React Hook Form
 * - Uncontrolled mode for performance
 *
 * @param options - Configuration options for the form
 * @returns React Hook Form instance with registration-specific configuration
 *
 * @example
 * ```tsx
 * const form = useRegistrationForm({
 *   defaultValues: draftData, // Load draft data if resuming
 * });
 *
 * // Use in component
 * <form onSubmit={form.handleSubmit(onSubmit)}>
 *   <input {...form.register('full_name')} />
 * </form>
 * ```
 */
export function useRegistrationForm(
  options?: UseRegistrationFormOptions
): UseRegistrationFormReturn {
  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema) as any,
    defaultValues: {
      ...defaultRegistrationValues,
      ...options?.defaultValues,
    },
    mode: options?.mode || 'onBlur', // Validate on blur for better UX
    reValidateMode: 'onChange', // Re-validate on change after first validation
  });

  return form;
}

/**
 * Hook for managing individual registration wizard steps
 * Provides step-specific validation without validating the entire form
 *
 * @param form - React Hook Form instance from useRegistrationForm
 * @param step - Current step number (1-7)
 * @returns Step-specific form methods
 *
 * @example
 * ```tsx
 * const form = useRegistrationForm();
 * const stepMethods = useRegistrationStep(form, 1);
 *
 * // Validate only the current step
 * const isValid = await stepMethods.validateStep();
 * ```
 */
export function useRegistrationStep(
  form: UseFormReturn<RegistrationFormData>,
  step: number
) {
  const validateStep = async (): Promise<boolean> => {
    // Get step-specific field names
    const stepFields = getStepFields(step);

    if (stepFields.length === 0) return true;

    // Trigger validation only for fields in this step
    const results = await Promise.all(
      stepFields.map((field) => form.trigger(field as any))
    );

    // Return true if all fields are valid
    return results.every((result) => result);
  };

  const getStepErrors = () => {
    const stepFields = getStepFields(step);
    const errors: Record<string, any> = {};

    stepFields.forEach((field) => {
      const error = form.formState.errors[field as keyof RegistrationFormData];
      if (error) {
        errors[field] = error;
      }
    });

    return errors;
  };

  return {
    validateStep,
    getStepErrors,
  };
}
