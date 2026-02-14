'use client';

import { useState, useCallback } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useUser } from '@/hooks/useUser';
import {
  saveRegistrationDraft,
  submitPlayerRegistration,
  type RegistrationDraftData,
} from '@/lib/actions/registration';
import { StepPersonalInfo } from './StepPersonalInfo';
import { StepSkillPosition } from './StepSkillPosition';
import { StepWaiver } from './StepWaiver';
import { StepPayment } from './StepPayment';
import { StepConfirmation } from './StepConfirmation';

// ============================================================================
// Types
// ============================================================================

interface RegistrationWizardProps {
  leagueId: string;
  leagueSlug: string;
  seasonId: string;
  leagueName: string;
  seasonName: string;
  teams: { id: string; name: string }[];
  registrationFee: number; // cents
  waiverContent: string;
  waiverVersion: string;
  waiverContentHash: string;
  initialData: RegistrationDraftData | null;
}

const STEPS = [
  { id: 1, label: 'Personal Info' },
  { id: 2, label: 'Skill & Position' },
  { id: 3, label: 'Waiver' },
  { id: 4, label: 'Payment' },
  { id: 5, label: 'Confirm' },
];

// ============================================================================
// Component
// ============================================================================

export function RegistrationWizard({
  leagueId,
  leagueSlug,
  seasonId,
  leagueName,
  seasonName,
  teams,
  registrationFee,
  waiverContent,
  waiverVersion: _waiverVersion,
  waiverContentHash,
  initialData,
}: RegistrationWizardProps) {
  const { user } = useUser();
  const { openLogin } = useAuth();

  const [currentStep, setCurrentStep] = useState(initialData?.current_step || 1);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Form data state
  const [formData, setFormData] = useState<RegistrationDraftData>({
    current_step: initialData?.current_step || 1,
    registration_type: initialData?.registration_type || 'free_agent',
    team_id: initialData?.team_id || null,
    full_name: initialData?.full_name || user?.user_metadata?.full_name || '',
    email: initialData?.email || user?.email || '',
    phone: initialData?.phone || '',
    emergency_contact_name: initialData?.emergency_contact_name || '',
    emergency_contact_phone: initialData?.emergency_contact_phone || '',
    emergency_contact_relationship: initialData?.emergency_contact_relationship || '',
    medical_notes: initialData?.medical_notes || '',
    primary_position: initialData?.primary_position || '',
    secondary_position: initialData?.secondary_position || '',
    preferred_jersey_number: initialData?.preferred_jersey_number ?? null,
    skill_level: initialData?.skill_level || '',
    years_experience: initialData?.years_experience ?? null,
    previous_leagues: initialData?.previous_leagues || '',
    signature_data: initialData?.signature_data || '',
    signature_type: initialData?.signature_type || 'typed',
    signed_name: initialData?.signed_name || '',
    waiver_content_hash: waiverContentHash,
    payment_status: initialData?.payment_status || (registrationFee > 0 ? 'pending' : 'not_required'),
    payment_intent_id: initialData?.payment_intent_id || '',
    amount_cents: registrationFee,
  });

  // Determine which steps to show (skip payment if free)
  const visibleSteps = registrationFee > 0
    ? STEPS
    : STEPS.filter((s) => s.id !== 4);

  const currentStepIndex = visibleSteps.findIndex((s) => s.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === visibleSteps.length - 1;

  const updateFormData = useCallback(
    (updates: Partial<RegistrationDraftData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Auto-save draft
  const saveDraft = useCallback(
    async (step: number) => {
      if (!user) return;
      setIsSaving(true);
      try {
        await saveRegistrationDraft(leagueId, seasonId, {
          ...formData,
          current_step: step,
        });
      } catch {
        // Silent fail for draft save
      } finally {
        setIsSaving(false);
      }
    },
    [user, leagueId, seasonId, formData]
  );

  const goNext = useCallback(async () => {
    if (isLastStep) return;
    const nextStep = visibleSteps[currentStepIndex + 1].id;
    setCurrentStep(nextStep);
    await saveDraft(nextStep);
  }, [currentStepIndex, isLastStep, visibleSteps, saveDraft]);

  const goBack = useCallback(() => {
    if (isFirstStep) return;
    const prevStep = visibleSteps[currentStepIndex - 1].id;
    setCurrentStep(prevStep);
  }, [currentStepIndex, isFirstStep, visibleSteps]);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      openLogin();
      return;
    }

    // Block submission if payment is required but not completed
    if (registrationFee > 0 && formData.payment_status !== 'completed') {
      setSubmitError('Payment is required before submitting your registration. Please go back to the Payment step to complete your payment.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitPlayerRegistration({
        ...formData,
        league_id: leagueId,
        season_id: seasonId,
      });

      if (!result.success) {
        setSubmitError(result.error);
        return;
      }

      setIsComplete(true);
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, formData, leagueId, seasonId, openLogin, registrationFee]);

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-8">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            Sign in to Register
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            You need an account to register for {leagueName}.
          </p>
          <button
            onClick={openLogin}
            className="px-6 py-3 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity"
          >
            Sign In / Create Account
          </button>
        </div>
      </div>
    );
  }

  // Registration complete
  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            Registration Submitted!
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-2">
            Your registration for <strong>{seasonName}</strong> has been submitted
            and is pending approval.
          </p>
          <p className="text-[var(--color-text-muted)] text-sm mb-6">
            You will receive an email once it has been reviewed.
          </p>
          <a
            href={`/${leagueSlug}`}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity"
          >
            Back to {leagueName}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)]">
          Register for {leagueName}
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          {seasonName}
          {registrationFee > 0 && (
            <span className="ml-2">
              &middot; ${(registrationFee / 100).toFixed(2)} registration fee
            </span>
          )}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {visibleSteps.map((step, idx) => {
            const isActive = step.id === currentStep;
            const isDone =
              visibleSteps.findIndex((s) => s.id === currentStep) > idx;

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isDone
                        ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                        : isActive
                          ? 'bg-[var(--league-primary)] text-[var(--color-accent-text)]'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`mt-1 text-xs hidden sm:block ${
                      isActive
                        ? 'text-[var(--league-primary)] font-semibold'
                        : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < visibleSteps.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-2 transition-colors ${
                      isDone
                        ? 'bg-[var(--league-primary)]'
                        : 'bg-[var(--color-border)]'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="league-shell-panel rounded-3xl border border-[var(--color-border)] p-6 md:p-8">
        {currentStep === 1 && (
          <StepPersonalInfo
            formData={formData}
            teams={teams}
            onUpdate={updateFormData}
          />
        )}
        {currentStep === 2 && (
          <StepSkillPosition
            formData={formData}
            onUpdate={updateFormData}
          />
        )}
        {currentStep === 3 && (
          <StepWaiver
            formData={formData}
            waiverContent={waiverContent}
            onUpdate={updateFormData}
          />
        )}
        {currentStep === 4 && registrationFee > 0 && (
          <StepPayment
            formData={formData}
            registrationFee={registrationFee}
            leagueId={leagueId}
            seasonId={seasonId}
            leagueSlug={leagueSlug}
            onUpdate={updateFormData}
            onNext={goNext}
          />
        )}
        {currentStep === 5 && (
          <StepConfirmation
            formData={formData}
            leagueName={leagueName}
            seasonName={seasonName}
            registrationFee={registrationFee}
            teams={teams}
            canSubmit={registrationFee <= 0 || formData.payment_status === 'completed'}
          />
        )}

        {submitError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {submitError}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isFirstStep
                ? 'opacity-0 pointer-events-none'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-3">
            {isSaving && (
              <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}

            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (registrationFee > 0 && formData.payment_status !== 'completed')}
                title={registrationFee > 0 && formData.payment_status !== 'completed' ? 'Complete payment before submitting' : undefined}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Registration'
                )}
              </button>
            ) : (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--league-primary)] text-[var(--color-accent-text)] font-semibold hover:opacity-90 transition-opacity"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
