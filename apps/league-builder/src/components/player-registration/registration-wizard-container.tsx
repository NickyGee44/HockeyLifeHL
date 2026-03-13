'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormProvider } from 'react-hook-form';
import { toast } from 'sonner';
import { useRegistrationForm } from '@/lib/hooks/use-registration-form';
import {
  saveRegistrationDraft,
  submitPlayerRegistration,
  deleteRegistrationDraft,
} from '@/lib/actions/player-registration';
import type { RegistrationFormData, RegistrationDraftData } from '@/lib/schemas/player-registration';
import type {
  FeeBasis,
  FeeCollectionModel,
  RegistrationPaymentMode,
} from '@/lib/payments/fee-collection-model';
import { getStepFields } from '@/lib/schemas/player-registration';
import { WizardProgressBar } from '../ui/wizard/wizard-progress-bar';
import { RegistrationWizardNavigation } from './registration-wizard-navigation';
import { RegistrationWizardProgress } from './registration-wizard-progress';

const WIZARD_STEPS = [
  { number: 1, title: 'Registration Type', description: 'Choose how to register' },
  { number: 2, title: 'Personal Info', description: 'Your details' },
  { number: 3, title: 'Skill Assessment', description: 'Playing experience' },
  { number: 4, title: 'Photo', description: 'Profile photo' },
  { number: 5, title: 'Waiver', description: 'Sign waiver' },
  { number: 6, title: 'Payment', description: 'Registration fee' },
  { number: 7, title: 'Confirmation', description: 'Review & submit' },
];

const TOTAL_STEPS = 7;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

export interface RegistrationWizardContainerProps {
  leagueId: string;
  leagueSlug: string;
  seasonId: string;
  leagueName: string;
  initialData?: Partial<RegistrationDraftData> | null;
  registrationFee?: number; // In cents, 0 = no payment required
  feeCollectionModel?: FeeCollectionModel;
  feeBasis?: FeeBasis;
  paymentMode?: RegistrationPaymentMode;
  teams?: Array<{ id: string; name: string }>;
  waiverContent?: string;
  waiverVersion?: string;
  waiverContentHash?: string;
  waiverDocumentUrl?: string | null;
  waiverDocumentName?: string | null;
  waiverDocumentMimeType?: string | null;
  children: React.ReactNode;
}

