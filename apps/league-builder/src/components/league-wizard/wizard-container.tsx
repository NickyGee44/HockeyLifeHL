'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { FormProvider } from 'react-hook-form';
import { toast } from 'sonner';
import { useWizardForm } from '@/lib/hooks/use-wizard-form';
import { saveDraft, createLeague, deleteDraft } from '@/lib/actions/league-wizard';
import type { WizardFormData } from '@/lib/schemas/league-wizard';
import { WizardProgressBar } from '../ui/wizard/wizard-progress-bar';
import { WizardNavigation } from './wizard-navigation';
import { WizardProgress } from './wizard-progress';
import { WizardSuccess } from './wizard-success';

const WIZARD_STEPS = [
  { number: 1, title: 'League Info', description: 'Basic information' },
  { number: 2, title: 'Season Settings', description: 'Configure season' },
  { number: 3, title: 'Teams', description: 'Add teams (optional)' },
  { number: 4, title: 'Registration Fees', description: 'Configure fees' },
  { number: 5, title: 'Payment Setup', description: 'Connect Stripe' },
  { number: 6, title: 'Website & Branding', description: 'Public site settings' },
  { number: 7, title: 'Review', description: 'Review & create' },
];

const TOTAL_STEPS = 7;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

export interface WizardContainerProps {
  initialData?: Partial<WizardFormData> | null;
  children: React.ReactNode;
}

export function WizardContainer({
  initialData,
  children,
}: WizardContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [currentDraftId, setCurrentDraftId] = React.useState<string | null>(null);
  const [isComplete, setIsComplete] = React.useState(false);
  const [createdLeague, setCreatedLeague] = React.useState<{
    leagueId: string;
    slug: string;
    seasonId: string;
  } | null>(null);
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get current step from URL params (default to 1)
  const currentStepParam = searchParams.get('step');
  const currentStep = currentStepParam ? parseInt(currentStepParam, 10) : 1;

  // Ensure step is within valid range
  const validStep = Math.max(1, Math.min(currentStep, TOTAL_STEPS));

  // Initialize form with default values or loaded draft
  const form = useWizardForm({
    defaultValues: initialData || undefined,
  });

  // Auto-save draft - moved before useEffect that uses it
  const handleAutoSave = async () => {
    // Don't auto-save on review step (final step)
    if (validStep === TOTAL_STEPS) return;

    // Don't auto-save if already submitting
    if (isSubmitting) return;

    const formData = form.getValues();

    // Only save if there's meaningful data
    if (!formData.name || formData.name.length < 3) return;

    setIsSaving(true);

    const result = await saveDraft(formData);

    setIsSaving(false);

    if (!result.success) {
      console.error('Auto-save failed:', result.error);
      // Don't show error toast for auto-save failures (non-intrusive)
    } else if (result.data?.draftId) {
      // Track the current draft ID so we can delete only this draft on completion
      setCurrentDraftId(result.data.draftId);
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
  }, []);

  // Navigate to a specific step
  const goToStep = (step: number) => {
    const targetStep = Math.max(1, Math.min(step, TOTAL_STEPS));
    router.push(`?step=${targetStep}`);
  };

  // Validate current step - moved before handleNext that uses it
  const validateCurrentStep = async (): Promise<boolean> => {
    const fieldsToValidate = getStepFields(validStep);

    if (fieldsToValidate.length === 0) return true;

    const results = await Promise.all(
      fieldsToValidate.map((field) => form.trigger(field as any))
    );

    return results.every((result) => result);
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

    // Move to next step
    goToStep(validStep + 1);
  };

  // Handle previous button click
  const handlePrevious = () => {
    if (validStep <= 1) return;
    goToStep(validStep - 1);
  };

  // Handle final form submission
  const handleSubmit = async (data: WizardFormData) => {
    console.log('Submitting wizard form:', data);

    setIsSubmitting(true);

    try {
      // Pass the current draft ID so only this specific draft is deleted
      const result = await createLeague(data, currentDraftId ?? undefined);

      if (!result.success) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      // Set the created league data and show success screen
      setCreatedLeague({
        leagueId: result.data.leagueId,
        slug: result.data.slug,
        seasonId: result.data.seasonId,
      });
      setIsComplete(true);
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
      // Delete the draft from the database
      const result = await deleteDraft();
      if (!result.success) {
        console.error('Failed to delete draft:', result.error);
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }

    // Reset the form
    form.reset();
    toast.success('Draft discarded');
    router.push('/dashboard');
  };

  // Show success screen after league creation
  if (isComplete && createdLeague) {
    const formData = form.getValues();
    const needsPaymentSetup =
      formData.enablePaidRegistration &&
      !!formData.registrationFee &&
      formData.stripeAccountStatus !== 'active';
    return (
      <WizardSuccess
        leagueId={createdLeague.leagueId}
        leagueSlug={createdLeague.slug}
        leagueName={formData.name}
        seasonName={formData.season_name}
        seasonStartDate={formData.season_start_date}
        seasonEndDate={formData.season_end_date}
        location={`${formData.city}, ${formData.state_province}`}
        teamCount={formData.teams?.length || 0}
        needsPaymentSetup={needsPaymentSetup}
      />
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Progress bar */}
      <div className="mb-8">
        <WizardProgressBar steps={WIZARD_STEPS} currentStep={validStep} />
      </div>

      {/* Progress indicator */}
      <div className="mb-6">
        <WizardProgress
          currentStep={validStep}
          totalSteps={TOTAL_STEPS}
          isSaving={isSaving}
        />
      </div>

      {/* Form */}
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit, handleSubmitError)}>
          {/* Render active step content */}
          <div className="mb-8">{children}</div>

          {/* Navigation buttons */}
          <WizardNavigation
            currentStep={validStep}
            totalSteps={TOTAL_STEPS}
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
  );
}

// Helper function to get fields for each step
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
      return [
        'enablePaidRegistration',
        'registrationFee',
        'earlyBirdDiscount',
        'lateRegistrationFee',
        'paymentInstructions',
      ];
    case 5:
      return [
        'stripeAccountId',
        'stripeAccountStatus',
        'skipPaymentSetup',
      ];
    case 6:
      return [
        'isPublic',
        'themePreset',
        'bannerUrl',
        'socialFacebook',
        'socialInstagram',
        'socialTwitter',
      ];
    case 7:
      return []; // Review step has no fields
    default:
      return [];
  }
}
