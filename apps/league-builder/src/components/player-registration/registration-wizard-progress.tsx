'use client';

import * as React from 'react';
import { Cloud, Loader2 } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';

export interface RegistrationWizardProgressProps {
  currentStep: number;
  totalSteps: number;
  isSaving?: boolean;
  leagueName?: string;
  className?: string;
}

export function RegistrationWizardProgress({
  currentStep,
  totalSteps,
  isSaving = false,
  leagueName,
  className }: RegistrationWizardProgressProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h1 className="text-xl font-semibold text-white">
          Player Registration
        </h1>
        {leagueName && (
          <p className="text-sm text-neutral-400">
            {leagueName}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Progress text */}
        <span className="hidden md:inline text-sm text-neutral-400">
          Step {currentStep} of {totalSteps}
        </span>

        {/* Auto-save indicator */}
        <div className="flex items-center gap-2 text-sm">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-rink-500" />
              <span className="text-neutral-400">Saving...</span>
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4 text-green-500" />
              <span className="hidden sm:inline text-neutral-400">Draft saved</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
