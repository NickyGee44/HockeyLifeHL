'use client';

import * as React from 'react';
import { ArrowLeft, ArrowRight, Trash2, Loader2, Send } from 'lucide-react';
import { Button } from '@hockey-life/ui';

export interface RegistrationWizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onDiscard?: () => void;
  isSubmitting?: boolean;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

export function RegistrationWizardNavigation({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onDiscard,
  isSubmitting = false,
  isFirstStep = false,
  isLastStep = false,
}: RegistrationWizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-neutral-700">
      {/* Left side: Previous button or discard */}
      <div>
        {isFirstStep && onDiscard ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onDiscard}
            disabled={isSubmitting}
            className="text-neutral-400 hover:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={isSubmitting || isFirstStep}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
        )}
      </div>

      {/* Center: Step indicator (mobile) */}
      <div className="flex md:hidden items-center text-sm text-neutral-400">
        Step {currentStep} of {totalSteps}
      </div>

      {/* Right side: Next or Submit button */}
      <div className="flex items-center gap-3">
        {isLastStep ? (
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Registration
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