export function RegistrationWizardContainer({
  leagueId,
  leagueSlug,
  seasonId,
  leagueName,
  initialData,
  registrationFee = 0,
  feeCollectionModel = 'individual',
  feeBasis = 'player',
  paymentMode = registrationFee > 0 ? 'required' : 'hidden',
  teams = [],
  waiverContent = '',
  waiverVersion = 'v1',
  waiverContentHash = '',
  waiverDocumentUrl = null,
  waiverDocumentName = null,
  waiverDocumentMimeType = null,
  children,
}: RegistrationWizardContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get current step from URL params (default to 1)
  const currentStepParam = searchParams.get('step');
  const currentStep = currentStepParam ? parseInt(currentStepParam, 10) : 1;

  // Ensure step is within valid range
  const validStep = Math.max(1, Math.min(currentStep, TOTAL_STEPS));

  const requiresPayment = paymentMode === 'required';
  const showsPaymentStep = paymentMode !== 'hidden';

  // Initialize form with default values or loaded draft
  const form = useRegistrationForm({
    defaultValues: {
      league_id: leagueId,
      season_id: seasonId,
      payment_status: requiresPayment ? 'pending' : 'not_required',
      ...(initialData || {}),
    } as any,
  });

  // Auto-save draft (moved before useEffect that uses it)
  const handleAutoSave = async () => {
    // Don't auto-save on final step
    if (validStep === TOTAL_STEPS) return;

    // Don't auto-save if already submitting
    if (isSubmitting) return;

    const formData = form.getValues();

    setIsSaving(true);

    const result = await saveRegistrationDraft(leagueId, seasonId, {
      ...formData,
      current_step: validStep,
    });

    setIsSaving(false);

    if (!result.success) {
      console.error('Auto-save failed:', result.error);
    }
  };

  // Watch form changes for auto-save
  React.useEffect(() => {
    const subscription = form.watch(() => {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (debounced)
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, AUTO_SAVE_DELAY);
    });

    return () => {
      subscription.unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: form.watch sets up a subscription once; form and handleAutoSave are stable refs
  }, []);

  // Navigate to a specific step
  const goToStep = (step: number) => {
    const targetStep = Math.max(1, Math.min(step, TOTAL_STEPS));
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', targetStep.toString());
    router.push(`?${params.toString()}`);
  };

  // Handle next button click
  const handleNext = async () => {
    if (validStep >= TOTAL_STEPS) return;

    // Trigger validation for current step fields
    const isValid = await validateCurrentStep();

    if (!isValid) {
      toast.error('Please fix the errors before continuing');
      return;
    }

    // Save draft before moving to next step
    await handleAutoSave();

    // Skip payment step if this season does not collect individual payments
    let nextStep = validStep + 1;
    if (nextStep === 6 && !showsPaymentStep) {
      nextStep = 7;
    }

    // Move to next step
    goToStep(nextStep);
  };

  // Handle previous button click
  const handlePrevious = () => {
    if (validStep <= 1) return;

    // Skip payment step if this season does not collect individual payments
    let prevStep = validStep - 1;
    if (prevStep === 6 && !showsPaymentStep) {
      prevStep = 5;
    }

    goToStep(prevStep);
  };

  // Validate current step
  const validateCurrentStep = async (): Promise<boolean> => {
    const fieldsToValidate = getStepFields(validStep);

    if (fieldsToValidate.length === 0) return true;

    const results = await Promise.all(
      fieldsToValidate.map((field) => form.trigger(field as any))
    );

    return results.every((result) => result);
  };

  // Handle final form submission
  const handleSubmit = async (data: RegistrationFormData) => {
    // Client-side payment gate: only required payment modes block submit.
    if (requiresPayment && data.payment_status !== 'completed') {
      toast.error('Payment is required to complete registration. Please complete the payment step.');
      return;
    }

    // Ensure fee metadata is consistent
    if (data.payment_status === 'completed') {
      data.amount_cents = registrationFee;
    } else {
      data.payment_status = 'not_required';
      data.amount_cents = 0;
      data.payment_intent_id = undefined;
    }

    setIsSubmitting(true);

    try {
      const result = await submitPlayerRegistration(data);

      if (!result.success) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      toast.success('Registration submitted successfully!');

      // Redirect to confirmation or dashboard (use slug for slug-based route)
      router.push(`/register/${leagueSlug}/success?id=${result.data?.registrationId}`);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  // Handle form validation errors
  const handleSubmitError = (errors: any) => {
    console.error('Form validation errors:', errors);

    // Find the first error message to display
    const errorMessages: string[] = [];

    const extractErrors = (obj: any, prefix = '') => {
      for (const key in obj) {
        if (obj[key]?.message) {
          errorMessages.push(`${prefix}${key}: ${obj[key].message}`);
        } else if (typeof obj[key] === 'object') {
          extractErrors(obj[key], `${prefix}${key}.`);
        }
      }
    };

    extractErrors(errors);

    if (errorMessages.length > 0) {
      toast.error('Please fix the following errors:', {
        description: errorMessages.slice(0, 3).join('\n'),
      });
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  // Handle discard draft
  const handleDiscardDraft = async () => {
    try {
      const result = await deleteRegistrationDraft(leagueId, seasonId);
      if (!result.success) {
        console.error('Failed to delete draft:', result.error);
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }

    // Reset the form
    form.reset();
    toast.success('Registration discarded');
    router.push('/dashboard');
  };

  // Provide context to child steps
  const contextValue = {
    leagueId,
    leagueSlug,
    seasonId,
    leagueName,
    teams,
    requiresPayment,
    feeCollectionModel,
    feeBasis,
    paymentMode,
    showsPaymentStep,
    registrationFee,
    waiverContent,
    waiverVersion,
    waiverContentHash,
    waiverDocumentUrl,
    waiverDocumentName,
    waiverDocumentMimeType,
    currentStep: validStep,
  };

  return (
    <RegistrationContext.Provider value={contextValue}>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Progress bar */}
        <div className="mb-8">
          <WizardProgressBar
            steps={WIZARD_STEPS.filter((step) => {
              // Hide payment step if not required
              if (step.number === 6 && !showsPaymentStep) return false;
              return true;
            })}
            currentStep={validStep}
          />
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
            <RegistrationWizardProgress
              currentStep={validStep}
              totalSteps={showsPaymentStep ? TOTAL_STEPS : TOTAL_STEPS - 1}
              isSaving={isSaving}
              leagueName={leagueName}
            />
        </div>

        {/* Form */}
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit, handleSubmitError)}>
            {/* Render active step content */}
            <div className="mb-8">{children}</div>

            {/* Navigation buttons */}
            <RegistrationWizardNavigation
              currentStep={validStep}
              totalSteps={showsPaymentStep ? TOTAL_STEPS : TOTAL_STEPS - 1}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onDiscard={handleDiscardDraft}
              isSubmitting={isSubmitting}
              isFirstStep={validStep === 1}
              isLastStep={validStep === TOTAL_STEPS}
            />
          </form>
        </FormProvider>
      </div>
    </RegistrationContext.Provider>
  );
}

// Context for passing data to steps
export interface RegistrationContextValue {
  leagueId: string;
  leagueSlug: string;
  seasonId: string;
  leagueName: string;
  teams: Array<{ id: string; name: string }>;
  requiresPayment: boolean;
  feeCollectionModel: FeeCollectionModel;
  feeBasis: FeeBasis;
  paymentMode: RegistrationPaymentMode;
  showsPaymentStep: boolean;
  registrationFee: number;
  waiverContent: string;
  waiverVersion: string;
  waiverContentHash: string;
  waiverDocumentUrl: string | null;
  waiverDocumentName: string | null;
  waiverDocumentMimeType: string | null;
  currentStep: number;
}

export const RegistrationContext = React.createContext<RegistrationContextValue | null>(null);

export function useRegistrationContext() {
  const context = React.useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistrationContext must be used within RegistrationWizardContainer');
  }
  return context;
}
