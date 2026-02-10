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
    mode: options?.mode || 'onBlur',
    reValidateMode: 'onChange',
  });

  return form;
}

/**
 * Hook for managing individual wizard steps
 */
export function useWizardStep(
  form: UseFormReturn<WizardFormData>,
  step: number
) {
  const validateStep = async (): Promise<boolean> => {
    const stepFields = getStepFields(step);

    const results = await Promise.all(
      stepFields.map((field) => form.trigger(field as any))
    );

    return results.every((result) => result);
  };

  return {
    validateStep,
  };
}

/**
 * Returns the field names for a given step
 */
export function getStepFields(step: number): string[] {
  switch (step) {
    case 1:
      return [
        'orgBusinessName',
        'orgBusinessEmail',
        'orgBusinessPhone',
        'orgBusinessAddress',
        'orgBusinessCity',
        'orgBusinessState',
        'orgBusinessZip',
        'orgBusinessCountry',
      ];
    case 2:
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
    case 3:
      return [
        'season_name',
        'season_start_date',
        'season_end_date',
        'registration_type',
        'registration_opens',
        'registration_closes',
        'game_duration_minutes',
        'period_count',
        'scorekeeping_mode',
      ];
    case 4:
      return ['teams'];
    case 5:
      return [
        'isPublic',
        'themePreset',
        'bannerUrl',
        'socialFacebook',
        'socialInstagram',
        'socialTwitter',
        'visiblePages',
        'wantCustomDomain',
        'ownsDomain',
        'customDomainName',
      ];
    case 6:
      return [
        'enableAdvancedStats',
        'enableAiNews',
      ];
    case 7:
      return [
        'enablePaidRegistration',
        'registrationFee',
        'earlyBirdDiscount',
        'lateRegistrationFee',
        'paymentInstructions',
        'stripeAccountId',
        'stripeAccountStatus',
        'skipPaymentSetup',
      ];
    case 8:
      return []; // Review step has no fields
    default:
      return [];
  }
}
