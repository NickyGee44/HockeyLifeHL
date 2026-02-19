'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { FormProvider } from 'react-hook-form';
import { toast } from 'sonner';
import { useWizardForm } from '@/lib/hooks/use-wizard-form';
import { getStepFields } from '@/lib/hooks/use-wizard-form';
import { saveDraft, createLeague, deleteDraft } from '@/lib/actions/league-wizard';
import type { WizardFormData } from '@/lib/schemas/league-wizard';
import { WizardProgressBar } from '../ui/wizard/wizard-progress-bar';
import { WizardNavigation } from './wizard-navigation';
import { WizardProgress } from './wizard-progress';
import { Step9NextSteps } from './steps/step-9-next-steps';

const WIZARD_STEPS = [
  { number: 1, title: 'Organization', description: 'Company info' },
  { number: 2, title: 'League Info', description: 'Basic information' },
  { number: 3, title: 'Season & Scoring', description: 'Season & scorekeeping' },
  { number: 4, title: 'Teams', description: 'Add teams (optional)' },
  { number: 5, title: 'Website & Pages', description: 'Site settings & pages' },
  { number: 6, title: 'Add-ons', description: 'Premium features' },
  { number: 7, title: 'Registration', description: 'Fees & payments' },
  { number: 8, title: 'Review', description: 'Review & create' },
];

const TOTAL_STEPS = 8;
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

    // Only save if there's meaningful data (need org name or league name)
    if ((!formData.orgBusinessName || formData.orgBusinessName.length < 2) &&
        (!formData.name || formData.name.length < 3)) return;

    setIsSaving(true);

    const result = await saveDraft(formData);

    setIsSaving(false);

    if (!result.success) {
      console.error('Auto-save failed:', result.error);
    } else if (result.data?.draftId) {
      setCurrentDraftId(result.data.draftId);
    }
  };

  // Watch form changes for auto-save
  React.useEffect(() => {
    const subscription = form.watch(() => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

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
    router.push(`?step=${targetStep}`);
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

  // Handle next button click
  const handleNext = async () => {
    if (validStep >= TOTAL_STEPS) return;

    const isValid = await validateCurrentStep();

    if (!isValid) {
      toast.error('Please fix the errors before continuing');
      return;
    }

    await handleAutoSave();

    goToStep(validStep + 1);
  };

  // Handle previous button click
  const handlePrevious = () => {
    if (validStep <= 1) return;
    goToStep(validStep - 1);
  };

  // Handle final form submission
  const handleSubmit = async (data: WizardFormData) => {
    setIsSubmitting(true);

    try {
      const result = await createLeague(data, currentDraftId ?? undefined);

      if (!result.success) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
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
      const result = await deleteDraft();
      if (!result.success) {
        console.error('Failed to delete draft:', result.error);
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }

    form.reset();
    toast.success('Draft discarded');
    router.push('/dashboard');
  };

  // Show post-creation next-steps screen after league creation
  if (isComplete && createdLeague) {
    const formData = form.getValues();
    const needsPaymentSetup =
      formData.enablePaidRegistration &&
      !!formData.registrationFee &&
      formData.stripeAccountStatus !== 'active';
    const addonsSelected = formData.enableAdvancedStats || formData.enableAiNews;
    const domainRequested = formData.wantCustomDomain && !!formData.customDomainName;
    const isDraftLeague = formData.registration_type === 'draft';
    return (
      <Step9NextSteps
        leagueId={createdLeague.leagueId}
        leagueSlug={createdLeague.slug}
        leagueName={formData.name}
        seasonName={formData.season_name}
        location={`${formData.city}, ${formData.state_province}`}
        teamCount={formData.teams?.length || 0}
        needsPaymentSetup={needsPaymentSetup}
        addonsSelected={addonsSelected}
        domainRequested={domainRequested}
        isDraftLeague={isDraftLeague}
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
