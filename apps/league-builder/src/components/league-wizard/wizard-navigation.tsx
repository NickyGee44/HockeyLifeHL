'use client';

import * as React from 'react';
import { ArrowLeft, ArrowRight, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@hockey-life/ui';

export interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onDiscard?: () => void;
  isSubmitting?: boolean;
  isFirstStep?: boolean;
  isLastStep?: boolean;
}

export function WizardNavigation({
  onPrevious,
  onNext,
  onDiscard,
  isSubmitting = false,
  isFirstStep = false,
  isLastStep = false,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t">
      {/* Left side: Previous button or discard */}
      <div>
        {isFirstStep && onDiscard ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onDiscard}
            disabled={isSubmitting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Discard Draft
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

      {/* Right side: Next or Submit button */}
      <div className="flex items-center gap-3">
        {isLastStep ? (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating League...
              </>
            ) : (
              <>Create League</>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
